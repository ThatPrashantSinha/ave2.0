import React from 'react';
import { Task, Birthday, Habit, TimeTableEntry } from '../types';
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
  onOpenTimeTable
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
      />
    </div>
  );
}
