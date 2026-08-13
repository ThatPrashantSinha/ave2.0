import { 
  TimeTableEntry, 
  AttendanceRecord, 
  SemesterConfig, 
  SubjectAttendanceStats, 
  TotalAttendanceStats, 
  SubjectManualAttendance,
  AttendanceStatus
} from '../types';
import { differenceInCalendarDays, parseISO, format, isBefore, isAfter, addDays } from 'date-fns';
import { toIST } from './utils';

export const DEFAULT_MIN_ATTENDANCE = 75;

export const DEFAULT_SEMESTER_CONFIG: SemesterConfig = {
  startDate: format(addDays(toIST(new Date()), -28), 'yyyy-MM-dd'), // Default to 4 weeks ago
  minAttendancePercent: 75,
  name: 'Academic Semester 2026',
  holidays: []
};

/**
 * Calculates complete attendance statistics for each subject and total till date.
 * Strictly synchronized from actual calendar attendance records.
 */
export function calculateAttendanceStats(
  entries: TimeTableEntry[],
  records: AttendanceRecord[],
  semesterConfig: SemesterConfig,
  manualAdjustments: Record<string, SubjectManualAttendance> = {},
  targetDate: Date = toIST(new Date())
): {
  subjectStats: SubjectAttendanceStats[];
  totalStats: TotalAttendanceStats;
} {
  const minPercent = semesterConfig.minAttendancePercent || DEFAULT_MIN_ATTENDANCE;
  const minRatio = minPercent / 100;

  // Collect all unique subjects from timetable entries and records
  const subjectsMap = new Map<string, {
    subject: string;
    code?: string;
    component?: string;
    color: string;
    venue?: string;
    instructor?: string;
    weeklySlots: number;
  }>();

  entries.forEach(entry => {
    const key = entry.subject.trim();
    const existing = subjectsMap.get(key);
    if (existing) {
      existing.weeklySlots += 1;
      if (!existing.code && entry.code) existing.code = entry.code;
      if (!existing.component && entry.component) existing.component = entry.component;
    } else {
      subjectsMap.set(key, {
        subject: entry.subject,
        code: entry.code,
        component: entry.component || entry.type,
        color: entry.color || '#2563EB',
        venue: entry.venue,
        instructor: entry.instructor,
        weeklySlots: 1
      });
    }
  });

  // Also include any subjects present in records that may not currently have timetable slots
  (records || []).forEach(rec => {
    const key = rec.subject.trim();
    if (!subjectsMap.has(key)) {
      subjectsMap.set(key, {
        subject: rec.subject,
        code: rec.code,
        component: rec.component,
        color: '#475569',
        weeklySlots: 0
      });
    }
  });

  const subjectStats: SubjectAttendanceStats[] = [];

  let totalPresent = 0;
  let totalAbsent = 0;
  let totalCancelled = 0;

  // All attendance records recorded from the calendar
  const validRecords = records || [];

  subjectsMap.forEach((info, subjectKey) => {
    // Match records strictly to this subject by exact subject name, code, or timetable entry ID
    const subjectRecords = validRecords.filter(r => 
      r.subject.trim().toLowerCase() === subjectKey.trim().toLowerCase() ||
      (r.code && info.code && r.code.trim().toLowerCase() === info.code.trim().toLowerCase()) ||
      (r.timeTableEntryId && entries.some(e => e.id === r.timeTableEntryId && e.subject.trim().toLowerCase() === subjectKey.trim().toLowerCase()))
    );
    
    // Deduplicate records for the same date + entry if any
    const seenMap = new Map<string, AttendanceRecord>();
    subjectRecords.forEach(r => {
      const recKey = `${r.date}_${r.timeTableEntryId || r.id || r.subject}`;
      if (!seenMap.has(recKey)) {
        seenMap.set(recKey, r);
      }
    });
    const uniqueSubjectRecords = Array.from(seenMap.values());

    const present = uniqueSubjectRecords.filter(r => r.status === 'present').length;
    const absent = uniqueSubjectRecords.filter(r => r.status === 'absent').length;
    const cancelled = uniqueSubjectRecords.filter(r => r.status === 'cancelled').length;

    const totalConducted = present + absent;
    let percentage = totalConducted > 0 ? (present / totalConducted) * 100 : 100;
    percentage = Math.round(percentage * 10) / 10;

    let safeBunks = 0;
    let classesNeeded = 0;
    let status: SubjectAttendanceStats['status'] = 'untracked';

    if (totalConducted > 0) {
      if (percentage >= minPercent) {
        // Can bunk: P / (T + x) >= minRatio => x <= (P - minRatio * T) / minRatio
        const numerator = present - (minRatio * totalConducted);
        safeBunks = Math.max(0, Math.floor(numerator / minRatio));
        
        if (percentage >= minPercent + 10) {
          status = 'safe';
        } else {
          status = 'warning';
        }
      } else {
        // Needs classes: (P + y) / (T + y) >= minRatio => y >= (minRatio * T - P) / (1 - minRatio)
        const numerator = (minRatio * totalConducted) - present;
        const denominator = 1 - minRatio;
        classesNeeded = denominator > 0 ? Math.max(1, Math.ceil(numerator / denominator)) : 1;
        status = 'danger';
      }
    }

    totalPresent += present;
    totalAbsent += absent;
    totalCancelled += cancelled;

    subjectStats.push({
      subject: info.subject,
      code: info.code,
      component: info.component,
      color: info.color,
      venue: info.venue,
      instructor: info.instructor,
      scheduledWeeklyCount: info.weeklySlots,
      present,
      absent,
      cancelled,
      totalConducted,
      percentage,
      status,
      safeBunks,
      classesNeeded
    });
  });

  // Sort subject stats alphabetically or by danger first
  subjectStats.sort((a, b) => {
    if (a.status === 'danger' && b.status !== 'danger') return -1;
    if (b.status === 'danger' && a.status !== 'danger') return 1;
    return a.subject.localeCompare(b.subject);
  });

  const overallTotalConducted = totalPresent + totalAbsent;
  let overallPercentage = overallTotalConducted > 0 ? (totalPresent / overallTotalConducted) * 100 : 100;
  overallPercentage = Math.round(overallPercentage * 10) / 10;

  let totalSafeBunks = 0;
  let totalClassesNeeded = 0;

  if (overallTotalConducted > 0) {
    if (overallPercentage >= minPercent) {
      const num = totalPresent - (minRatio * overallTotalConducted);
      totalSafeBunks = Math.max(0, Math.floor(num / minRatio));
    } else {
      const num = (minRatio * overallTotalConducted) - totalPresent;
      const den = 1 - minRatio;
      totalClassesNeeded = den > 0 ? Math.max(1, Math.ceil(num / den)) : 1;
    }
  }

  // Calculate days & weeks completed
  let daysCompleted = 0;
  let weeksCompleted = 0;
  try {
    const startParsed = parseISO(semesterConfig.startDate);
    const diff = differenceInCalendarDays(targetDate, startParsed);
    daysCompleted = Math.max(0, diff + 1);
    weeksCompleted = Math.max(1, Math.ceil(daysCompleted / 7));
  } catch (e) {
    daysCompleted = 1;
    weeksCompleted = 1;
  }

  const totalStats: TotalAttendanceStats = {
    present: totalPresent,
    absent: totalAbsent,
    cancelled: totalCancelled,
    totalConducted: overallTotalConducted,
    percentage: overallPercentage,
    minPercent,
    isEligible: overallPercentage >= minPercent,
    safeBunks: totalSafeBunks,
    classesNeeded: totalClassesNeeded,
    totalSubjects: subjectStats.length,
    daysCompleted,
    weeksCompleted
  };

  return { subjectStats, totalStats };
}

/**
 * Returns scheduled classes for a specific date according to the timetable.
 */
export function getClassesForDate(
  dateStr: string,
  entries: TimeTableEntry[],
  records: AttendanceRecord[]
): {
  entry: TimeTableEntry;
  record?: AttendanceRecord;
  status: AttendanceStatus | 'unmarked';
}[] {
  let dayOfWeek = 0;
  try {
    const d = parseISO(dateStr);
    dayOfWeek = d.getDay();
  } catch (e) {
    dayOfWeek = 1;
  }

  // Find all timetable entries for this day of week
  const matchingEntries = entries
    .filter(e => e.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const recordsForDate = records.filter(r => r.date === dateStr);

  return matchingEntries.map(entry => {
    // Check if there is a record for this specific entry id or matching subject
    const rec = recordsForDate.find(r => 
      (r.timeTableEntryId && r.timeTableEntryId === entry.id) ||
      (!r.timeTableEntryId && r.subject.trim().toLowerCase() === entry.subject.trim().toLowerCase() && (!r.component || !entry.component || r.component.toLowerCase() === (entry.component || entry.type || '').toLowerCase()))
    );
    return {
      entry,
      record: rec,
      status: rec ? rec.status : 'unmarked'
    };
  });
}

/**
 * Generates realistic sample attendance records starting from semester start date up to today.
 */
export function generateSampleAttendanceRecords(
  entries: TimeTableEntry[],
  semesterStartDate: string,
  targetDate: Date = toIST(new Date())
): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  try {
    let curr = parseISO(semesterStartDate);
    const end = targetDate;
    
    // Seeded pseudo-random so it's consistent
    let seed = 42;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    while (isBefore(curr, end) || format(curr, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      const dateStr = format(curr, 'yyyy-MM-dd');
      const dayOfWeek = curr.getDay();

      const dayEntries = entries.filter(e => e.dayOfWeek === dayOfWeek);
      dayEntries.forEach(entry => {
        const rand = random();
        let status: AttendanceStatus = 'present';
        // 86% present, 10% absent, 4% cancelled
        if (rand > 0.96) {
          status = 'cancelled';
        } else if (rand > 0.86) {
          status = 'absent';
        } else {
          status = 'present';
        }

        records.push({
          id: `att_${dateStr}_${entry.id}`,
          date: dateStr,
          subject: entry.subject,
          timeTableEntryId: entry.id,
          code: entry.code,
          component: entry.component || entry.type,
          status,
          timestamp: curr.getTime()
        });
      });

      curr = addDays(curr, 1);
    }
  } catch (e) {
    console.error('Failed to generate sample attendance records:', e);
  }

  return records;
}

