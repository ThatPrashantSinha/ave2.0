import { Task, Habit } from '../types';

const DB_NAME = 'DailyDocketDB_v3';
const DB_VERSION = 1;

// Seed tasks and habits with completely empty starting lists as requested.
const DEFAULT_TASKS: Task[] = [];

const DEFAULT_HABITS: Habit[] = [];

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('habits')) {
        db.createObjectStore('habits', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Function to seed DB if completely empty
export async function seedDBIfEmpty(): Promise<{ tasksLoaded: number; habitsLoaded: number }> {
  const db = await initDB();
  
  const tasksCount = await new Promise<number>((resolve) => {
    const tx = db.transaction('tasks', 'readonly');
    const store = tx.objectStore('tasks');
    const countReq = store.count();
    countReq.onsuccess = () => resolve(countReq.result);
    countReq.onerror = () => resolve(0);
  });

  const habitsCount = await new Promise<number>((resolve) => {
    const tx = db.transaction('habits', 'readonly');
    const store = tx.objectStore('habits');
    const countReq = store.count();
    countReq.onsuccess = () => resolve(countReq.result);
    countReq.onerror = () => resolve(0);
  });

  if (tasksCount === 0) {
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    for (const t of DEFAULT_TASKS) {
      store.put({
        ...t,
        deadline: t.deadline?.toISOString(),
        endTime: t.endTime?.toISOString()
      });
    }
  }

  if (habitsCount === 0) {
    const tx = db.transaction('habits', 'readwrite');
    const store = tx.objectStore('habits');
    for (const h of DEFAULT_HABITS) {
      store.put(h);
    }
  }

  return {
    tasksLoaded: tasksCount === 0 ? DEFAULT_TASKS.length : tasksCount,
    habitsLoaded: habitsCount === 0 ? DEFAULT_HABITS.length : habitsCount
  };
}

export async function getTasksFromDB(): Promise<Task[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tasks', 'readonly');
    const store = transaction.objectStore('tasks');
    const request = store.getAll();

    request.onsuccess = () => {
      const tasks = request.result as any[];
      const processed = tasks.map(t => ({
        ...t,
        deadline: t.deadline ? new Date(t.deadline) : undefined,
        endTime: t.endTime ? new Date(t.endTime) : undefined,
      }));
      resolve(processed);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function putTaskInDB(task: Task): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tasks', 'readwrite');
    const store = transaction.objectStore('tasks');
    
    const serialized = {
      ...task,
      deadline: task.deadline instanceof Date ? task.deadline.toISOString() : task.deadline,
      endTime: task.endTime instanceof Date ? task.endTime.toISOString() : task.endTime,
    };
    
    const request = store.put(serialized);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteTaskFromDB(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tasks', 'readwrite');
    const store = transaction.objectStore('tasks');
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getHabitsFromDB(): Promise<Habit[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('habits', 'readonly');
    const store = transaction.objectStore('habits');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as Habit[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function putHabitInDB(habit: Habit): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('habits', 'readwrite');
    const store = transaction.objectStore('habits');
    const request = store.put(habit);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteHabitFromDB(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('habits', 'readwrite');
    const store = transaction.objectStore('habits');
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function clearAllStoreData(): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['tasks', 'habits'], 'readwrite');
    tx.objectStore('tasks').clear();
    tx.objectStore('habits').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearTasksStoreData(): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['tasks'], 'readwrite');
    tx.objectStore('tasks').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearHabitsStoreData(): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['habits'], 'readwrite');
    tx.objectStore('habits').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
