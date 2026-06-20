import { useState, useEffect, useCallback } from 'react';
import { Task, Habit, TaskStatus, Birthday } from './types';
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
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load birthdays on startup
  useEffect(() => {
    try {
      const stored = localStorage.getItem('daily_docket_birthdays');
      if (stored) {
        setBirthdays(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse birthdays from localStorage:', e);
    }
  }, []);

  const addBirthday = (name: string, date: string) => {
    const id = Math.random().toString(36).substring(7);
    const newBday: Birthday = { id, name, date };
    setBirthdays(prev => {
      const updated = [...prev, newBday];
      localStorage.setItem('daily_docket_birthdays', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteBirthday = (id: string) => {
    setBirthdays(prev => {
      const updated = prev.filter(b => b.id !== id);
      localStorage.setItem('daily_docket_birthdays', JSON.stringify(updated));
      return updated;
    });
  };

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

  const deleteTask = async (id: string, deleteMode: 'this' | 'following' | 'all' = 'this') => {
    const parts = id.split('::');
    const baseId = parts[0];
    const occurrenceDateStr = parts[1];
    let tasksToPut: Task[] = [];
    let tasksToDelete: string[] = [];

    setTasks(prev => {
      // If not an occurrence, we just delete the entire task
      if (!occurrenceDateStr || deleteMode === 'all') {
        tasksToDelete.push(baseId);
        return prev.filter(t => t.id !== baseId);
      }

      const parentTask = prev.find(t => t.id === baseId);
      if (!parentTask) return prev;

      if (deleteMode === 'following') {
        const parentStartDateStr = parentTask.deadline 
          ? new Date(parentTask.deadline).toISOString().split('T')[0]
          : '';

        if (occurrenceDateStr === parentStartDateStr) {
          tasksToDelete.push(baseId);
          return prev.filter(t => t.id !== baseId);
        }

        // Shorten the recurrence until the day before
        const d = new Date(occurrenceDateStr + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        const dayBeforeStr = d.toISOString().split('T')[0];

        const updatedParent: Task = {
          ...parentTask,
          recurrenceRule: {
            ...parentTask.recurrenceRule!,
            frequency: parentTask.recurrenceRule?.frequency || (parentTask.recurring === 'daily' ? 'daily' : parentTask.recurring === 'weekly' ? 'weekly' : 'monthly'),
            until: dayBeforeStr
          }
        };

        tasksToPut = [updatedParent];
        return prev.map(t => (t.id === baseId ? updatedParent : t));
      } else {
        // default: deleteMode === 'this' (Only this instance)
        const updatedParent: Task = {
          ...parentTask,
          deletedDates: [...(parentTask.deletedDates || []), occurrenceDateStr]
        };
        tasksToPut = [updatedParent];
        return prev.map(t => (t.id === baseId ? updatedParent : t));
      }
    });

    // Write deletions / updates to DB
    setTimeout(async () => {
      for (const t of tasksToPut) {
        try {
          await putTaskInDB(t);
        } catch (e) {
          console.error('Failed to update task during deletion in IndexedDB:', e);
        }
      }
      for (const tId of tasksToDelete) {
        try {
          await deleteTaskFromDB(tId);
        } catch (e) {
          console.error('Failed to delete task from IndexedDB:', e);
        }
      }
    }, 0);
  };

  const updateTask = async (
    id: string,
    updatedFields: Partial<Omit<Task, 'id'>> & { updateMode?: 'this' | 'following' | 'all' }
  ) => {
    const parts = id.split('::');
    const baseId = parts[0];
    const occurrenceDateStr = parts[1];
    let tasksToPut: Task[] = [];

    setTasks(prev => {
      const parentTask = prev.find(t => t.id === baseId);
      if (!parentTask) return prev;

      const { updateMode, ...fieldsToMerge } = updatedFields;

      // If this is a simple, non-recurring edit or updateMode is 'all'
      if (!occurrenceDateStr || updateMode === 'all') {
        const updatedParent: Task = { ...parentTask, ...fieldsToMerge };
        tasksToPut = [updatedParent];
        return prev.map(t => (t.id === baseId ? updatedParent : t));
      }

      const parentStartDateStr = parentTask.deadline 
        ? new Date(parentTask.deadline).toISOString().split('T')[0]
        : '';

      const isFirstOccurrence = occurrenceDateStr === parentStartDateStr;

      if (updateMode === 'following') {
        if (isFirstOccurrence) {
          // If editing starting from the first occurrence, it is identical to updating 'all'
          const updatedParent: Task = { ...parentTask, ...fieldsToMerge };
          tasksToPut = [updatedParent];
          return prev.map(t => (t.id === baseId ? updatedParent : t));
        }

        // Calculate day before the current occurrence
        const d = new Date(occurrenceDateStr + 'T12:00:00'); // avoid timezone overlap
        d.setDate(d.getDate() - 1);
        const dayBeforeStr = d.toISOString().split('T')[0];

        const idNew = Math.random().toString(36).substring(7);

        // Keep recurrence details in the cloned new event starting from this occurrence point
        const clonedTask: Task = {
          ...parentTask,
          ...fieldsToMerge,
          id: idNew,
          occurrenceStatuses: {},
          deletedDates: [],
        };

        // Adjust clonedTask start date (deadline) and duration
        if (parentTask.deadline) {
          const originalStart = new Date(parentTask.deadline);
          const occurrenceStart = new Date(occurrenceDateStr + 'T12:00:00');
          // Preserve hours, minutes, seconds from the parent task or the updated deadline
          const finalStart = fieldsToMerge.deadline ? new Date(fieldsToMerge.deadline) : new Date(
            occurrenceStart.getFullYear(),
            occurrenceStart.getMonth(),
            occurrenceStart.getDate(),
            originalStart.getHours(),
            originalStart.getMinutes(),
            originalStart.getSeconds()
          );
          clonedTask.deadline = finalStart;

          if (parentTask.endTime) {
            const durationMs = new Date(parentTask.endTime).getTime() - originalStart.getTime();
            clonedTask.endTime = fieldsToMerge.endTime ? new Date(fieldsToMerge.endTime) : new Date(finalStart.getTime() + durationMs);
          }
        }

        // Parent task should now stop before this occurrence point
        const updatedParent: Task = {
          ...parentTask,
          recurrenceRule: {
            ...parentTask.recurrenceRule!,
            frequency: parentTask.recurrenceRule?.frequency || (parentTask.recurring === 'daily' ? 'daily' : parentTask.recurring === 'weekly' ? 'weekly' : 'monthly'),
            interval: parentTask.recurrenceRule?.interval || 1,
            until: dayBeforeStr
          }
        };

        // Migrate future statuses and exclusions to the clonedTask
        const parentStatuses = { ...(parentTask.occurrenceStatuses || {}) };
        const parentDeleted = [...(parentTask.deletedDates || [])];
        
        const clonedStatuses: Record<string, TaskStatus> = {};
        const clonedDeleted: string[] = [];

        Object.keys(parentStatuses).forEach(k => {
          if (k >= occurrenceDateStr) {
            clonedStatuses[k] = parentStatuses[k];
            delete parentStatuses[k];
          }
        });

        const updatedParentDeleted = parentDeleted.filter(dStr => {
          if (dStr >= occurrenceDateStr) {
            clonedDeleted.push(dStr);
            return false;
          }
          return true;
        });

        updatedParent.occurrenceStatuses = parentStatuses;
        updatedParent.deletedDates = updatedParentDeleted;

        clonedTask.occurrenceStatuses = clonedStatuses;
        clonedTask.deletedDates = clonedDeleted;

        tasksToPut = [clonedTask, updatedParent];

        return prev.map(t => (t.id === baseId ? updatedParent : t)).concat(clonedTask);
      } else {
        // default: updateMode === 'this' (Only this instance)
        const idNew = Math.random().toString(36).substring(7);
        const clonedTask: Task = {
          ...parentTask,
          ...fieldsToMerge,
          id: idNew,
          recurring: 'none',
          recurrenceRule: undefined,
          occurrenceStatuses: undefined,
          deletedDates: undefined,
        };

        // Adjust clonedTask start date (deadline) and duration
        if (parentTask.deadline) {
          const originalStart = new Date(parentTask.deadline);
          const occurrenceStart = new Date(occurrenceDateStr + 'T12:00:00');
          const finalStart = fieldsToMerge.deadline ? new Date(fieldsToMerge.deadline) : new Date(
            occurrenceStart.getFullYear(),
            occurrenceStart.getMonth(),
            occurrenceStart.getDate(),
            originalStart.getHours(),
            originalStart.getMinutes(),
            originalStart.getSeconds()
          );
          clonedTask.deadline = finalStart;

          if (parentTask.endTime) {
            const durationMs = new Date(parentTask.endTime).getTime() - originalStart.getTime();
            clonedTask.endTime = fieldsToMerge.endTime ? new Date(fieldsToMerge.endTime) : new Date(finalStart.getTime() + durationMs);
          }
        }

        const updatedParent: Task = {
          ...parentTask,
          deletedDates: [...(parentTask.deletedDates || []), occurrenceDateStr]
        };

        tasksToPut = [clonedTask, updatedParent];

        return prev.map(t => (t.id === baseId ? updatedParent : t)).concat(clonedTask);
      }
    });

    // Write tasks to IndexedDB
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

  const updateHabit = async (habit: Habit) => {
    setHabits(prev => prev.map(h => h.id === habit.id ? habit : h));
    try {
      await putHabitInDB(habit);
    } catch (e) {
      console.error('Failed to update habit in IndexedDB:', e);
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
    birthdays,
    isLoading,
    addTask,
    toggleTaskStatus,
    deleteTask,
    updateTask,
    addHabit,
    deleteHabit,
    updateHabit,
    toggleHabitHistory,
    addBirthday,
    deleteBirthday,
    refreshStore: loadData
  };
}
