export type Priority = 'low' | 'medium' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  until?: string; // YYYY-MM-DD
  count?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: Date;
  endTime?: Date;
  status: TaskStatus;
  priority: Priority;
  tags?: string[];
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  recurrenceRule?: RecurrenceRule;
  occurrenceStatuses?: Record<string, TaskStatus>; // date string YYYY-MM-DD -> TaskStatus
  deletedDates?: string[]; // array of date strings YYYY-MM-DD that are excluded
}

export interface Habit {
  id: string;
  name: string;
  streak: number;
  history: Record<string, boolean>; // date (YYYY-MM-DD) -> completed
  hour?: number; // 0-23
  minute?: number; // 0-59
  frequency?: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';
  daysOfWeek?: number[]; // [0 = Sun, 1 = Mon, ..., 6 = Sat]
  color?: string; // hex colour code
  icon?: string; // emoji character
}

export interface Birthday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

export type ClassType = 'Lecture' | 'Lab' | 'Tutorial' | 'Seminar' | 'Workshop' | 'Other';

export interface TimeTableEntry {
  id: string;
  subject: string;
  code?: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  startTime: string; // HH:mm format (e.g., '09:00')
  endTime: string; // HH:mm format (e.g., '10:30')
  venue: string; // e.g., 'Room 402', 'Block - VEDANTA - VED5F 510 ComputerLab 5'
  instructor?: string; // e.g., 'Vaidhai Choudhary'
  type?: ClassType;
  color: string; // hex color code
  notes?: string;
  credits?: number | string; // e.g. 3, 4
  bucket?: string; // e.g. 'Discipline Elective', 'Discipline Core', 'Free Elective'
  component?: string; // e.g. 'Practical-1', 'Lecture-1', 'Tutorial-1'
  coordinator?: string; // e.g. 'Shilpi Saxena'
  department?: string; // e.g. 'School of Computing'
  timeTableCode?: string; // e.g. 'TT301-AIMLR-E'
}

export interface NotePage {
  id: string;
  title: string;
  content: string;
  color: string; // Tailwind bg color class or hex code
  updatedAt: string; // date string
}

