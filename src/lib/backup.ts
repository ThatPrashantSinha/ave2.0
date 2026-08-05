import LZString from 'lz-string';
import { Task, Habit, Birthday, NotePage, TimeTableEntry } from '../types';
import { 
  getTasksFromDB, 
  getHabitsFromDB, 
  putTaskInDB, 
  putHabitInDB, 
  clearAllStoreData 
} from './db';

export interface TimePin {
  id: string;
  name: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  color: string;
}

export interface FocusSession {
  id: string;
  name: string;
  duration: number;
  ambient: string;
  code: string;
}

export interface FocusLog {
  id: string;
  name: string;
  durationCompleted: number;
  durationTarget: number;
  timestamp: string;
  ambient: string;
  completed: boolean;
}

export interface AppSettings {
  activeSessionId?: string;
  ambientMuted?: boolean;
  ambientVolume?: number;
  notesBlurred?: boolean;
  birthdayFormMinimized?: boolean;
}

export interface BackupCounts {
  tasks: number;
  habits: number;
  timetable: number;
  birthdays: number;
  notes: number;
  sessions: number;
  logs: number;
  pins: number;
}

// Complete, uncompressed, high-fidelity backup package structure (v3)
export interface BackupPackage {
  _schema: 'DailyDocketBackup';
  version: number;
  timestamp: string;
  counts: BackupCounts;
  tasks: Task[];
  habits: Habit[];
  timetable: TimeTableEntry[];
  birthdays: Birthday[];
  notes: NotePage[];
  sessions: FocusSession[];
  logs: FocusLog[];
  pins: TimePin[];
  settings?: AppSettings;
}

// Legacy v1 & v2 compact payload structures for backward compatibility
interface LegacyCompTask {
  i: string;
  t: string;
  d?: string;
  p: string;
  s: string;
  ta?: string[];
  r: string;
  u?: {
    f: string;
    n: number;
    w?: number[];
    u?: string;
    c?: number;
  };
  o?: Record<string, string>;
  y?: string[];
  l?: string;
  e?: string;
}

interface LegacyCompHabit {
  i: string;
  n: string;
  s: number;
  h: Record<string, boolean>;
  hr?: number;
  mn?: number;
  fq?: string;
  dw?: number[];
  cl?: string;
  ic?: string;
}

interface LegacyCompBirthday {
  i: string;
  n: string;
  d: string;
}

interface LegacyCompNote {
  i: string;
  t: string;
  c: string;
  co: string;
  u: string;
}

interface LegacyCompSession {
  i: string;
  n: string;
  d: number;
  a: string;
  c: string;
}

interface LegacyCompLog {
  i: string;
  n: string;
  dc: number;
  dt: number;
  t: string;
  a: string;
  c: boolean;
}

interface LegacyCompPin {
  i: string;
  n: string;
  sh: number;
  sm: number;
  eh: number;
  em: number;
  c: string;
}

interface LegacyMasterPayload {
  v: number;
  t?: LegacyCompTask[];
  h?: LegacyCompHabit[];
  b?: LegacyCompBirthday[];
  n?: LegacyCompNote[];
  s?: LegacyCompSession[];
  l?: LegacyCompLog[];
  p?: LegacyCompPin[];
  tt?: any[];
}

const BACKUP_PREFIX = 'DOCKET-v3:';

/**
 * Legacy unicode-safe base64 encoding (for compatibility)
 */
export function compressToToken(data: any): string {
  const jsonStr = JSON.stringify(data);
  return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

/**
 * Legacy unicode-safe base64 decoding (for compatibility)
 */
export function decompressFromToken(token: string): any {
  const decoded = atob(token).split('').map((c) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join('');
  const jsonStr = decodeURIComponent(decoded);
  return JSON.parse(jsonStr);
}

/**
 * Gathers all application state across IndexedDB and LocalStorage with 100% fidelity.
 * NO DATA IS OMITTED OR TRUNCATED.
 */
export async function gatherFullBackupPackage(): Promise<BackupPackage> {
  // 1. Gather all tasks & habits from IndexedDB
  const rawTasks = await getTasksFromDB();
  const rawHabits = await getHabitsFromDB();

  // 2. Gather timetable entries from LocalStorage
  let rawTimetable: TimeTableEntry[] = [];
  try {
    const s = localStorage.getItem('daily_docket_timetable');
    if (s) rawTimetable = JSON.parse(s);
  } catch (_) {}

  // 3. Gather birthdays
  let rawBirthdays: Birthday[] = [];
  try {
    const s = localStorage.getItem('daily_docket_birthdays');
    if (s) rawBirthdays = JSON.parse(s);
  } catch (_) {}

  // 4. Gather notes
  let rawNotes: NotePage[] = [];
  try {
    const s = localStorage.getItem('daily_docket_notes_pages');
    if (s) rawNotes = JSON.parse(s);
  } catch (_) {}

  // 5. Gather focus custom sessions
  let rawSessions: FocusSession[] = [];
  try {
    const s = localStorage.getItem('daily_docket_custom_sessions');
    if (s) rawSessions = JSON.parse(s);
  } catch (_) {}

  // 6. Gather focus logs (FULL HISTORY, ZERO TRUNCATION)
  let rawLogs: FocusLog[] = [];
  try {
    const s = localStorage.getItem('daily_docket_focus_logs');
    if (s) rawLogs = JSON.parse(s);
  } catch (_) {}

  // 7. Gather time pins
  let rawPins: TimePin[] = [];
  try {
    const s = localStorage.getItem('daily_docket_time_pins2');
    if (s) rawPins = JSON.parse(s);
  } catch (_) {}

  // 8. Gather user settings/preferences
  const settings: AppSettings = {};
  try {
    const activeSessionId = localStorage.getItem('daily_docket_active_session_id');
    if (activeSessionId) settings.activeSessionId = activeSessionId;

    const ambientMuted = localStorage.getItem('daily_docket_ambient_muted');
    if (ambientMuted !== null) settings.ambientMuted = ambientMuted === 'true';

    const ambientVol = localStorage.getItem('daily_docket_ambient_volume');
    if (ambientVol !== null) settings.ambientVolume = parseFloat(ambientVol);

    const notesBlurred = localStorage.getItem('daily_docket_notes_blurred');
    if (notesBlurred !== null) settings.notesBlurred = notesBlurred === 'true';

    const bdayMinimized = localStorage.getItem('daily_docket_birthday_form_minimized');
    if (bdayMinimized !== null) settings.birthdayFormMinimized = bdayMinimized === 'true';
  } catch (_) {}

  // Clean and serialize tasks (dates to ISO strings for lossless transport)
  const serializedTasks: Task[] = rawTasks.map(t => ({
    ...t,
    deadline: t.deadline instanceof Date ? (t.deadline.toISOString() as any) : t.deadline,
    endTime: t.endTime instanceof Date ? (t.endTime.toISOString() as any) : t.endTime,
  }));

  const counts: BackupCounts = {
    tasks: serializedTasks.length,
    habits: rawHabits.length,
    timetable: rawTimetable.length,
    birthdays: rawBirthdays.length,
    notes: rawNotes.length,
    sessions: rawSessions.length,
    logs: rawLogs.length,
    pins: rawPins.length
  };

  return {
    _schema: 'DailyDocketBackup',
    version: 3,
    timestamp: new Date().toISOString(),
    counts,
    tasks: serializedTasks,
    habits: rawHabits,
    timetable: rawTimetable,
    birthdays: rawBirthdays,
    notes: rawNotes,
    sessions: rawSessions,
    logs: rawLogs,
    pins: rawPins,
    settings
  };
}

/**
 * Generates an ultra-compressed, robust, copy-ready backup string with zero data loss.
 */
export async function generateBackupString(): Promise<{
  token: string;
  count: number;
  rawSize: number;
  counts: BackupCounts;
  timestamp: string;
}> {
  const pkg = await gatherFullBackupPackage();
  const rawJson = JSON.stringify(pkg);
  
  // High-performance LZ-String base64 compression
  const compressed = LZString.compressToBase64(rawJson);
  const token = `${BACKUP_PREFIX}${compressed}`;

  return {
    token,
    count: token.length,
    rawSize: rawJson.length,
    counts: pkg.counts,
    timestamp: pkg.timestamp
  };
}

/**
 * Generates raw JSON string of full backup for file download.
 */
export async function generateBackupJson(): Promise<string> {
  const pkg = await gatherFullBackupPackage();
  return JSON.stringify(pkg, null, 2);
}

export interface BackupInspectionResult {
  isValid: boolean;
  version: number;
  createdAt?: string;
  counts: BackupCounts;
  totalEntities: number;
  errorMessage?: string;
  sourceType: 'v3_compressed' | 'legacy_token' | 'raw_json' | 'unknown';
}

/**
 * Parses and validates any backup token/string without applying it to stores.
 * Handles LZ-compressed v3, legacy v1/v2 base64 tokens, and raw JSON strings.
 */
export function inspectBackupString(inputString: string): BackupInspectionResult {
  const emptyCounts: BackupCounts = {
    tasks: 0,
    habits: 0,
    timetable: 0,
    birthdays: 0,
    notes: 0,
    sessions: 0,
    logs: 0,
    pins: 0
  };

  if (!inputString || !inputString.trim()) {
    return {
      isValid: false,
      version: 0,
      counts: emptyCounts,
      totalEntities: 0,
      errorMessage: 'Empty backup string provided',
      sourceType: 'unknown'
    };
  }

  // Clean input from common copy/paste artefacts (markdown fences, wrapping quotes, trailing spaces)
  let clean = inputString.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }

  // 1. Try DOCKET-v3 prefix LZ-String decompression
  if (clean.startsWith(BACKUP_PREFIX)) {
    const rawCompressed = clean.slice(BACKUP_PREFIX.length);
    try {
      const decompressed = LZString.decompressFromBase64(rawCompressed);
      if (decompressed) {
        const pkg: BackupPackage = JSON.parse(decompressed);
        if (pkg.tasks || pkg.habits || pkg.timetable || pkg.notes || pkg.birthdays || pkg.logs) {
          const counts: BackupCounts = {
            tasks: pkg.tasks?.length || 0,
            habits: pkg.habits?.length || 0,
            timetable: pkg.timetable?.length || 0,
            birthdays: pkg.birthdays?.length || 0,
            notes: pkg.notes?.length || 0,
            sessions: pkg.sessions?.length || 0,
            logs: pkg.logs?.length || 0,
            pins: pkg.pins?.length || 0
          };
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          return {
            isValid: true,
            version: pkg.version || 3,
            createdAt: pkg.timestamp,
            counts,
            totalEntities: total,
            sourceType: 'v3_compressed'
          };
        }
      }
    } catch (_) {}
  }

  // 2. Try raw LZ-String decompression (without prefix)
  try {
    const decompressed = LZString.decompressFromBase64(clean);
    if (decompressed && decompressed.startsWith('{')) {
      const pkg = JSON.parse(decompressed);
      if (pkg._schema === 'DailyDocketBackup' || pkg.tasks || pkg.habits) {
        const counts: BackupCounts = {
          tasks: pkg.tasks?.length || 0,
          habits: pkg.habits?.length || 0,
          timetable: pkg.timetable?.length || 0,
          birthdays: pkg.birthdays?.length || 0,
          notes: pkg.notes?.length || 0,
          sessions: pkg.sessions?.length || 0,
          logs: pkg.logs?.length || 0,
          pins: pkg.pins?.length || 0
        };
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return {
          isValid: true,
          version: pkg.version || 3,
          createdAt: pkg.timestamp,
          counts,
          totalEntities: total,
          sourceType: 'v3_compressed'
        };
      }
    }
  } catch (_) {}

  // 3. Try parsing as Direct JSON string
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      // Case A: v3 BackupPackage JSON
      if (parsed.tasks || parsed.habits || parsed.timetable || parsed.notes || parsed._schema === 'DailyDocketBackup') {
        const counts: BackupCounts = {
          tasks: parsed.tasks?.length || 0,
          habits: parsed.habits?.length || 0,
          timetable: parsed.timetable?.length || 0,
          birthdays: parsed.birthdays?.length || 0,
          notes: parsed.notes?.length || 0,
          sessions: parsed.sessions?.length || 0,
          logs: parsed.logs?.length || 0,
          pins: parsed.pins?.length || 0
        };
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return {
          isValid: true,
          version: parsed.version || 3,
          createdAt: parsed.timestamp,
          counts,
          totalEntities: total,
          sourceType: 'raw_json'
        };
      }
      // Case B: Legacy MasterPayload in JSON
      if (parsed.v === 1 || parsed.v === 2 || parsed.t || parsed.h) {
        const counts: BackupCounts = {
          tasks: parsed.t?.length || 0,
          habits: parsed.h?.length || 0,
          timetable: parsed.tt?.length || 0,
          birthdays: parsed.b?.length || 0,
          notes: parsed.n?.length || 0,
          sessions: parsed.s?.length || 0,
          logs: parsed.l?.length || 0,
          pins: parsed.p?.length || 0
        };
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return {
          isValid: true,
          version: parsed.v || 2,
          counts,
          totalEntities: total,
          sourceType: 'raw_json'
        };
      }
    } catch (_) {}
  }

  // 4. Try Legacy Unicode-safe Base64 token decompress
  try {
    const legacyParsed: LegacyMasterPayload = decompressFromToken(clean);
    if (legacyParsed && (legacyParsed.v === 1 || legacyParsed.v === 2 || legacyParsed.t || legacyParsed.h)) {
      const counts: BackupCounts = {
        tasks: legacyParsed.t?.length || 0,
        habits: legacyParsed.h?.length || 0,
        timetable: legacyParsed.tt?.length || 0,
        birthdays: legacyParsed.b?.length || 0,
        notes: legacyParsed.n?.length || 0,
        sessions: legacyParsed.s?.length || 0,
        logs: legacyParsed.l?.length || 0,
        pins: legacyParsed.p?.length || 0
      };
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return {
        isValid: true,
        version: legacyParsed.v || 2,
        counts,
        totalEntities: total,
        sourceType: 'legacy_token'
      };
    }
  } catch (_) {}

  return {
    isValid: false,
    version: 0,
    counts: emptyCounts,
    totalEntities: 0,
    errorMessage: 'Unrecognized backup string format or corrupted data payload',
    sourceType: 'unknown'
  };
}

/**
 * Restores a full backup from any supported token format (v3 compressed, legacy token, or raw JSON).
 * Completely clears previous data and restores everything with 100% fidelity.
 */
export async function restoreBackupString(token: string): Promise<{ restoredCounts: BackupCounts }> {
  let clean = token.trim();
  clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }

  let packageData: BackupPackage | null = null;
  let legacyData: LegacyMasterPayload | null = null;

  // Attempt 1: DOCKET-v3 prefix
  if (clean.startsWith(BACKUP_PREFIX)) {
    const rawCompressed = clean.slice(BACKUP_PREFIX.length);
    try {
      const decompressed = LZString.decompressFromBase64(rawCompressed);
      if (decompressed) {
        packageData = JSON.parse(decompressed);
      }
    } catch (_) {}
  }

  // Attempt 2: Raw LZ-String base64
  if (!packageData) {
    try {
      const decompressed = LZString.decompressFromBase64(clean);
      if (decompressed && decompressed.startsWith('{')) {
        const parsed = JSON.parse(decompressed);
        if (parsed.tasks || parsed.habits || parsed._schema) {
          packageData = parsed;
        } else if (parsed.t || parsed.h || parsed.v) {
          legacyData = parsed;
        }
      }
    } catch (_) {}
  }

  // Attempt 3: Direct JSON string
  if (!packageData && !legacyData && clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed.tasks || parsed.habits || parsed._schema) {
        packageData = parsed;
      } else if (parsed.t || parsed.h || parsed.v) {
        legacyData = parsed;
      }
    } catch (_) {}
  }

  // Attempt 4: Legacy token decompression
  if (!packageData && !legacyData) {
    try {
      legacyData = decompressFromToken(clean);
    } catch (_) {}
  }

  if (!packageData && !legacyData) {
    throw new Error('Unsupported, damaged, or corrupted backup key signature.');
  }

  // Clear previous IndexedDB and LocalStorage stores
  await clearAllStoreData();

  const restoredCounts: BackupCounts = {
    tasks: 0,
    habits: 0,
    timetable: 0,
    birthdays: 0,
    notes: 0,
    sessions: 0,
    logs: 0,
    pins: 0
  };

  // --- RESTORATION PATH A: Modern v3 Package (Full Fidelity) ---
  if (packageData) {
    // 1. Tasks
    if (packageData.tasks && Array.isArray(packageData.tasks)) {
      for (const t of packageData.tasks) {
        const task: Task = {
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          tags: t.tags || [],
          recurring: t.recurring || 'none',
          recurrenceRule: t.recurrenceRule,
          occurrenceStatuses: t.occurrenceStatuses || {},
          deletedDates: t.deletedDates || [],
          deadline: t.deadline ? new Date(t.deadline) : undefined,
          endTime: t.endTime ? new Date(t.endTime) : undefined
        };
        await putTaskInDB(task);
        restoredCounts.tasks++;
      }
    }

    // 2. Habits
    if (packageData.habits && Array.isArray(packageData.habits)) {
      for (const h of packageData.habits) {
        const habit: Habit = {
          id: h.id,
          name: h.name,
          streak: h.streak || 0,
          history: h.history || {},
          hour: h.hour,
          minute: h.minute,
          frequency: h.frequency,
          daysOfWeek: h.daysOfWeek,
          color: h.color,
          icon: h.icon
        };
        await putHabitInDB(habit);
        restoredCounts.habits++;
      }
    }

    // 3. Timetable
    if (packageData.timetable && Array.isArray(packageData.timetable)) {
      localStorage.setItem('daily_docket_timetable', JSON.stringify(packageData.timetable));
      restoredCounts.timetable = packageData.timetable.length;
    } else {
      localStorage.removeItem('daily_docket_timetable');
    }

    // 4. Birthdays
    if (packageData.birthdays && Array.isArray(packageData.birthdays)) {
      localStorage.setItem('daily_docket_birthdays', JSON.stringify(packageData.birthdays));
      restoredCounts.birthdays = packageData.birthdays.length;
    } else {
      localStorage.removeItem('daily_docket_birthdays');
    }

    // 5. Notes
    if (packageData.notes && Array.isArray(packageData.notes)) {
      localStorage.setItem('daily_docket_notes_pages', JSON.stringify(packageData.notes));
      restoredCounts.notes = packageData.notes.length;
    } else {
      localStorage.removeItem('daily_docket_notes_pages');
    }

    // 6. Custom Sessions
    if (packageData.sessions && Array.isArray(packageData.sessions)) {
      localStorage.setItem('daily_docket_custom_sessions', JSON.stringify(packageData.sessions));
      restoredCounts.sessions = packageData.sessions.length;
    } else {
      localStorage.removeItem('daily_docket_custom_sessions');
    }

    // 7. Focus Logs (Full history without any dropping)
    if (packageData.logs && Array.isArray(packageData.logs)) {
      localStorage.setItem('daily_docket_focus_logs', JSON.stringify(packageData.logs));
      restoredCounts.logs = packageData.logs.length;
    } else {
      localStorage.removeItem('daily_docket_focus_logs');
    }

    // 8. Time Pins
    if (packageData.pins && Array.isArray(packageData.pins)) {
      localStorage.setItem('daily_docket_time_pins2', JSON.stringify(packageData.pins));
      restoredCounts.pins = packageData.pins.length;
    } else {
      localStorage.removeItem('daily_docket_time_pins2');
    }

    // 9. Settings
    if (packageData.settings) {
      if (packageData.settings.activeSessionId) {
        localStorage.setItem('daily_docket_active_session_id', packageData.settings.activeSessionId);
      }
      if (packageData.settings.ambientMuted !== undefined) {
        localStorage.setItem('daily_docket_ambient_muted', String(packageData.settings.ambientMuted));
      }
      if (packageData.settings.ambientVolume !== undefined) {
        localStorage.setItem('daily_docket_ambient_volume', String(packageData.settings.ambientVolume));
      }
      if (packageData.settings.notesBlurred !== undefined) {
        localStorage.setItem('daily_docket_notes_blurred', String(packageData.settings.notesBlurred));
      }
      if (packageData.settings.birthdayFormMinimized !== undefined) {
        localStorage.setItem('daily_docket_birthday_form_minimized', String(packageData.settings.birthdayFormMinimized));
      }
    }

    return { restoredCounts };
  }

  // --- RESTORATION PATH B: Legacy v1/v2 Payload (Backward Compatibility) ---
  if (legacyData) {
    if (legacyData.t && legacyData.t.length > 0) {
      for (const x of legacyData.t) {
        const task: Task = {
          id: x.i,
          title: x.t,
          priority: x.p as any,
          status: x.s as any,
          recurring: x.r as any
        };
        if (x.d) task.description = x.d;
        if (x.ta) task.tags = x.ta;
        if (x.o) task.occurrenceStatuses = x.o as any;
        if (x.y) task.deletedDates = x.y;
        if (x.l) task.deadline = new Date(x.l);
        if (x.e) task.endTime = new Date(x.e);

        if (x.u) {
          task.recurrenceRule = {
            frequency: x.u.f as any,
            interval: x.u.n,
            daysOfWeek: x.u.w,
            until: x.u.u,
            count: x.u.c
          };
        }
        await putTaskInDB(task);
        restoredCounts.tasks++;
      }
    }

    if (legacyData.h && legacyData.h.length > 0) {
      for (const x of legacyData.h) {
        const habit: Habit = {
          id: x.i,
          name: x.n,
          streak: x.s,
          history: x.h
        };
        if (typeof x.hr === 'number') habit.hour = x.hr;
        if (typeof x.mn === 'number') habit.minute = x.mn;
        if (x.fq) habit.frequency = x.fq as any;
        if (x.dw) habit.daysOfWeek = x.dw;
        if (x.cl) habit.color = x.cl;
        if (x.ic) habit.icon = x.ic;

        await putHabitInDB(habit);
        restoredCounts.habits++;
      }
    }

    if (legacyData.b && legacyData.b.length > 0) {
      const list: Birthday[] = legacyData.b.map(x => ({
        id: x.i,
        name: x.n,
        date: x.d
      }));
      localStorage.setItem('daily_docket_birthdays', JSON.stringify(list));
      restoredCounts.birthdays = list.length;
    } else {
      localStorage.removeItem('daily_docket_birthdays');
    }

    if (legacyData.n && legacyData.n.length > 0) {
      const list: NotePage[] = legacyData.n.map(x => ({
        id: x.i,
        title: x.t,
        content: x.c,
        color: x.co,
        updatedAt: x.u
      }));
      localStorage.setItem('daily_docket_notes_pages', JSON.stringify(list));
      restoredCounts.notes = list.length;
    } else {
      localStorage.removeItem('daily_docket_notes_pages');
    }

    if (legacyData.s && legacyData.s.length > 0) {
      const list = legacyData.s.map(x => ({
        id: x.i,
        name: x.n,
        duration: x.d,
        ambient: x.a,
        code: x.c
      }));
      localStorage.setItem('daily_docket_custom_sessions', JSON.stringify(list));
      restoredCounts.sessions = list.length;
    } else {
      localStorage.removeItem('daily_docket_custom_sessions');
    }

    if (legacyData.l && legacyData.l.length > 0) {
      const list = legacyData.l.map(x => ({
        id: x.i,
        name: x.n,
        durationCompleted: x.dc,
        durationTarget: x.dt,
        timestamp: x.t,
        ambient: x.a,
        completed: x.c
      }));
      localStorage.setItem('daily_docket_focus_logs', JSON.stringify(list));
      restoredCounts.logs = list.length;
    } else {
      localStorage.removeItem('daily_docket_focus_logs');
    }

    if (legacyData.p && legacyData.p.length > 0) {
      const list = legacyData.p.map(x => ({
        id: x.i,
        name: x.n,
        startHour: x.sh,
        startMinute: x.sm,
        endHour: x.eh,
        endMinute: x.em,
        color: x.c
      }));
      localStorage.setItem('daily_docket_time_pins2', JSON.stringify(list));
      restoredCounts.pins = list.length;
    } else {
      localStorage.removeItem('daily_docket_time_pins2');
    }

    if (legacyData.tt && legacyData.tt.length > 0) {
      localStorage.setItem('daily_docket_timetable', JSON.stringify(legacyData.tt));
      restoredCounts.timetable = legacyData.tt.length;
    }
  }

  return { restoredCounts };
}
