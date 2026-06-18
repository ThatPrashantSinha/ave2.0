import React from 'react';
import { Task } from '../types';
import { WeeklyCalendar } from './WeeklyCalendar';

interface PlannerProps {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, updatedFields: Partial<Omit<Task, 'id'>>) => void;
}

export function Planner({ tasks, addTask, toggleTask, deleteTask, updateTask }: PlannerProps) {
  return (
    <div className="w-full h-full flex-1 flex flex-col">
      <WeeklyCalendar tasks={tasks} addTask={addTask} toggleTask={toggleTask} deleteTask={deleteTask} updateTask={updateTask} />
    </div>
  );
}
