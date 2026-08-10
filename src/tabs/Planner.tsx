import React from 'react';
import { Task, Birthday, Habit, TimeTableEntry, SemesterConfig, AttendanceRecord, AttendanceStatus } from '../types';
import { WeeklyCalendar } from './WeeklyCalendar';

interface PlannerProps {
  tasks: Task[];
  habits: Habit[];
  addTask: (task: Omit<Task, 'id'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string, deleteMode?: 'this' | 'following' | 'all') => void;
  updateTask: (id: string, updatedFields: Partial<Omit<Task, 'id'>> & { updateMode?: 'this' | 'following' | 'all' }) => void;
  birthdays: Birthday[];
  onOpenBirthdays: () => void;
  timeTableEntries?: TimeTableEntry[];
  onOpenTimeTable?: () => void;
  semesterConfig?: SemesterConfig;
  attendanceRecords?: AttendanceRecord[];
  onMarkAttendance?: (date: string, subject: string, status: AttendanceStatus, timeTableEntryId?: string, note?: string, code?: string, component?: string) => void;
  onDeleteAttendanceRecord?: (id: string) => void;
}

export function Planner({ 
  tasks, 
  habits, 
  addTask, 
  toggleTask, 
  deleteTask, 
  updateTask, 
  birthdays, 
  onOpenBirthdays,
  timeTableEntries = [],
  onOpenTimeTable,
  semesterConfig,
  attendanceRecords = [],
  onMarkAttendance,
  onDeleteAttendanceRecord
}: PlannerProps) {
  return (
    <div className="w-full h-full flex-1 flex flex-col">
      <WeeklyCalendar 
        tasks={tasks} 
        habits={habits}
        addTask={addTask} 
        toggleTask={toggleTask} 
        deleteTask={deleteTask} 
        updateTask={updateTask} 
        birthdays={birthdays} 
        onOpenBirthdays={onOpenBirthdays} 
        timeTableEntries={timeTableEntries}
        onOpenTimeTable={onOpenTimeTable}
        semesterConfig={semesterConfig}
        attendanceRecords={attendanceRecords}
        onMarkAttendance={onMarkAttendance}
        onDeleteAttendanceRecord={onDeleteAttendanceRecord}
      />
    </div>
  );
}
