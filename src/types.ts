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
}

export interface Birthday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

