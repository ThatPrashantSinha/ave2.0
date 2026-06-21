import { Task, Habit, Birthday, NotePage } from '../types';
import { getTasksFromDB, getHabitsFromDB, putTaskInDB, putHabitInDB, clearAllStoreData } from './db';

// Unicode-safe Base64 encoding/decoding to safely handle emojis, notes formatting, and custom symbols
export function compressToToken(data: any): string {
  const jsonStr = JSON.stringify(data);
  return btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
}

export function decompressFromToken(token: string): any {
  const decoded = atob(token).split('').map((c) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join('');
  const jsonStr = decodeURIComponent(decoded);
  return JSON.parse(jsonStr);
}

// Compact types for our compression schema
interface CompTask {
  i: string; // id
  t: string; // title
  d?: string; // description
  p: string; // priority
  s: string; // status
  ta?: string[]; // tags
  r: string; // recurring
  u?: {
    f: string;
    n: number;
    w?: number[];
    u?: string;
    c?: number;
  };
  o?: Record<string, string>;
  y?: string[];
  l?: string; // deadline date
  e?: string; // endTime date
}

interface CompHabit {
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

interface CompBirthday {
  i: string;
  n: string;
  d: string;
}

interface CompNote {
  i: string;
  t: string;
  c: string;
  co: string;
  u: string;
}

interface CompSession {
  i: string;
  n: string;
  d: number;
  a: string;
  c: string;
}

interface CompLog {
  i: string;
  n: string;
  dc: number;
  dt: number;
  t: string;
  a: string;
  c: boolean;
}

interface CompPin {
  i: string;
  n: string;
  sh: number;
  sm: number;
  eh: number;
  em: number;
  c: string;
}

interface MasterPayload {
  v: number; // backup data format version
  t?: CompTask[];
  h?: CompHabit[];
  b?: CompBirthday[];
  n?: CompNote[];
  s?: CompSession[];
  l?: CompLog[];
  p?: CompPin[];
}

export async function generateBackupString(): Promise<{ token: string; count: number; rawSize: number; isOptimized: boolean }> {
  // 1. Gather all data from IndexedDB
  const rawTasks = await getTasksFromDB();
  const rawHabits = await getHabitsFromDB();

  // 2. Gather all data from LocalStorage
  let rawBirthdays: Birthday[] = [];
  try {
    const s = localStorage.getItem('daily_docket_birthdays');
    if (s) rawBirthdays = JSON.parse(s);
  } catch (_) {}

  let rawNotes: NotePage[] = [];
  try {
    const s = localStorage.getItem('daily_docket_notes_pages');
    if (s) rawNotes = JSON.parse(s);
  } catch (_) {}

  let rawSessions: any[] = [];
  try {
    const s = localStorage.getItem('daily_docket_custom_sessions');
    if (s) rawSessions = JSON.parse(s);
  } catch (_) {}

  let rawLogs: any[] = [];
  try {
    const s = localStorage.getItem('daily_docket_focus_logs');
    if (s) rawLogs = JSON.parse(s);
  } catch (_) {}

  let rawPins: any[] = [];
  try {
    const s = localStorage.getItem('daily_docket_time_pins2');
    if (s) rawPins = JSON.parse(s);
  } catch (_) {}

  // 3. Compress / Map to minimized keys
  const master: MasterPayload = { v: 2 };

  if (rawTasks.length > 0) {
    master.t = rawTasks.map((x): CompTask => {
      const res: CompTask = {
        i: x.id,
        t: x.title,
        p: x.priority,
        s: x.status,
        r: x.recurring
      };
      if (x.description) res.d = x.description;
      if (x.tags && x.tags.length > 0) res.ta = x.tags;
      if (x.occurrenceStatuses && Object.keys(x.occurrenceStatuses).length > 0) res.o = x.occurrenceStatuses;
      if (x.deletedDates && x.deletedDates.length > 0) res.y = x.deletedDates;
      if (x.deadline) res.l = x.deadline instanceof Date ? x.deadline.toISOString() : x.deadline;
      if (x.endTime) res.e = x.endTime instanceof Date ? x.endTime.toISOString() : x.endTime;
      
      if (x.recurrenceRule) {
        res.u = {
          f: x.recurrenceRule.frequency,
          n: x.recurrenceRule.interval,
        };
        if (x.recurrenceRule.daysOfWeek) res.u.w = x.recurrenceRule.daysOfWeek;
        if (x.recurrenceRule.until) res.u.u = x.recurrenceRule.until;
        if (x.recurrenceRule.count) res.u.c = x.recurrenceRule.count;
      }
      return res;
    });
  }

  if (rawHabits.length > 0) {
    master.h = rawHabits.map((x): CompHabit => {
      const res: CompHabit = {
        i: x.id,
        n: x.name,
        s: x.streak,
        h: x.history
      };
      if (typeof x.hour === 'number') res.hr = x.hour;
      if (typeof x.minute === 'number') res.mn = x.minute;
      if (x.frequency) res.fq = x.frequency;
      if (x.daysOfWeek) res.dw = x.daysOfWeek;
      if (x.color) res.cl = x.color;
      if (x.icon) res.ic = x.icon;
      return res;
    });
  }

  if (rawBirthdays.length > 0) {
    master.b = rawBirthdays.map((x): CompBirthday => ({
      i: x.id,
      n: x.name,
      d: x.date
    }));
  }

  if (rawNotes.length > 0) {
    master.n = rawNotes.map((x): CompNote => ({
      i: x.id,
      t: x.title,
      c: x.content,
      co: x.color,
      u: x.updatedAt
    }));
  }

  if (rawSessions.length > 0) {
    master.s = rawSessions.map((x): CompSession => ({
      i: x.id,
      n: x.name,
      d: x.duration,
      a: x.ambient,
      c: x.code
    }));
  }

  // To guarantee we fit nicely under 20,000 characters, we can optimize (isOptimized = true)
  // by keeping only the last 60 entries of focus logs if logs are extensive.
  let targetLogs = rawLogs;
  let isOptimized = false;
  if (rawLogs.length > 60) {
    targetLogs = rawLogs.slice(-60);
    isOptimized = true;
  }

  if (targetLogs.length > 0) {
    master.l = targetLogs.map((x): CompLog => ({
      i: x.id,
      n: x.name,
      dc: x.durationCompleted,
      dt: x.durationTarget,
      t: x.timestamp,
      a: x.ambient,
      c: x.completed
    }));
  }

  if (rawPins.length > 0) {
    master.p = rawPins.map((x): CompPin => ({
      i: x.id,
      n: x.name,
      sh: x.startHour,
      sm: x.startMinute,
      eh: x.endHour,
      em: x.endMinute,
      c: x.color
    }));
  }

  const rawJson = JSON.stringify(master);
  const token = compressToToken(master);

  return {
    token,
    count: token.length,
    rawSize: rawJson.length,
    isOptimized
  };
}

export async function restoreBackupString(token: string): Promise<{ restoredCounts: Record<string, number> }> {
  const master: MasterPayload = decompressFromToken(token.trim());

  if (master.v !== 1 && master.v !== 2) {
    throw new Error('Unsupported or corrupted backup version signature');
  }

  // Clear previous IndexedDB and LocalStorage data safely
  await clearAllStoreData();

  const restoredCounts = {
    tasks: 0,
    habits: 0,
    birthdays: 0,
    notes: 0,
    sessions: 0,
    logs: 0,
    pins: 0
  };

  // Restore Tasks
  if (master.t && master.t.length > 0) {
    for (const x of master.t) {
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

  // Restore Habits
  if (master.h && master.h.length > 0) {
    for (const x of master.h) {
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

  // Restore Birthdays
  if (master.b && master.b.length > 0) {
    const list: Birthday[] = master.b.map(x => ({
      id: x.i,
      name: x.n,
      date: x.d
    }));
    localStorage.setItem('daily_docket_birthdays', JSON.stringify(list));
    restoredCounts.birthdays = list.length;
  } else {
    localStorage.removeItem('daily_docket_birthdays');
  }

  // Restore Notes
  if (master.n && master.n.length > 0) {
    const list: NotePage[] = master.n.map(x => ({
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

  // Restore Focus Sessions
  if (master.s && master.s.length > 0) {
    const list = master.s.map(x => ({
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

  // Restore Logs
  if (master.l && master.l.length > 0) {
    const list = master.l.map(x => ({
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

  // Restore Pins
  if (master.p && master.p.length > 0) {
    const list = master.p.map(x => ({
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

  return { restoredCounts };
}
