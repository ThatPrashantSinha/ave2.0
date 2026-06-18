import { format, addDays } from 'date-fns';
import { Task } from '../types';

export function getOccurrencesForDateRange(tasks: Task[], rangeStart: Date, rangeEnd: Date): Task[] {
  const occurrences: Task[] = [];
  
  // Normalize range boundaries to start of day
  const startNormalized = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  const endNormalized = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate());

  for (const task of tasks) {
    if (!task.deadline) {
      occurrences.push(task);
      continue;
    }

    const taskStart = new Date(task.deadline);
    const taskStartNormalized = new Date(taskStart.getFullYear(), taskStart.getMonth(), taskStart.getDate());

    // If the task has no recurrence rule or recurring is 'none'
    if (!task.recurring || task.recurring === 'none') {
      const taskEnd = task.endTime ? new Date(task.endTime) : taskStart;
      const taskEndNormalized = new Date(taskEnd.getFullYear(), taskEnd.getMonth(), taskEnd.getDate());

      // Check if the task intersects with the requested start-end date range
      if (taskStartNormalized <= endNormalized && taskEndNormalized >= startNormalized) {
        occurrences.push(task);
      }
      continue;
    }

    // It is a recurring task! Find all occurrences in our range [startNormalized, endNormalized] day by day
    let day = new Date(startNormalized);
    while (day <= endNormalized) {
      if (day < taskStartNormalized) {
        day = addDays(day, 1);
        continue;
      }

      const dayStr = format(day, 'yyyy-MM-dd');

      // Check if this occurrence was specifically deleted
      if (task.deletedDates?.includes(dayStr)) {
        day = addDays(day, 1);
        continue;
      }

      // Check if recurring rule matches
      if (isOccurrenceOnDate(task, day, taskStartNormalized)) {
        const durationMs = task.endTime ? (new Date(task.endTime).getTime() - taskStart.getTime()) : 0;
        
        // Construct new virtual occurrence deadline & endTime
        const occurrenceDeadline = new Date(day.getFullYear(), day.getMonth(), day.getDate(), taskStart.getHours(), taskStart.getMinutes(), taskStart.getSeconds());
        const occurrenceEndTime = task.endTime ? new Date(occurrenceDeadline.getTime() + durationMs) : undefined;
        
        // Map status for this specific date
        const occurrenceStatus = task.occurrenceStatuses?.[dayStr] || 'todo';

        occurrences.push({
          ...task,
          id: `${task.id}::${dayStr}`,
          deadline: occurrenceDeadline,
          endTime: occurrenceEndTime,
          status: occurrenceStatus
        });
      }

      day = addDays(day, 1);
    }
  }

  return occurrences;
}

function isOccurrenceOnDate(task: Task, day: Date, taskStartNormalized: Date): boolean {
  const recurring = task.recurring;
  const rule = task.recurrenceRule;

  if (rule?.until) {
    const untilDate = new Date(rule.until + 'T23:59:59');
    if (day > untilDate) return false;
  }

  if (rule?.count) {
    const hits = countOccurrencesUpTo(task, day, taskStartNormalized);
    if (hits > rule.count) return false;
  }

  const freq = rule?.frequency || (recurring === 'daily' ? 'daily' : recurring === 'weekly' ? 'weekly' : recurring === 'monthly' ? 'monthly' : recurring === 'yearly' ? 'yearly' : 'daily');
  const interval = rule?.interval || 1;

  switch (freq) {
    case 'daily': {
      const diffDays = Math.round((day.getTime() - taskStartNormalized.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays % interval === 0;
    }
    case 'weekly': {
      const diffDays = Math.round((day.getTime() - taskStartNormalized.getTime()) / (1000 * 60 * 60 * 24));
      
      if (!rule?.daysOfWeek || rule.daysOfWeek.length === 0) {
        if (day.getDay() !== taskStartNormalized.getDay()) return false;
        const diffWeeks = Math.floor(diffDays / 7);
        return diffWeeks % interval === 0;
      } else {
        const dow = day.getDay();
        if (!rule.daysOfWeek.includes(dow)) return false;

        const startWeekSunday = new Date(taskStartNormalized);
        startWeekSunday.setDate(startWeekSunday.getDate() - startWeekSunday.getDay());
        
        const daySunday = new Date(day);
        daySunday.setDate(daySunday.getDate() - daySunday.getDay());

        const diffWeeksNormalized = Math.round((daySunday.getTime() - startWeekSunday.getTime()) / (1000 * 60 * 60 * 24 * 7));
        return diffWeeksNormalized % interval === 0;
      }
    }
    case 'monthly': {
      const diffMonths = (day.getFullYear() - taskStartNormalized.getFullYear()) * 12 + (day.getMonth() - taskStartNormalized.getMonth());
      if (diffMonths % interval !== 0) return false;
      return day.getDate() === taskStartNormalized.getDate();
    }
    case 'yearly': {
      const diffYears = day.getFullYear() - taskStartNormalized.getFullYear();
      if (diffYears % interval !== 0) return false;
      return day.getMonth() === taskStartNormalized.getMonth() && day.getDate() === taskStartNormalized.getDate();
    }
    default:
      return false;
  }
}

function countOccurrencesUpTo(task: Task, targetDay: Date, taskStartNormalized: Date): number {
  let count = 0;
  let current = new Date(taskStartNormalized);
  const freq = task.recurrenceRule?.frequency || (task.recurring === 'daily' ? 'daily' : task.recurring === 'weekly' ? 'weekly' : task.recurring === 'monthly' ? 'monthly' : task.recurring === 'yearly' ? 'yearly' : 'daily');
  const interval = task.recurrenceRule?.interval || 1;

  while (current <= targetDay) {
    if (isOccurrenceInPast(task, current, taskStartNormalized)) {
      count++;
    }
    if (freq === 'daily') {
      current.setDate(current.getDate() + interval);
    } else if (freq === 'weekly') {
      if (task.recurrenceRule?.daysOfWeek && task.recurrenceRule.daysOfWeek.length > 0) {
        current.setDate(current.getDate() + 1);
      } else {
        current.setDate(current.getDate() + 7 * interval);
      }
    } else if (freq === 'monthly') {
      current.setMonth(current.getMonth() + interval);
    } else if (freq === 'yearly') {
      current.setFullYear(current.getFullYear() + interval);
    } else {
      break;
    }
  }
  return count;
}

function isOccurrenceInPast(task: Task, day: Date, taskStartNormalized: Date): boolean {
  if (day < taskStartNormalized) return false;
  const recurring = task.recurring;
  const rule = task.recurrenceRule;

  const freq = rule?.frequency || (recurring === 'daily' ? 'daily' : recurring === 'weekly' ? 'weekly' : recurring === 'monthly' ? 'monthly' : recurring === 'yearly' ? 'yearly' : 'daily');
  const interval = rule?.interval || 1;

  switch (freq) {
    case 'daily': {
      const diffDays = Math.round((day.getTime() - taskStartNormalized.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays % interval === 0;
    }
    case 'weekly': {
      const diffDays = Math.round((day.getTime() - taskStartNormalized.getTime()) / (1000 * 60 * 60 * 24));
      if (!rule?.daysOfWeek || rule.daysOfWeek.length === 0) {
        if (day.getDay() !== taskStartNormalized.getDay()) return false;
        const diffWeeks = Math.floor(diffDays / 7);
        return diffWeeks % interval === 0;
      } else {
        const dow = day.getDay();
        if (!rule.daysOfWeek.includes(dow)) return false;

        const startWeekSunday = new Date(taskStartNormalized);
        startWeekSunday.setDate(startWeekSunday.getDate() - startWeekSunday.getDay());
        
        const daySunday = new Date(day);
        daySunday.setDate(daySunday.getDate() - daySunday.getDay());

        const diffWeeksNormalized = Math.round((daySunday.getTime() - startWeekSunday.getTime()) / (1000 * 60 * 60 * 24 * 7));
        return diffWeeksNormalized % interval === 0;
      }
    }
    case 'monthly': {
      const diffMonths = (day.getFullYear() - taskStartNormalized.getFullYear()) * 12 + (day.getMonth() - taskStartNormalized.getMonth());
      if (diffMonths % interval !== 0) return false;
      return day.getDate() === taskStartNormalized.getDate();
    }
    case 'yearly': {
      const diffYears = day.getFullYear() - taskStartNormalized.getFullYear();
      if (diffYears % interval !== 0) return false;
      return day.getMonth() === taskStartNormalized.getMonth() && day.getDate() === taskStartNormalized.getDate();
    }
    default:
      return false;
  }
}
