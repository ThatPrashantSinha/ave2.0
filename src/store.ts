import { useState, useEffect, useCallback } from 'react';
import { Task, Habit, TaskStatus, Birthday, TimeTableEntry } from './types';
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

export const SAMPLE_TIMETABLE_ENTRIES: TimeTableEntry[] = [
  {
    id: 'tt-1',
    subject: 'Data Structures & Algorithms',
    code: 'CS-301',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '10:30',
    venue: 'Hall 304, Turing Wing',
    instructor: 'Dr. Alan Turing',
    type: 'Lecture',
    color: '#EF4444', // Subway Red
    notes: 'Bring graph theory problem sheets and lab laptop.'
  },
  {
    id: 'tt-2',
    subject: 'Operating Systems',
    code: 'CS-305',
    dayOfWeek: 1, // Monday
    startTime: '11:00',
    endTime: '12:30',
    venue: 'Lecture Hall 2, East Block',
    instructor: 'Prof. Linus Torvalds',
    type: 'Lecture',
    color: '#2563EB', // Cobalt Blue
    notes: 'Unix kernel synchronization assignment due.'
  },
  {
    id: 'tt-3',
    subject: 'Linear Algebra & Calculus',
    code: 'MATH-202',
    dayOfWeek: 2, // Tuesday
    startTime: '09:30',
    endTime: '11:00',
    venue: 'Room 108, Ramanujan Complex',
    instructor: 'Dr. S. Ramanujan',
    type: 'Lecture',
    color: '#059669', // Emerald Green
    notes: 'Eigenvalues and matrix decomposition practice problems.'
  },
  {
    id: 'tt-4',
    subject: 'Computer Networks Lab',
    code: 'CS-307L',
    dayOfWeek: 2, // Tuesday
    startTime: '13:30',
    endTime: '16:00',
    venue: 'Network Lab 4, Tech Block',
    instructor: 'Prof. Vint Cerf',
    type: 'Lab',
    color: '#7C3AED', // Violet Purple
    notes: 'Wireshark packet capture analysis session.'
  },
  {
    id: 'tt-5',
    subject: 'Data Structures & Algorithms',
    code: 'CS-301',
    dayOfWeek: 3, // Wednesday
    startTime: '09:00',
    endTime: '10:30',
    venue: 'Hall 304, Turing Wing',
    instructor: 'Dr. Alan Turing',
    type: 'Lecture',
    color: '#EF4444', // Subway Red
    notes: 'Dynamic programming & tree traversals.'
  },
  {
    id: 'tt-6',
    subject: 'Database Management Systems',
    code: 'CS-309',
    dayOfWeek: 3, // Wednesday
    startTime: '11:00',
    endTime: '12:30',
    venue: 'Seminar Hall B',
    instructor: 'Dr. Edgar Codd',
    type: 'Lecture',
    color: '#D97706', // Amber Gold
    notes: 'SQL transactions and B-Tree indexing.'
  },
  {
    id: 'tt-7',
    subject: 'Operating Systems Lab',
    code: 'CS-305L',
    dayOfWeek: 4, // Thursday
    startTime: '10:00',
    endTime: '12:30',
    venue: 'Systems Lab 1, CS Block',
    instructor: 'Prof. Linus Torvalds',
    type: 'Lab',
    color: '#2563EB', // Cobalt Blue
    notes: 'Thread synchronization & semaphores implementation.'
  },
  {
    id: 'tt-8',
    subject: 'Digital Electronics',
    code: 'EC-210',
    dayOfWeek: 4, // Thursday
    startTime: '14:00',
    endTime: '15:30',
    venue: 'Room 201, Shannon Building',
    instructor: 'Dr. Claude Shannon',
    type: 'Lecture',
    color: '#DC2626', // Crimson Red
    notes: 'Logic gates & sequential circuit design.'
  },
  {
    id: 'tt-9',
    subject: 'Database Systems Lab',
    code: 'CS-309L',
    dayOfWeek: 5, // Friday
    startTime: '09:30',
    endTime: '12:00',
    venue: 'Database Center Lab 2',
    instructor: 'Dr. Edgar Codd',
    type: 'Lab',
    color: '#D97706', // Amber Gold
    notes: 'PostgreSQL schema optimization & foreign keys.'
  },
  {
    id: 'tt-10',
    subject: 'Technical Communication & Ethics',
    code: 'HUM-104',
    dayOfWeek: 5, // Friday
    startTime: '14:00',
    endTime: '15:30',
    venue: 'Auditorium 1',
    instructor: 'Prof. Margaret Hamilton',
    type: 'Seminar',
    color: '#0891B2', // Cyan Teal
    notes: 'Semester project presentation overview.'
  }
];

export function useStore() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [timeTableEntries, setTimeTableEntries] = useState<TimeTableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load birthdays and timetable on startup
  useEffect(() => {
    try {
      const storedBday = localStorage.getItem('daily_docket_birthdays');
      if (storedBday) {
        setBirthdays(JSON.parse(storedBday));
      }
    } catch (e) {
      console.error('Failed to parse birthdays from localStorage:', e);
    }

    try {
      const storedTT = localStorage.getItem('daily_docket_timetable');
      if (storedTT) {
        setTimeTableEntries(JSON.parse(storedTT));
      } else {
        // Initialize with realistic college semester timetable
        setTimeTableEntries(SAMPLE_TIMETABLE_ENTRIES);
        localStorage.setItem('daily_docket_timetable', JSON.stringify(SAMPLE_TIMETABLE_ENTRIES));
      }
    } catch (e) {
      console.error('Failed to parse timetable from localStorage:', e);
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

  // Timetable functions
  const addTimeTableEntry = (entry: Omit<TimeTableEntry, 'id'>) => {
    const id = 'tt-' + Math.random().toString(36).substring(7);
    const newEntry: TimeTableEntry = { ...entry, id };
    setTimeTableEntries(prev => {
      const updated = [...prev, newEntry];
      localStorage.setItem('daily_docket_timetable', JSON.stringify(updated));
      return updated;
    });
  };

  const updateTimeTableEntry = (entry: TimeTableEntry) => {
    setTimeTableEntries(prev => {
      const updated = prev.map(item => item.id === entry.id ? entry : item);
      localStorage.setItem('daily_docket_timetable', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteTimeTableEntry = (id: string) => {
    setTimeTableEntries(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('daily_docket_timetable', JSON.stringify(updated));
      return updated;
    });
  };

  const resetTimeTable = (customEntries?: TimeTableEntry[]) => {
    const entries = customEntries || SAMPLE_TIMETABLE_ENTRIES;
    setTimeTableEntries(entries);
    localStorage.setItem('daily_docket_timetable', JSON.stringify(entries));
  };

  const importTimeTableEntries = (newEntries: TimeTableEntry[], replace: boolean = true) => {
    setTimeTableEntries(prev => {
      const updated = replace ? newEntries : [...prev, ...newEntries];
      localStorage.setItem('daily_docket_timetable', JSON.stringify(updated));
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
      
      const stored = localStorage.getItem('daily_docket_birthdays');
      if (stored) {
        setBirthdays(JSON.parse(stored));
      } else {
        setBirthdays([]);
      }

      const storedTT = localStorage.getItem('daily_docket_timetable');
      if (storedTT) {
        setTimeTableEntries(JSON.parse(storedTT));
      } else {
        setTimeTableEntries([]);
      }
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
    timeTableEntries,
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
    addTimeTableEntry,
    updateTimeTableEntry,
    deleteTimeTableEntry,
    resetTimeTable,
    importTimeTableEntries,
    refreshStore: loadData
  };
}
