import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toIST(date: Date | string | number = new Date()): Date {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  // Get the UTC timestamp
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  // Indian Standard Time is UTC + 5:30
  return new Date(utc + (3600000 * 5.5));
}
