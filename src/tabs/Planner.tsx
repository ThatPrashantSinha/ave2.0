import React from 'react';
import { Task, Birthday } from '../types';
import { WeeklyCalendar } from './WeeklyCalendar';

interface PlannerProps {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string, deleteMode?: 'this' | 'following' | 'all') => void;
  updateTask: (id: string, updatedFields: Partial<Omit<Task, 'id'>> & { updateMode?: 'this' | 'following' | 'all' }) => void;
  birthdays: Birthday[];
  onOpenBirthdays: () => void;
}

export function Planner({ tasks, addTask, toggleTask, deleteTask, updateTask, birthdays, onOpenBirthdays }: PlannerProps) {
  return (
    <div className="w-full h-full flex-1 flex flex-col">
      <WeeklyCalendar 
        tasks={tasks} 
        addTask={addTask} 
        toggleTask={toggleTask} 
        deleteTask={deleteTask} 
        updateTask={updateTask} 
        birthdays={birthdays} 
        onOpenBirthdays={onOpenBirthdays} 
      />
    </div>
  );
}
