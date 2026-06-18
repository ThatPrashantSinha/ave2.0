import { useState, useEffect, useCallback } from 'react';
import { Task, Habit } from './types';
import { addDays, subDays, format } from 'date-fns';
import { toIST } from './lib/utils';
import { 
  seedDBIfEmpty, 
  getTasksFromDB, 
  getHabitsFromDB, 
  putTaskInDB, 
  deleteTaskFromDB, 
  putHabitInDB, 
  deleteHabitFromDB 
} from './lib/db';

export function useStore() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      await seedDBIfEmpty();
      const dbTasks = await getTasksFromDB();
      const dbHabits = await getHabitsFromDB();
      setTasks(dbTasks);
      setHabits(dbHabits);
    } catch (e) {
      console.error('Failed to load data from IndexedDB:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addTask = async (task: Omit<Task, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newTask: Task = { ...task, id };
    setTasks(prev => [...prev, newTask]);
    try {
      await putTaskInDB(newTask);
    } catch (e) {
      console.error('Failed to store task in IndexedDB:', e);
    }
  };

  const toggleTaskStatus = async (id: string) => {
    const parts = id.split('::');
    const baseId = parts[0];
    const occurrenceDateStr = parts[1];
    let updatedTask: Task | null = null;

    setTasks(prev => prev.map(t => {
      if (t.id === baseId) {
        if (occurrenceDateStr) {
          const occurrenceStatuses = t.occurrenceStatuses || {};
          const currentStatus = occurrenceStatuses[occurrenceDateStr] || 'todo';
          const nextStatus = currentStatus === 'todo' ? 'in-progress' : currentStatus === 'in-progress' ? 'done' : 'todo';
          updatedTask = {
            ...t,
            occurrenceStatuses: {
              ...occurrenceStatuses,
              [occurrenceDateStr]: nextStatus
            }
          };
          return updatedTask;
        } else {
          const nextStatus = t.status === 'todo' ? 'in-progress' : t.status === 'in-progress' ? 'done' : 'todo';
          updatedTask = { ...t, status: nextStatus };
          return updatedTask;
        }
      }
      return t;
    }));
    
    // Defer IndexedDB write
    setTimeout(async () => {
      if (updatedTask) {
        try {
          await putTaskInDB(updatedTask);
        } catch (e) {
          console.error('Failed to update task status in IndexedDB:', e);
        }
      }
    }, 0);
  };

  const deleteTask = async (id: string) => {
    const parts = id.split('::');
    const baseId = parts[0];
    const occurrenceDateStr = parts[1];

    if (occurrenceDateStr) {
      let updatedTask: Task | null = null;
      setTasks(prev => prev.map(t => {
        if (t.id === baseId) {
          const deletedDates = t.deletedDates || [];
          updatedTask = {
            ...t,
            deletedDates: [...deletedDates, occurrenceDateStr]
          };
          return updatedTask;
        }
        return t;
      }));

      setTimeout(async () => {
        if (updatedTask) {
          try {
            await putTaskInDB(updatedTask);
          } catch (e) {
            console.error('Failed to update task in IndexedDB:', e);
          }
        }
      }, 0);
    } else {
      setTasks(prev => prev.filter(t => t.id !== baseId));
      try {
        await deleteTaskFromDB(baseId);
      } catch (e) {
        console.error('Failed to delete task from IndexedDB:', e);
      }
    }
  };

  const updateTask = async (id: string, updatedFields: Partial<Omit<Task, 'id'>> & { updateAllOccurrences?: boolean }) => {
    const parts = id.split('::');
    const baseId = parts[0];
    const occurrenceDateStr = parts[1];
    let tasksToPut: Task[] = [];

    setTasks(prev => {
      const parentTask = prev.find(t => t.id === baseId);
      if (!parentTask) return prev;

      if (occurrenceDateStr && !updatedFields.updateAllOccurrences) {
        const idNew = Math.random().toString(36).substring(7);
        const { updateAllOccurrences, ...fieldsToMerge } = updatedFields;
        const clonedTask: Task = {
          ...parentTask,
          ...fieldsToMerge,
          id: idNew,
          recurring: 'none',
          recurrenceRule: undefined,
          occurrenceStatuses: undefined,
          deletedDates: undefined,
        };

        const updatedParent: Task = {
          ...parentTask,
          deletedDates: [...(parentTask.deletedDates || []), occurrenceDateStr]
        };

        tasksToPut = [clonedTask, updatedParent];

        return prev.map(t => {
          if (t.id === baseId) return updatedParent;
          return t;
        }).concat(clonedTask);
      } else {
        const { updateAllOccurrences, ...fieldsToMerge } = updatedFields;
        const updatedParent: Task = { ...parentTask, ...fieldsToMerge };
        tasksToPut = [updatedParent];
        return prev.map(t => {
          if (t.id === baseId) return updatedParent;
          return t;
        });
      }
    });

    setTimeout(async () => {
      for (const t of tasksToPut) {
        try {
          await putTaskInDB(t);
        } catch (e) {
          console.error('Failed to update task in IndexedDB:', e);
        }
      }
    }, 0);
  };

  const addHabit = async (habit: Omit<Habit, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newHabit: Habit = { ...habit, id };
    setHabits(prev => [...prev, newHabit]);
    try {
      await putHabitInDB(newHabit);
    } catch (e) {
      console.error('Failed to store habit in IndexedDB:', e);
    }
  };

  const deleteHabit = async (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    try {
      await deleteHabitFromDB(id);
    } catch (e) {
      console.error('Failed to delete habit from IndexedDB:', e);
    }
  };

  const toggleHabitHistory = async (id: string, dateStr: string) => {
    let updatedHabit: Habit | null = null;
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const historyCopy = { ...h.history };
        const currentlyDone = !!historyCopy[dateStr];
        if (currentlyDone) {
          delete historyCopy[dateStr];
        } else {
          historyCopy[dateStr] = true;
        }

        // Calculate simple streak based on consecutive prior days completed from today
        // For simplicity, just count back consecutive completed entries
        let currentStreak = 0;
        const checkDate = new Date();
        for (let i = 0; i < 30; i++) {
          const dStr = checkDate.toISOString().split('T')[0];
          if (historyCopy[dStr]) {
            currentStreak++;
          } else {
            if (i > 0) break; // If today is missed but yesterday was done, keep checking streak or break depending on strictness. Or simple count.
          }
          checkDate.setDate(checkDate.getDate() - 1);
        }

        updatedHabit = { 
          ...h, 
          history: historyCopy,
          streak: Object.keys(historyCopy).length // Use total completions or calculated streak
        };
        return updatedHabit;
      }
      return h;
    }));

    setTimeout(async () => {
      if (updatedHabit) {
        try {
          await putHabitInDB(updatedHabit);
        } catch (e) {
          console.error('Failed to update habit in IndexedDB:', e);
        }
      }
    }, 0);
  };

  return {
    tasks,
    habits,
    isLoading,
    addTask,
    toggleTaskStatus,
    deleteTask,
    updateTask,
    addHabit,
    deleteHabit,
    toggleHabitHistory,
    refreshStore: loadData
  };
}
