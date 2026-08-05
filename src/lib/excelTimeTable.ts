import * as XLSX from 'xlsx';
import { TimeTableEntry, ClassType } from '../types';
import { TIMETABLE_COLORS } from '../components/TimeTableModal';

// Day mapping helper
const DAY_NAME_TO_ID: Record<string, number> = {
  sunday: 0,
  sun: 0,
  su: 0,
  '0': 0,
  monday: 1,
  mon: 1,
  mo: 1,
  m: 1,
  '1': 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  tu: 2,
  t: 2,
  '2': 2,
  wednesday: 3,
  wed: 3,
  w: 3,
  '3': 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  th: 4,
  '4': 4,
  friday: 5,
  fri: 5,
  fr: 5,
  f: 5,
  '5': 5,
  saturday: 6,
  sat: 6,
  sa: 6,
  s: 6,
  '6': 6,
  '7': 0, // Sunday as 7 in ISO
};

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const DAY_SHORTS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Parses time values from strings, numbers (Excel fraction of day), or Date objects into "HH:mm" (24h)
 */
export function parseTimeToHHMM(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;

  // If already Date object
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const h = String(raw.getHours()).padStart(2, '0');
    const m = String(raw.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  // If number from Excel (e.g. 0.375 = 9:00 AM, or 930 for 9:30)
  if (typeof raw === 'number') {
    if (raw > 0 && raw < 1) {
      const totalMinutes = Math.round(raw * 24 * 60);
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    if (raw >= 1 && raw <= 24) {
      const h = Math.floor(raw) % 24;
      const m = Math.round((raw - Math.floor(raw)) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    if (raw >= 100 && raw <= 2400) {
      // 930 -> 09:30, 1430 -> 14:30
      const h = Math.floor(raw / 100) % 24;
      const m = raw % 100;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  const str = String(raw).trim();
  if (!str) return null;

  // Check 12-hour AM/PM pattern like "9:00 AM", "09:30pm", "1:30 PM", "9.30am", "9:00:00 AM"
  const ampmMatch = str.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const isPM = ampmMatch[3].toLowerCase() === 'pm';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // Check simple AM/PM like "9 AM", "2pm"
  const ampmSimple = str.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (ampmSimple) {
    let hours = parseInt(ampmSimple[1], 10);
    const isPM = ampmSimple[2].toLowerCase() === 'pm';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:00`;
  }

  // Check 24-hour pattern "09:00", "9:00", "09:00:00", "9:00:00", "09.30", "14:50"
  const hhmmMatch = str.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?$/);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10) % 24;
    const minutes = parseInt(hhmmMatch[2], 10) % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // Check integer hour "9", "14"
  if (/^\d{1,2}$/.test(str)) {
    const hours = parseInt(str, 10);
    if (hours >= 0 && hours <= 23) {
      return `${String(hours).padStart(2, '0')}:00`;
    }
  }

  return null;
}

/**
 * Parses time range like "09:00 To 10:50", "11:00 To 11:50", "09:00 - 10:30", "9:00 AM to 10:30 AM", "09:00-10:30"
 */
export function parseTimeRange(raw: unknown): { start: string; end: string } | null {
  if (!raw) return null;
  const str = String(raw).trim();
  
  // Split on delimiter like " To ", " to ", " TO ", " - ", "-", " – ", " — ", " ~ ", "/"
  const parts = str.split(/\s*(?:-|–|—|~|\/|\bto\b)\s*/i);
  if (parts.length === 2) {
    const start = parseTimeToHHMM(parts[0]);
    const end = parseTimeToHHMM(parts[1]);
    if (start && end) {
      return { start, end };
    }
  }
  return null;
}

/**
 * Parses Day from string or number. Supports comma-separated list like "Mon, Wed, Fri" or "Monday"
 */
export function parseDays(raw: unknown): number[] {
  if (raw === undefined || raw === null) return [];
  const str = String(raw).trim().toLowerCase();
  if (!str) return [];

  // If numeric direct match
  if (typeof raw === 'number' && raw >= 0 && raw <= 7) {
    return [raw === 7 ? 0 : raw];
  }

  // If multiple days separated by comma, slash, ampersand, space
  const tokens = str.split(/[,/&+\s]+/).map(t => t.trim()).filter(Boolean);
  const result = new Set<number>();

  for (const token of tokens) {
    const cleanToken = token.replace(/[^a-z0-9]/g, '');
    if (cleanToken in DAY_NAME_TO_ID) {
      result.add(DAY_NAME_TO_ID[cleanToken]);
    }
  }

  if (result.size > 0) {
    return Array.from(result);
  }

  // Check if whole string matches
  const fullClean = str.replace(/[^a-z0-9]/g, '');
  if (fullClean in DAY_NAME_TO_ID) {
    return [DAY_NAME_TO_ID[fullClean]];
  }

  return [];
}

/**
 * Maps component string (e.g. "Practical-1", "Lecture-1", "Tutorial-1") to ClassType
 */
export function mapComponentToClassType(componentRaw?: string, subjectRaw?: string, venueRaw?: string): ClassType {
  const comp = String(componentRaw || '').toLowerCase();
  const subj = String(subjectRaw || '').toLowerCase();
  const ven = String(venueRaw || '').toLowerCase();

  if (comp.includes('practical') || comp.includes('lab') || comp.includes('p-') || comp.includes('hands-on') || comp.includes('computerlab')) {
    return 'Lab';
  }
  if (comp.includes('tutorial') || comp.includes('tut') || comp.includes('t-')) {
    return 'Tutorial';
  }
  if (comp.includes('seminar') || comp.includes('symposium')) {
    return 'Seminar';
  }
  if (comp.includes('workshop') || comp.includes('studio')) {
    return 'Workshop';
  }
  if (comp.includes('lecture') || comp.includes('theory') || comp.includes('l-')) {
    return 'Lecture';
  }

  // Fallbacks based on subject or venue clues
  if (subj.includes('lab') || subj.includes('practical') || ven.includes('lab') || ven.includes('computerlab')) {
    return 'Lab';
  }
  if (subj.includes('tutorial') || subj.includes('tut')) {
    return 'Tutorial';
  }
  if (subj.includes('seminar')) {
    return 'Seminar';
  }
  if (subj.includes('workshop')) {
    return 'Workshop';
  }

  return 'Lecture';
}

/**
 * Assigns deterministic color based on subject name string
 */
export function getColorForSubject(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TIMETABLE_COLORS.length;
  return TIMETABLE_COLORS[index].hex;
}

/**
 * Identifies normalized column names in an Excel sheet row
 */
export function normalizeHeader(h: unknown): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Detects if a cell contains venue clues like "(Room 101)" or "Room: 402"
 */
function extractVenueAndNotes(text: string): {
  subject: string;
  venue?: string;
  instructor?: string;
  notes?: string;
  code?: string;
} {
  let subject = text.trim();
  let venue: string | undefined;
  let instructor: string | undefined;
  let notes: string | undefined;
  let code: string | undefined;

  // Split by newlines if multi-line cell
  const lines = subject.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    subject = lines[0];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(room|hall|lab|venue|loc|auditorium|block|complex)\b/i.test(line) || /^[A-Z0-9-]+\s*(lab|hall|room)/i.test(line)) {
        venue = line.replace(/^(venue|room|location|hall):\s*/i, '').trim();
      } else if (/^(prof|dr|mr|mrs|ms|instructor|faculty|teacher)\b/i.test(line)) {
        instructor = line.replace(/^(instructor|faculty|teacher|prof):\s*/i, '').trim();
      } else if (/^[A-Z]{2,5}[-\s]?\d{3}[A-Z]?$/i.test(line)) {
        code = line;
      } else {
        notes = notes ? `${notes} | ${line}` : line;
      }
    }
  }

  // Check parenthetical venue like "Data Structures (Room 304)"
  const parenMatch = subject.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    subject = parenMatch[1].trim();
    const inside = parenMatch[2].trim();
    if (/^(room|hall|lab|venue|auditorium|wing|complex|[a-z0-9-]+ lab|[a-z0-9-]+ hall)/i.test(inside)) {
      venue = inside;
    } else if (/^(prof|dr|mr|mrs|ms)\b/i.test(inside)) {
      instructor = inside;
    } else if (/^[A-Z]{2,5}[-\s]?\d{3}[A-Z]?$/i.test(inside)) {
      code = inside;
    } else if (!venue) {
      venue = inside;
    }
  }

  // Check " - " separator like "Algorithms - Hall 2 - Dr. Turing"
  const dashParts = subject.split(/\s+-\s+/);
  if (dashParts.length >= 2) {
    subject = dashParts[0].trim();
    const p2 = dashParts[1].trim();
    if (!venue && (/room|hall|lab|complex|wing|auditorium/i.test(p2) || /^\d+[a-z]?$/i.test(p2))) {
      venue = p2;
    }
    if (dashParts.length >= 3 && !instructor) {
      instructor = dashParts[2].trim();
    }
  }

  return {
    subject: subject || 'Class Session',
    venue: venue || 'Classroom / TBA',
    instructor,
    notes,
    code,
  };
}

export interface ParseResult {
  entries: TimeTableEntry[];
  totalParsed: number;
  uniqueSubjects: number;
  daysCovered: number;
  warnings: string[];
  mode: 'list' | 'matrix';
  sheetName: string;
  detectedColumns?: string[];
}

/**
 * Main parser function: Converts an ArrayBuffer of an Excel file into TimeTableEntry[]
 * Specifically tailored for University ERP exports (like TT301-AIMLR-E formats) as well as general timetables!
 */
export function parseExcelToTimetable(data: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('The selected worksheet is empty.');
  }

  const warnings: string[] = [];
  const entries: TimeTableEntry[] = [];

  // Step 1: Detect header row
  let headerRowIndex = -1;
  let colMap: Record<string, number> = {};
  let originalHeaders: string[] = [];

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r].map(normalizeHeader);
    const hasCourseTitle = row.some(h => /^(coursetitle|subject|course|paper|module|title)$/.test(h) || h.includes('coursetitle') || h.includes('subjectname'));
    const hasDay = row.some(h => /^(day|dayofweek|weekday|days|dayname)$/.test(h));
    const hasTime = row.some(h => /^(starttime|time|start|slot|timing|hours|interval)$/.test(h));
    const hasTTCode = row.some(h => /^(timatablecode|timetablecode|ttcode)$/.test(h) || h.includes('timatable') || h.includes('timetable'));

    if (hasCourseTitle || (hasDay && hasTime) || (hasTTCode && hasDay)) {
      headerRowIndex = r;
      originalHeaders = rawRows[r].map(c => String(c || '').trim()).filter(Boolean);
      rawRows[r].forEach((val, idx) => {
        const norm = normalizeHeader(val);
        if (norm) colMap[norm] = idx;
      });
      break;
    }
  }

  // If a list format header was detected:
  if (headerRowIndex !== -1) {
    const getCol = (patterns: RegExp[]): number => {
      // 1. Direct exact or pattern match
      for (const [norm, idx] of Object.entries(colMap)) {
        if (patterns.some(p => p.test(norm))) return idx;
      }
      // 2. Substring match
      for (const [norm, idx] of Object.entries(colMap)) {
        for (const p of patterns) {
          const source = p.source.replace(/[\^\$\(\)]/g, '').split('|');
          for (const key of source) {
            if (norm.includes(key) && key.length >= 4) return idx;
          }
        }
      }
      return -1;
    };

    // Columns matching user's exact university ERP export columns:
    // 1. "Course Title"
    const subjectCol = getCol([
      /^(coursetitle|subject|course|class|paper|module|topic|title|name|subjectname|coursename|subjecttitle)$/,
    ]);

    // 2. "Course Code"
    const codeCol = getCol([
      /^(coursecode|subjectcode|code|courseno|subjectno|papercode|id|modulecode)$/,
    ]);

    // 3. "Tima Table Code" / "Time Table Code" (note typo "Tima Table Code")
    const ttCodeCol = getCol([
      /^(timatablecode|timetablecode|timetablename|ttcode|tablecode|sectioncode|batchcode)$/,
    ]);

    // 4. "Course Bucket"
    const bucketCol = getCol([
      /^(coursebucket|bucket|category|coursetype|electivecategory|coursecategory|offeringtype)$/,
    ]);

    // 5. "Credit"
    const creditCol = getCol([
      /^(credit|credits|cr|creditpoints|units)$/,
    ]);

    // 6. "Component" (e.g. Practical-1, Lecture-1, Tutorial-1)
    const componentCol = getCol([
      /^(component|componenttype|type|classtype|session|sessiontype|format|lecturepractical)$/,
    ]);

    // 7. "Day"
    const dayCol = getCol([
      /^(day|dayofweek|weekday|days|dayname|scheduleday)$/,
    ]);

    // 8. "Time" (e.g. "09:00 To 10:50")
    const timeRangeCol = getCol([
      /^(time|slot|timing|hours|interval|timerange|classtime|timeslot|period)$/,
    ]);
    const startCol = getCol([
      /^(starttime|start|from|begintime|starts|starttiming)$/,
    ]);
    const endCol = getCol([
      /^(endtime|end|to|finishtime|ends|endtiming)$/,
    ]);

    // 9. "Resource Name" (Venue/Classroom/Lab location)
    const venueCol = getCol([
      /^(resourcename|resource|venue|room|classroom|hall|location|lab|roomno|place|building|campus|block|labname|auditorium|resourcelocation)$/,
    ]);

    // 10. "Couse instructore" (note the spelling typos in ERP: "Couse instructore")
    const instructorCol = getCol([
      /^(couseinstructore|courseinstructor|couseinstructor|courseinstructore|instructor|teacher|faculty|professor|prof|lecturer|mentor|staff|facultyperson|teachername)$/,
    ]);

    // 11. "Course Coordinator"
    const coordinatorCol = getCol([
      /^(coursecoordinator|coordinator|courseincharge|incharge|leadfaculty|hod)$/,
    ]);

    // 12. "Course Offering Dept/School/College"
    const departmentCol = getCol([
      /^(courseofferingdeptschoolcollege|courseofferingdepartment|courseofferingdept|offeringdept|department|dept|school|college|facultyof)$/,
    ]);

    const notesCol = getCol([
      /^(notes|description|remarks|comment|info|details|instructions)$/,
    ]);

    const colorCol = getCol([
      /^(color|colour|hex|accent)$/,
    ]);

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawSubject = subjectCol !== -1 ? String(row[subjectCol] || '').trim() : '';
      if (!rawSubject || rawSubject === '-' || rawSubject === 'N/A') continue;

      // Extract day
      const rawDay = dayCol !== -1 ? row[dayCol] : 'Monday';
      const days = parseDays(rawDay);
      const targetDays = days.length > 0 ? days : [1]; // default Monday

      // Extract times
      let startTime = '09:00';
      let endTime = '10:30';

      if (startCol !== -1 && row[startCol]) {
        const parsedStart = parseTimeToHHMM(row[startCol]);
        if (parsedStart) startTime = parsedStart;
      }

      if (endCol !== -1 && row[endCol]) {
        const parsedEnd = parseTimeToHHMM(row[endCol]);
        if (parsedEnd) endTime = parsedEnd;
      }

      // If separate start/end not found or timeRangeCol exists (e.g. "09:00 To 10:50")
      if (timeRangeCol !== -1 && row[timeRangeCol]) {
        const range = parseTimeRange(row[timeRangeCol]);
        if (range) {
          startTime = range.start;
          endTime = range.end;
        } else {
          const single = parseTimeToHHMM(row[timeRangeCol]);
          if (single) {
            startTime = single;
            const [h, m] = single.split(':').map(Number);
            const endH = (h + 1) % 24;
            endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          }
        }
      }

      // If endTime is earlier or equal to startTime, adjust +1 hr
      if (endTime <= startTime) {
        const [sh, sm] = startTime.split(':').map(Number);
        const nextH = (sh + 1) % 24;
        endTime = `${String(nextH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
      }

      // Venue / Resource Name (e.g. "Block - VEDANTA - VED5F 510 ComputerLab 5")
      const venue = venueCol !== -1 && row[venueCol] ? String(row[venueCol]).trim() : 'Classroom / TBA';
      
      // Course Code (e.g. "CSN344")
      const code = codeCol !== -1 && row[codeCol] ? String(row[codeCol]).trim() : undefined;
      
      // Instructor (e.g. "Vaidhai Choudhary")
      let instructor: string | undefined = instructorCol !== -1 && row[instructorCol] ? String(row[instructorCol]).trim() : undefined;
      if (instructor && (instructor.toLowerCase() === 'no faculty' || instructor.toLowerCase() === 'n/a' || instructor === '-')) {
        instructor = undefined;
      }

      // Timetable Code (e.g. "TT301-AIMLR-E")
      const timeTableCode = ttCodeCol !== -1 && row[ttCodeCol] ? String(row[ttCodeCol]).trim() : undefined;

      // Course Bucket (e.g. "Discipline Elective", "Discipline Core", "Free Elective")
      const bucket = bucketCol !== -1 && row[bucketCol] ? String(row[bucketCol]).trim() : undefined;

      // Credits (e.g. 3, 4)
      const rawCredit = creditCol !== -1 && row[creditCol] !== undefined && row[creditCol] !== '' ? row[creditCol] : undefined;
      const credits = rawCredit !== undefined ? (typeof rawCredit === 'number' ? rawCredit : String(rawCredit).trim()) : undefined;

      // Component (e.g. "Practical-1", "Lecture-1", "Tutorial-1")
      const rawComponent = componentCol !== -1 && row[componentCol] ? String(row[componentCol]).trim() : undefined;

      // Course Coordinator (e.g. "Shilpi Saxena", "No Faculty")
      let coordinator: string | undefined = coordinatorCol !== -1 && row[coordinatorCol] ? String(row[coordinatorCol]).trim() : undefined;
      if (coordinator && (coordinator.toLowerCase() === 'no faculty' || coordinator.toLowerCase() === 'n/a' || coordinator === '-')) {
        coordinator = undefined;
      }

      // Course Offering Dept / School / College (e.g. "School of Computing")
      const department = departmentCol !== -1 && row[departmentCol] ? String(row[departmentCol]).trim() : undefined;

      // Class Type mapping
      const classType: ClassType = mapComponentToClassType(rawComponent, rawSubject, venue);

      // Notes & extra details
      let notes: string | undefined = notesCol !== -1 && row[notesCol] ? String(row[notesCol]).trim() : undefined;
      
      // If no notes provided, format clean academic meta info
      if (!notes) {
        const metaParts: string[] = [];
        if (bucket) metaParts.push(bucket);
        if (credits) metaParts.push(`${credits} Credits`);
        if (department) metaParts.push(department);
        if (coordinator) metaParts.push(`Coordinator: ${coordinator}`);
        if (metaParts.length > 0) {
          notes = metaParts.join(' • ');
        }
      }

      // Color
      let color = getColorForSubject(rawSubject);
      if (colorCol !== -1 && row[colorCol]) {
        const rawColor = String(row[colorCol]).trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(rawColor)) {
          color = rawColor;
        }
      }

      // Create entry for each day specified
      for (const d of targetDays) {
        entries.push({
          id: 'tt-' + Math.random().toString(36).substring(2, 9),
          subject: rawSubject,
          code,
          dayOfWeek: d,
          startTime,
          endTime,
          venue,
          instructor,
          type: classType,
          color,
          notes,
          credits,
          bucket,
          component: rawComponent,
          coordinator,
          department,
          timeTableCode,
        });
      }
    }

    if (entries.length > 0) {
      const uniqueSubs = new Set(entries.map(e => e.subject)).size;
      const daysCount = new Set(entries.map(e => e.dayOfWeek)).size;
      return {
        entries,
        totalParsed: entries.length,
        uniqueSubjects: uniqueSubs,
        daysCovered: daysCount,
        warnings,
        mode: 'list',
        sheetName,
        detectedColumns: originalHeaders,
      };
    }
  }

  // -------------------------------------------------------------
  // Step 2: Try Matrix / Grid format Parser
  // -------------------------------------------------------------
  let isDayInRows = false;
  let isDayInCols = false;

  const headerRow = rawRows[0] || [];
  const dayColIndices: { day: number; colIdx: number }[] = [];
  headerRow.forEach((cell, idx) => {
    const str = String(cell).trim().toLowerCase();
    if (str in DAY_NAME_TO_ID) {
      dayColIndices.push({ day: DAY_NAME_TO_ID[str], colIdx: idx });
    }
  });

  if (dayColIndices.length >= 2) {
    isDayInCols = true;
  }

  const dayRowIndices: { day: number; rowIdx: number }[] = [];
  rawRows.forEach((row, idx) => {
    if (!row || row.length === 0) return;
    const firstCell = String(row[0]).trim().toLowerCase();
    if (firstCell in DAY_NAME_TO_ID) {
      dayRowIndices.push({ day: DAY_NAME_TO_ID[firstCell], rowIdx: idx });
    }
  });

  if (dayRowIndices.length >= 2) {
    isDayInRows = true;
  }

  if (isDayInRows) {
    const timeSlots: { start: string; end: string; colIdx: number }[] = [];
    headerRow.forEach((cell, idx) => {
      if (idx === 0) return;
      const range = parseTimeRange(cell);
      if (range) {
        timeSlots.push({ ...range, colIdx: idx });
      } else {
        const single = parseTimeToHHMM(cell);
        if (single) {
          const [sh, sm] = single.split(':').map(Number);
          const endH = (sh + 1) % 24;
          timeSlots.push({
            start: single,
            end: `${String(endH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
            colIdx: idx,
          });
        }
      }
    });

    dayRowIndices.forEach(({ day, rowIdx }) => {
      const row = rawRows[rowIdx];
      timeSlots.forEach(({ start, end, colIdx }) => {
        const cellVal = String(row[colIdx] || '').trim();
        if (cellVal && cellVal !== '-' && cellVal !== 'N/A' && cellVal !== 'Free' && cellVal !== 'Lunch') {
          const parsed = extractVenueAndNotes(cellVal);
          entries.push({
            id: 'tt-' + Math.random().toString(36).substring(2, 9),
            subject: parsed.subject,
            code: parsed.code,
            dayOfWeek: day,
            startTime: start,
            endTime: end,
            venue: parsed.venue || 'Classroom / TBA',
            instructor: parsed.instructor,
            type: mapComponentToClassType(undefined, parsed.subject, parsed.venue),
            color: getColorForSubject(parsed.subject),
            notes: parsed.notes,
          });
        }
      });
    });
  } else if (isDayInCols) {
    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;
      const timeCell = row[0];
      const range = parseTimeRange(timeCell);
      let startTime = '09:00';
      let endTime = '10:30';

      if (range) {
        startTime = range.start;
        endTime = range.end;
      } else {
        const single = parseTimeToHHMM(timeCell);
        if (single) {
          startTime = single;
          const [sh, sm] = single.split(':').map(Number);
          endTime = `${String((sh + 1) % 24).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
        }
      }

      dayColIndices.forEach(({ day, colIdx }) => {
        const cellVal = String(row[colIdx] || '').trim();
        if (cellVal && cellVal !== '-' && cellVal !== 'N/A' && cellVal !== 'Free' && cellVal !== 'Lunch') {
          const parsed = extractVenueAndNotes(cellVal);
          entries.push({
            id: 'tt-' + Math.random().toString(36).substring(2, 9),
            subject: parsed.subject,
            code: parsed.code,
            dayOfWeek: day,
            startTime,
            endTime,
            venue: parsed.venue || 'Classroom / TBA',
            instructor: parsed.instructor,
            type: mapComponentToClassType(undefined, parsed.subject, parsed.venue),
            color: getColorForSubject(parsed.subject),
            notes: parsed.notes,
          });
        }
      });
    }
  }

  if (entries.length === 0) {
    throw new Error(
      'Could not detect any valid timetable entries. Please ensure columns include "Day", "Course Title", "Time" (e.g. 09:00 To 10:50), and "Resource Name", or use the downloadable Excel template.'
    );
  }

  const uniqueSubs = new Set(entries.map(e => e.subject)).size;
  const daysCount = new Set(entries.map(e => e.dayOfWeek)).size;

  return {
    entries,
    totalParsed: entries.length,
    uniqueSubjects: uniqueSubs,
    daysCovered: daysCount,
    warnings,
    mode: isDayInRows || isDayInCols ? 'matrix' : 'list',
    sheetName,
    detectedColumns: originalHeaders,
  };
}

/**
 * Generates and downloads a clean, sample Excel (.xlsx) workbook template for the user
 * Primary Sheet 1 uses the EXACT University Portal ERP columns provided by the user!
 */
export function downloadTimetableTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Exact University ERP Format with User's Columns
  const universityData = [
    [
      'Tima Table Code',
      'Course Code',
      'Course Title',
      'Course Bucket',
      'Credit',
      'Component',
      'Day',
      'Time',
      'Resource Name',
      'Couse instructore',
      'Course Coordinator',
      'Course Offering Dept/School/College'
    ],
    [
      'TT301-AIMLR-E',
      'CSN344',
      'Machine Learning',
      'Discipline Elective',
      3,
      'Practical-1',
      'Monday',
      '09:00 To 10:50',
      'Block - VEDANTA - VED5F 510 ComputerLab 5',
      'Vaidhai Choudhary',
      'No Faculty',
      'School of Computing'
    ],
    [
      'TT301-AIMLR-E',
      'CSN304',
      'Artificial Intelligence',
      'Discipline Core',
      4,
      'Lecture-1',
      'Monday',
      '11:00 To 11:50',
      'Block - VISVESVARAYA - VERA5F 509 Lecture Hall 7',
      'Anmol Mahajan',
      'No Faculty',
      'School of Computing'
    ],
    [
      'TT301-AIMLR-E',
      'PEN449',
      'Neural Networks and Deep Learning for Energy Applications',
      'Free Elective',
      4,
      'Lecture-1',
      'Monday',
      '14:00 To 14:50',
      'Block - VISVAKARMA - VISKSF WL205 Lecture',
      'Shilpi Saxena',
      'Shilpi Saxena',
      'Department of Petroleum Engineering'
    ],
    [
      'TT301-AIMLR-E',
      'CSN304',
      'Artificial Intelligence Lab',
      'Discipline Core',
      2,
      'Practical-1',
      'Tuesday',
      '09:00 To 10:50',
      'Block - VEDANTA - VED3F 308 AI Lab',
      'Anmol Mahajan',
      'Anmol Mahajan',
      'School of Computing'
    ],
    [
      'TT301-AIMLR-E',
      'CSN344',
      'Machine Learning',
      'Discipline Elective',
      3,
      'Lecture-1',
      'Tuesday',
      '11:00 To 12:30',
      'Block - VISVESVARAYA - VERA5F 509 Lecture Hall 7',
      'Vaidhai Choudhary',
      'No Faculty',
      'School of Computing'
    ],
    [
      'TT301-AIMLR-E',
      'PEN449',
      'Neural Networks and Deep Learning Lab',
      'Free Elective',
      2,
      'Practical-1',
      'Wednesday',
      '14:00 To 16:00',
      'Block - VISVAKARMA - VISKSF WL210 Lab',
      'Shilpi Saxena',
      'Shilpi Saxena',
      'Department of Petroleum Engineering'
    ],
    [
      'TT301-AIMLR-E',
      'CSN304',
      'Artificial Intelligence',
      'Discipline Core',
      4,
      'Lecture-2',
      'Thursday',
      '10:00 To 11:30',
      'Block - VISVESVARAYA - VERA5F 509 Lecture Hall 7',
      'Anmol Mahajan',
      'No Faculty',
      'School of Computing'
    ],
    [
      'TT301-AIMLR-E',
      'CSN344',
      'Machine Learning',
      'Discipline Elective',
      3,
      'Lecture-2',
      'Friday',
      '09:00 To 10:30',
      'Block - VISVESVARAYA - VERA5F 509 Lecture Hall 7',
      'Vaidhai Choudhary',
      'No Faculty',
      'School of Computing'
    ],
  ];

  const wsUni = XLSX.utils.aoa_to_sheet(universityData);
  wsUni['!cols'] = [
    { wch: 16 }, // Tima Table Code
    { wch: 14 }, // Course Code
    { wch: 38 }, // Course Title
    { wch: 22 }, // Course Bucket
    { wch: 8 },  // Credit
    { wch: 14 }, // Component
    { wch: 12 }, // Day
    { wch: 18 }, // Time
    { wch: 45 }, // Resource Name
    { wch: 22 }, // Couse instructore
    { wch: 20 }, // Course Coordinator
    { wch: 35 }, // Course Offering Dept/School/College
  ];
  XLSX.utils.book_append_sheet(wb, wsUni, 'University ERP Timetable');

  // Sheet 2: Standard List format
  const listData = [
    ['Day', 'Subject', 'Course Code', 'Start Time', 'End Time', 'Venue', 'Instructor', 'Class Type', 'Notes'],
    ['Monday', 'Machine Learning', 'CSN344', '09:00', '10:50', 'Block - VEDANTA - VED5F 510 ComputerLab 5', 'Vaidhai Choudhary', 'Lab', 'Discipline Elective • 3 Credits'],
    ['Monday', 'Artificial Intelligence', 'CSN304', '11:00', '11:50', 'Block - VISVESVARAYA - VERA5F 509 Lecture Hall 7', 'Anmol Mahajan', 'Lecture', 'Discipline Core • 4 Credits'],
    ['Monday', 'Neural Networks and Deep Learning for Energy', 'PEN449', '14:00', '14:50', 'Block - VISVAKARMA - VISKSF WL205 Lecture', 'Shilpi Saxena', 'Lecture', 'Free Elective • 4 Credits'],
  ];
  const wsList = XLSX.utils.aoa_to_sheet(listData);
  wsList['!cols'] = [
    { wch: 12 },
    { wch: 38 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 45 },
    { wch: 22 },
    { wch: 14 },
    { wch: 38 },
  ];
  XLSX.utils.book_append_sheet(wb, wsList, 'Standard Timetable List');

  XLSX.writeFile(wb, 'University_Timetable_Template.xlsx');
}

/**
 * Exports current active timetable entries to Excel (.xlsx) file matching the rich university format
 */
export function exportTimetableToExcel(entries: TimeTableEntry[]) {
  const wb = XLSX.utils.book_new();

  const sorted = [...entries].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  const header = [
    'Tima Table Code',
    'Course Code',
    'Course Title',
    'Course Bucket',
    'Credit',
    'Component',
    'Day',
    'Time',
    'Resource Name',
    'Couse instructore',
    'Course Coordinator',
    'Course Offering Dept/School/College',
    'Notes'
  ];

  const rows = sorted.map(e => [
    e.timeTableCode || 'TT-AUTO',
    e.code || '',
    e.subject,
    e.bucket || 'Academic Course',
    e.credits || '',
    e.component || (e.type === 'Lab' ? 'Practical-1' : e.type === 'Tutorial' ? 'Tutorial-1' : 'Lecture-1'),
    DAY_NAMES[e.dayOfWeek] || 'Monday',
    `${e.startTime} To ${e.endTime}`,
    e.venue,
    e.instructor || 'Faculty TBA',
    e.coordinator || 'No Faculty',
    e.department || 'Academic Department',
    e.notes || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 38 },
    { wch: 22 },
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 45 },
    { wch: 22 },
    { wch: 20 },
    { wch: 35 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'University Timetable');
  XLSX.writeFile(wb, `University_Timetable_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
