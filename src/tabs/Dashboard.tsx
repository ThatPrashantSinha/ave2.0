import React, { useState, useEffect } from 'react';
import { Task, Habit, Birthday } from '../types';
import { format, isSameDay } from 'date-fns';
import { Play, Square, RotateCcw, Check, ChevronDown, ChevronUp, Gift, Plus, Trash2, Edit2, Sparkles, Award, Settings, Calendar, Clock, Flame, X, Activity, Gauge } from 'lucide-react';
import { cn, toIST } from '../lib/utils';
import { getOccurrencesForDateRange } from '../lib/recurrence';
import { HabitIcon } from '../components/HabitIcon';
import { SubwayTransitIcon } from '../components/SubwayTransitIcon';
import { NotesWidget } from '../components/NotesWidget';

// Accurate dynamic habit statistics calculator matching transit-themed custom days
export function getHabitStats(habit: Habit, todayDate: Date) {
  const history = habit.history || {};
  const completedDates = Object.keys(history).filter(k => !!history[k]);
  
  const totalCompletions = completedDates.length;
  let currentStreak = 0;
  
  // Calculate consecutive days dating back from today or yesterday
  const tempDate = new Date(todayDate);
  const todayStr = format(tempDate, 'yyyy-MM-dd');
  
  const tempYesterday = new Date(todayDate);
  tempYesterday.setDate(todayDate.getDate() - 1);
  const yesterdayStr = format(tempYesterday, 'yyyy-MM-dd');
  
  if (history[todayStr] || history[yesterdayStr]) {
    let checkDate = new Date(todayDate);
    if (!history[todayStr]) {
      checkDate.setDate(todayDate.getDate() - 1);
    }
    
    for (let j = 0; j < 365; j++) {
      const checkDateStr = format(checkDate, 'yyyy-MM-dd');
      const dayOfWeek = checkDate.getDay();
      const freq = habit.frequency || 'daily';
      let isScheduled = true;
      if (freq === 'weekdays') isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
      else if (freq === 'weekends') isScheduled = dayOfWeek === 0 || dayOfWeek === 6;
      else if (freq === 'weekly' || freq === 'custom') {
        if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
          isScheduled = habit.daysOfWeek.includes(dayOfWeek);
        }
      }
      
      if (isScheduled) {
        if (history[checkDateStr]) {
          currentStreak++;
        } else {
          break; // Missed scheduled day -> break streak
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }
  
  // Completion rate over last 30 days
  let scheduledCount30 = 0;
  let completedCount30 = 0;
  const checkDate30 = new Date(todayDate);
  for (let idx = 0; idx < 30; idx++) {
    const checkDateStr = format(checkDate30, 'yyyy-MM-dd');
    const dayOfWeek = checkDate30.getDay();
    const freq = habit.frequency || 'daily';
    let isScheduled = true;
    if (freq === 'weekdays') isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
    else if (freq === 'weekends') isScheduled = dayOfWeek === 0 || dayOfWeek === 6;
    else if (freq === 'weekly' || freq === 'custom') {
      if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
        isScheduled = habit.daysOfWeek.includes(dayOfWeek);
      }
    }
    
    if (isScheduled) {
      scheduledCount30++;
      if (history[checkDateStr]) {
        completedCount30++;
      }
    }
    checkDate30.setDate(checkDate30.getDate() - 1);
  }
  
  const completionRate30 = scheduledCount30 > 0 
    ? Math.round((completedCount30 / scheduledCount30) * 100) 
    : 0;

  return {
    totalCompletions,
    currentStreak,
    completionRate30
  };
}

// Calculates combined streak of completed tasks & habits on consecutive calendar days
export function getCombinedStreak(tasks: Task[], habits: Habit[], todayDate: Date): number {
  if (tasks.length === 0 && habits.length === 0) return 0;

  const getDayInfo = (d: Date) => {
    const dStr = format(d, 'yyyy-MM-dd');
    
    // Only get task occurrences that are scheduled for this day
    const occurrences = getOccurrencesForDateRange(tasks, d, d).filter(task => {
      if (task.recurring && task.recurring !== 'none') {
        return true;
      }
      if (task.deadline) {
        return isSameDay(new Date(task.deadline), d);
      }
      // For backlog/inbox tasks, only include them when checking today because they appear on the active daily list
      if (isSameDay(d, todayDate)) {
        return true;
      }
      return false;
    });

    const completedT = occurrences.filter(t => t.status === 'done');
    
    const dayOfWeek = d.getDay();
    const scheduledH = habits.filter(habit => {
      const freq = habit.frequency || 'daily';
      if (freq === 'daily') return true;
      if (freq === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
      if (freq === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
      if (freq === 'weekly' || freq === 'custom') {
        if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
          return habit.daysOfWeek.includes(dayOfWeek);
        }
      }
      return true;
    });
    
    const completedH = scheduledH.filter(h => !!h.history?.[dStr]);
    const total = occurrences.length + scheduledH.length;
    const completed = completedT.length + completedH.length;

    return {
      total,
      completed,
      isFullyCompleted: total > 0 ? (completed === total) : true,
      hasTasksOrHabits: total > 0
    };
  };

  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);

  const todayInfo = getDayInfo(todayDate);
  const yesterdayInfo = getDayInfo(yesterdayDate);

  let checkDate = new Date(todayDate);

  if (todayInfo.hasTasksOrHabits && todayInfo.isFullyCompleted) {
    checkDate = new Date(todayDate);
  } else if (yesterdayInfo.hasTasksOrHabits && yesterdayInfo.isFullyCompleted) {
    checkDate = new Date(yesterdayDate);
  } else {
    if (todayInfo.total === 0 && yesterdayInfo.isFullyCompleted && yesterdayInfo.hasTasksOrHabits) {
      checkDate = new Date(yesterdayDate);
    } else {
      return 0;
    }
  }

  let streak = 0;
  let activeDaysCount = 0;

  for (let j = 0; j < 365; j++) {
    const info = getDayInfo(checkDate);
    if (info.hasTasksOrHabits) {
      if (info.isFullyCompleted) {
        streak++;
        activeDaysCount++;
      } else {
        break; // Streak broken
      }
    } else {
      // Resting/empty day: continue consecutive day streak without breaking
      streak++;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  if (activeDaysCount === 0) return 0;
  return streak;
}

export function Dashboard({ 
  tasks, 
  habits = [], 
  toggleTask, 
  birthdays = [],
  addHabit,
  deleteHabit,
  updateHabit,
  toggleHabitHistory
}: { 
  tasks: Task[];
  habits?: Habit[];
  toggleTask: (id: string) => void;
  birthdays?: Birthday[];
  addHabit?: (habit: Omit<Habit, 'id'>) => Promise<void>;
  deleteHabit?: (id: string) => Promise<void>;
  updateHabit?: (habit: Habit) => Promise<void>;
  toggleHabitHistory?: (id: string, dateStr: string) => Promise<void>;
}) {
  const today = toIST(new Date());
  
  // State for habit creation/edition modal
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [isHabitWidgetExpanded, setIsHabitWidgetExpanded] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitFormName, setHabitFormName] = useState('');
  const [habitFormHour, setHabitFormHour] = useState(8);
  const [habitFormMinute, setHabitFormMinute] = useState(0);
  const [habitFormFrequency, setHabitFormFrequency] = useState<'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'>('daily');
  const [habitFormDaysOfWeek, setHabitFormDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // default weekdays
  const [habitFormColor, setHabitFormColor] = useState('#E11D48'); // Subway Red
  const [habitFormIcon, setHabitFormIcon] = useState('🏃‍♂️');
  const [habitFormError, setHabitFormError] = useState('');

  const openEditHabit = (habit: Habit, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHabit(habit);
    setHabitFormName(habit.name);
    setHabitFormHour(habit.hour !== undefined ? habit.hour : 8);
    setHabitFormMinute(habit.minute !== undefined ? habit.minute : 0);
    setHabitFormFrequency(habit.frequency || 'daily');
    setHabitFormDaysOfWeek(habit.daysOfWeek || [1, 2, 3, 4, 5]);
    setHabitFormColor(habit.color || '#E11D48');
    setHabitFormIcon(habit.icon || '🏃‍♂️');
    setHabitFormError('');
    setIsHabitModalOpen(true);
  };

  const openCreateHabit = () => {
    setEditingHabit(null);
    setHabitFormName('');
    setHabitFormHour(8);
    setHabitFormMinute(0);
    setHabitFormFrequency('daily');
    setHabitFormDaysOfWeek([1, 2, 3, 4, 5]);
    setHabitFormColor('#E11D48');
    setHabitFormIcon('🏃‍♂️');
    setHabitFormError('');
    setIsHabitModalOpen(true);
  };

  const handleHabitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitFormName.trim()) {
      setHabitFormError('ROUTE NAME REQUIRED');
      return;
    }
    
    const habitData = {
      name: habitFormName.trim(),
      hour: habitFormHour,
      minute: habitFormMinute,
      frequency: habitFormFrequency,
      daysOfWeek: habitFormFrequency === 'custom' || habitFormFrequency === 'weekly' ? habitFormDaysOfWeek : undefined,
      color: habitFormColor,
      icon: habitFormIcon,
    };

    if (editingHabit) {
      if (updateHabit) {
        await updateHabit({
          ...editingHabit,
          ...habitData,
          streak: getHabitStats({ ...editingHabit, ...habitData }, today).currentStreak
        });
      }
    } else {
      if (addHabit) {
        await addHabit({
          ...habitData,
          streak: 0,
          history: {},
        });
      }
    }
    
    setIsHabitModalOpen(false);
  };

  const handleHabitDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('DECOMISSION THIS TRACK ROOT?')) {
      if (deleteHabit) {
        await deleteHabit(id);
      }
      setIsHabitModalOpen(false);
    }
  };

  const toggleDayOfWeekSelection = (dayNum: number) => {
    setHabitFormDaysOfWeek(prev => {
      if (prev.includes(dayNum)) {
        if (prev.length === 1) return prev; // Keep at least one day selected
        return prev.filter(d => d !== dayNum);
      } else {
        return [...prev, dayNum].sort();
      }
    });
  };

  // Generate date entries for all 7 days of the current week (Monday to Sunday)
  const daysOfWeekList = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(today);
    const day = d.getDay();
    // Monday as the first day of the week
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + idx;
    d.setDate(diff);
    return {
      dateStr: format(d, 'yyyy-MM-dd'),
      shortLabel: format(d, 'EEEEE'), // e.g. "M", "T"
      dayLabel: format(d, 'E'), // e.g. "Mon"
      rawDate: d,
    };
  });

  const todayBirthdays = (birthdays || []).filter(bday => {
    if (!bday.date) return false;
    const parts = bday.date.split('-');
    if (parts.length < 3) return false;
    const bMonth = parseInt(parts[1], 10);
    const bDay = parseInt(parts[2], 10);
    return bMonth === (today.getMonth() + 1) && bDay === today.getDate();
  });

  const todayOccurrences = getOccurrencesForDateRange(tasks, today, today);
  const todayTasks = todayOccurrences.filter(t => t.status !== 'done');
  const completedTasks = todayOccurrences.filter(t => t.status === 'done');

  const todayStr = format(today, 'yyyy-MM-dd');
  const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const todayHabits = habits.filter(habit => {
    const freq = habit.frequency || 'daily';
    if (freq === 'daily') return true;
    if (freq === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (freq === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
    if (freq === 'weekly' || freq === 'custom') {
      if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
        return habit.daysOfWeek.includes(dayOfWeek);
      }
    }
    return true;
  });

  const todayPendingHabits = todayHabits.filter(h => !h.history?.[todayStr]);
  const todayCompletedHabits = todayHabits.filter(h => !!h.history?.[todayStr]);

  const totalDailyItems = todayOccurrences.length + todayHabits.length;
  const completedDailyItems = completedTasks.length + todayCompletedHabits.length;
  const progressPercent = totalDailyItems > 0 ? Math.round((completedDailyItems / totalDailyItems) * 100) : 0;
  const combinedStreak = getCombinedStreak(tasks, habits, today);

  const sortedTodayHabits = [...todayHabits].sort((a, b) => {
    const aHour = a.hour !== undefined ? a.hour : 8;
    const aMin = a.minute !== undefined ? a.minute : 0;
    const bHour = b.hour !== undefined ? b.hour : 8;
    const bMin = b.minute !== undefined ? b.minute : 0;
    return (aHour * 60 + aMin) - (bHour * 60 + bMin);
  });

  interface DocketItem {
    type: 'task' | 'habit';
    id: string;
    sortByTime: number;
    isDone: boolean;
    timeLabel: string;
    original: any;
  }

  const docketItems: DocketItem[] = [];

  // Add tasks
  todayOccurrences.forEach(task => {
    let sortByTime = 23 * 60 + 59; // default to anytime (end of day)
    let timeLabel = 'Anytime';
    
    if (task.deadline) {
      const d = new Date(task.deadline);
      const h = d.getHours();
      const m = d.getMinutes();
      sortByTime = h * 60 + m;
      
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const ampm = h >= 12 ? 'PM' : 'AM';
      timeLabel = `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    }

    docketItems.push({
      type: 'task',
      id: `task-${task.id}`,
      sortByTime,
      isDone: task.status === 'done',
      timeLabel,
      original: task
    });
  });

  // Add habits
  todayHabits.forEach(habit => {
    const hour = habit.hour !== undefined ? habit.hour : 8;
    const minute = habit.minute !== undefined ? habit.minute : 0;
    const sortByTime = hour * 60 + minute;
    
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const timeLabel = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;

    docketItems.push({
      type: 'habit',
      id: `habit-${habit.id}`,
      sortByTime,
      isDone: !!habit.history?.[todayStr],
      timeLabel,
      original: habit
    });
  });

  // Sort by time, putting habits first if times are identical
  docketItems.sort((a, b) => {
    if (a.sortByTime !== b.sortByTime) {
      return a.sortByTime - b.sortByTime;
    }
    if (a.type !== b.type) {
      return a.type === 'habit' ? -1 : 1;
    }
    const labelA = a.type === 'task' ? (a.original as Task).title : (a.original as Habit).name;
    const labelB = b.type === 'task' ? (b.original as Task).title : (b.original as Habit).name;
    return labelA.localeCompare(labelB);
  });

  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  const toggleExpandDescription = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDescriptions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Focus Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => { setIsRunning(false); setTimeLeft(25 * 60); };
  
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      {/* Column 1: Agenda */}
      <div className="md:col-span-4 space-y-4">
        <div className="flex justify-between items-center border-b-4 border-ink pb-2 mb-4">
          <h2 className="font-sans text-2xl font-black uppercase tracking-tight">Today's Docket</h2>
          <span className="bg-ink text-white px-3 py-1 text-xs font-bold uppercase font-mono">
            {todayTasks.length + todayPendingHabits.length} Pending
          </span>
        </div>

        {/* Today's Birthdays Celebration Banner */}
        {todayBirthdays.length > 0 && (
          <div className="bg-[#FFFEEF] border-[3px] border-ink p-3.5 shadow-[4px_4px_0px_#1A1A1B] flex items-start gap-3 relative overflow-hidden group mb-4">
            <div className="bg-[#F7C331] border-2 border-ink p-1.5 shadow-[2px_2px_0px_#1A1A1B] rounded shrink-0">
              <Gift className="text-ink animate-bounce" size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[8px] font-black uppercase text-subway-red tracking-widest block leading-none">
                CELEBRATORY BULLETIN
              </span>
              <h4 className="font-sans font-black text-sm uppercase text-ink mt-1 tracking-tight leading-short">
                {todayBirthdays.map(b => b.name).join(' & ')}
              </h4>
              <p className="font-sans text-[10px] text-ink/75 font-bold mt-1 uppercase tracking-wide">
                🎂 Happy Birthday! Celebrated today. 
              </p>
            </div>
            {/* Tiny retro background pattern */}
            <div className="absolute right-1 top-1 text-ink/5 pointer-events-none select-none font-sans font-black text-5xl">
              🎂
            </div>
          </div>
        )}
        
        <div className="relative space-y-6">

          {docketItems.map((docketItem) => {
            const isHabit = docketItem.type === 'habit';
            const isDone = docketItem.isDone;
            
            if (isHabit) {
              const habit = docketItem.original as Habit;
              return (
                <div 
                  key={docketItem.id}
                  className="relative flex items-start select-none group"
                >
                                   <div 
                    onClick={() => toggleHabitHistory?.(habit.id, todayStr)}
                    className={cn(
                      "flex-1 relative p-3.5 bg-paper border-2 border-ink flex items-center justify-between gap-3 cursor-pointer transition-all rounded-sm",
                      isDone 
                        ? "bg-emerald-50/25 border-ink/40 opacity-70 shadow-none hover:translate-y-0" 
                        : "hover:shadow-[4px_4px_0px_0px_#1A1A1B] hover:bg-paper-dark hover:-translate-y-0.5"
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[7px] md:text-[7.5px] font-black tracking-wider uppercase text-subway-red leading-none bg-subway-red/10 border border-subway-red/30 px-1 py-0.2 rounded-3xs">
                            ROUTE DEP: {docketItem.timeLabel}
                          </span>
                          <span className="font-mono text-[7px] font-bold text-ink/50 uppercase leading-none bg-ink/5 border border-ink/15 px-1 rounded-3xs">
                            {habit.frequency || 'daily'}
                          </span>
                        </div>
                        
                        <h4 className={cn(
                          "font-sans font-black uppercase text-[11px] md:text-[11.5px] text-ink truncate mt-1 leading-snug tracking-tight flex items-center gap-1.5",
                          isDone && "line-through text-ink/45"
                        )}>
                          <HabitIcon iconName={habit.icon || '📍'} size={12} className="shrink-0 text-ink" />
                          <span>{habit.name}</span>
                        </h4>
                        
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="font-mono text-[7.5px] font-black bg-taxi text-ink px-1.5 py-0.5 rounded-3xs border border-ink/20 leading-none flex items-center gap-0.5 shadow-[1px_1px_0px_#1A1A1B]">
                            <Flame size={7.5} className="fill-ink" /> STREAK: {habit.streak || 0}D
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Ticket Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (toggleHabitHistory) toggleHabitHistory(habit.id, todayStr);
                      }}
                      className={cn(
                        "font-mono text-[8px] font-black border border-ink px-2 py-0.5 uppercase transition-all active:translate-y-0.5 cursor-pointer shadow-[1px_1px_0px_#1A1A1B] shrink-0",
                        isDone 
                          ? "bg-emerald-100 text-emerald-950 border-emerald-500 shadow-none scale-95" 
                          : "bg-paper text-ink hover:bg-taxi"
                      )}
                    >
                      {isDone ? 'ARRIVED' : 'RUN'}
                    </button>
                  </div>
                </div>
              );
            } else {
              const task = docketItem.original as Task;
              const isUrgent = task.priority === 'urgent';
              return (
                <div 
                  key={docketItem.id}
                  className="relative flex items-start group"
                >
                  {/* Task Card (The Manifest/Dispatch) */}
                  <div 
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "flex-1 p-3.5 vintage-shadow border-2 border-ink transition-all rounded-sm cursor-pointer",
                      isDone 
                        ? "bg-paper/40 border-ink/30 opacity-60 line-through scale-[0.99] shadow-none hover:translate-y-0"
                        : isUrgent 
                          ? "bg-taxi hover:bg-taxi/95 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-ink)]" 
                          : "bg-paper hover:bg-paper-dark hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-ink)]",
                      !isDone && docketItem.sortByTime % 2 !== 0 && !isUrgent && "border-dashed",
                      task.status === 'in-progress' && "animate-doing-pulse"
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap leading-none">
                              <span className="font-mono text-[7.5px] font-black tracking-wider uppercase text-ink/70 leading-none bg-ink/5 border border-ink/15 px-1 py-0.2 rounded-3xs">
                                DISPATCH DEP: {docketItem.timeLabel}
                              </span>
                            {isUrgent && (
                              <span className="bg-subway-red text-white px-1.5 py-0.5 text-[7px] font-black uppercase flex-shrink-0 animate-pulse border border-ink shadow-[1px_1px_0px_#1A1A1B] rounded-3xs">
                                URGENT Priority
                              </span>
                            )}
                          </div>
                          <h3 className={cn(
                            "font-black font-sans leading-tight uppercase text-ink text-[11px] md:text-[11.5px] tracking-tight mt-1", 
                            isUrgent && "tracking-wide text-[11.5px] md:text-[12.5px]",
                            isDone && "line-through text-ink/45"
                          )}>
                            {task.title}
                          </h3>
                        </div>

                        {task.description && task.description.length > 60 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandDescription(task.id, e);
                            }}
                            className="inline-flex items-center justify-center border-2 border-ink bg-paper hover:bg-paper-dark text-ink p-1 shadow-[1.5px_1.5px_0px_#1A1A1B] active:shadow-none transition-all rounded-xs cursor-pointer flex-shrink-0"
                            title={expandedDescriptions[task.id] ? "Collapse Description" : "Expand Description"}
                          >
                            {expandedDescriptions[task.id] ? <ChevronUp size={10} strokeWidth={3.5} /> : <ChevronDown size={10} strokeWidth={3.5} />}
                          </button>
                        )}
                      </div>
                      
                      {task.description && (
                        (() => {
                          const isLong = task.description.length > 60;
                          const isExpanded = !!expandedDescriptions[task.id];
                          const displayText = isLong && !isExpanded 
                            ? `${task.description.slice(0, 55)}...` 
                            : task.description;

                          return (
                            <p className="text-[10px] md:text-[11px] font-mono font-bold uppercase opacity-65 mt-2 pl-2.5 border-l-2 border-ink/35 leading-relaxed max-w-full italic break-words">
                              {displayText}
                            </p>
                          );
                        })()
                      )}

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {task.tags.map(tag => (
                            <span key={tag} className="font-mono text-[8.5px] font-black uppercase bg-ink text-paper px-1.5 py-0.5 rounded-xs border border-ink">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {task.recurring && task.recurring !== 'none' && (
                        <div className="flex items-center gap-1.5 mt-2.5 text-[9px] font-mono font-black text-[#EF4444] uppercase tracking-wider bg-[#EF4444]/15 border border-[#EF4444]/30 px-1.5 py-0.5 rounded-sm w-fit">
                          <span className="text-[8px]">🔁</span>
                          <span>
                            {task.recurring === 'custom' && task.recurrenceRule ? (
                              `custom-freq: ${task.recurrenceRule.frequency} (int: ${task.recurrenceRule.interval})`
                            ) : (
                              `freq: ${task.recurring}`
                            )}
                          </span>
                        </div>
                      )}
                      
                      {task.deadline && (
                        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-ink/10 pl-1">
                          <span className="font-mono text-[9px] font-black flex items-center gap-1 text-ink/75">
                            ⏱ DEADLINE:{' '}
                            {(() => {
                              const start = new Date(task.deadline);
                              if (task.endTime) {
                                const end = new Date(task.endTime);
                                if (isSameDay(start, end)) {
                                  return `${format(start, 'MMM dd, hh:mm a')} — ${format(end, 'hh:mm a')}`;
                                } else {
                                  return `${format(start, 'MMM dd, hh:mm a')} — ${format(end, 'MMM dd, hh:mm a')}`;
                                }
                              } else {
                                return format(start, 'MMM dd, hh:mm a');
                              }
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        })}

          {docketItems.length === 0 && (
            <div className="text-center py-8 border border-dashed border-ink font-serif italic select-none">
              All routes cleared. The agenda is clear. Time for a coffee.
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Dashboard Widgets */}
      <div className="md:col-span-5 space-y-6">
        
        {/* Subway Momentum */}
        <div className="border-[6px] border-ink p-4 relative overflow-hidden bg-[#FCFAF5] rounded-sm shadow-[4px_4px_0px_#1A1A1B]">
          {/* Subtle watermark */}
          <div className="absolute top-1.5 right-2 p-1 font-mono text-3xl text-ink font-black opacity-[0.06] select-none">{progressPercent}%</div>
          
          <div className="flex justify-between items-start border-b-2 border-ink pb-2.5 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <h2 className="font-sans font-black uppercase tracking-tight text-md flex items-center gap-1.5">
                  SUBWAY MOMENTUM
                </h2>
              </div>
              <p className="font-mono text-[8px] font-bold uppercase text-ink-light tracking-wider mt-0.5">Unified Docket & Habit Dispatch Monitor</p>
            </div>
            {/* Visual Digital Display */}
            <div className="flex flex-col items-end gap-1.5">
              <span className="font-mono text-[11px] font-black text-ink-light bg-ink/5 px-1.5 py-0.5 rounded leading-none select-none">
                {completedDailyItems} / {totalDailyItems} STOPS
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {combinedStreak > 0 ? (
                  <span className="font-mono text-[8.5px] font-black text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none animate-pulse">
                    🔥 STREAK: {combinedStreak}D
                  </span>
                ) : (
                  <span className="font-mono text-[8px] font-black text-ink/30 bg-ink/5 px-1.5 py-0.5 rounded select-none">
                    💤 NO STREAK
                  </span>
                )}
                <span className="font-mono text-[7px] text-[#22C55E] font-black tracking-widest uppercase select-none animate-pulse">
                  {progressPercent}% EFFICIENT
                </span>
              </div>
            </div>
          </div>

          {/* Unified Dispatch Linear Map */}
          {totalDailyItems > 0 ? (
            <div className="relative pt-6 pb-2.5 px-2 mt-2">
              {/* Railroad background line tie indicators */}
              <div className="absolute inset-x-2 h-[5px] bg-ink/10 top-8 rounded-full pointer-events-none" />
              {/* Railroad active route neon track */}
              <div 
                className="absolute left-2 h-[5px] bg-[#EF4444] top-8 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `calc(${progressPercent}% - 4px)` }}
              />

              {/* Station pointers dynamically rendered along the route */}
              <div className="relative flex justify-between items-center gap-1">
                {(() => {
                  const items = [
                    ...todayOccurrences.map(task => ({
                      id: task.id,
                      name: task.title,
                      isDone: task.status === 'done',
                      type: 'task',
                      icon: '📋'
                    })),
                    ...todayHabits.map(habit => ({
                      id: habit.id,
                      name: habit.name,
                      isDone: !!habit.history?.[todayStr],
                      type: 'habit',
                      icon: habit.icon || '📍'
                    }))
                  ];

                  // Limit displays if we have way too many stations to preserve UI spacing
                  const visibleItems = items.slice(0, 5);
                  
                  return visibleItems.map((item, index) => {
                    const isCompleted = item.isDone;
                    return (
                      <div key={item.id} className="flex flex-col items-center flex-1 max-w-[80px]" title={`${item.type.toUpperCase()}: ${item.name}`}>
                        {/* Mechanical Station Bullet Node */}
                        <div 
                          className={cn(
                            "w-4 h-4 rounded-full border-2 border-ink flex items-center justify-center bg-paper z-10 transition-all duration-300",
                            isCompleted ? "scale-110 shadow-sm border-[#10B981] bg-[#10B981]" : "hover:border-subway-red"
                          )}
                          style={isCompleted ? { backgroundColor: '#10B981' } : undefined}
                        >
                          {isCompleted ? (
                            <Check size={9} strokeWidth={5} className="text-white" />
                          ) : (
                            <span className="font-mono text-[6px] font-bold text-ink-light">{index + 1}</span>
                          )}
                        </div>
                        {/* Sub label name */}
                        <span className="font-sans font-black text-[7px] text-ink/80 text-center truncate w-full mt-2 uppercase tracking-tight leading-none">
                          {item.name}
                        </span>
                        <span className="font-mono text-[5.5px] text-ink-light/70 uppercase mt-0.5 leading-none">
                          {item.icon} {item.type}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Transit tracker message */}
              <div className="flex justify-between items-center mt-6 pt-3 border-t border-dashed border-ink/15 font-mono text-[8.5px] font-black uppercase tracking-wider text-ink-light">
                <span className="flex items-center gap-1">
                  <Gauge size={10} className="text-ink-light" strokeWidth={2.5} />
                  LINE: LOCAL-8 EXPRESS
                </span>
                <span className="flex items-center gap-1 font-sans font-black text-ink select-none">
                  <Flame size={11} className={cn("inline shrink-0", combinedStreak > 0 ? "text-subway-red animate-pulse" : "text-ink/20")} />
                  STREAK: {combinedStreak}D
                </span>
                <span>{progressPercent}% ARRIVED</span>
              </div>
            </div>
          ) : (
            <div className="py-6 border border-dashed border-ink/20 bg-paper-dark/15 text-center px-4 rounded">
              <p className="font-serif italic text-xs text-ink/50">No dispatches scheduled on active route lines today.</p>
              <p className="font-mono text-[7.5px] text-ink-light uppercase mt-1.5 font-bold tracking-widest">STATIONS ARE OPEN & AWAITING COMMUTE SCHEDULING</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Habit Chain */}
          <div className="border-[6px] border-ink bg-paper p-4 flex flex-col justify-between min-h-[260px] vintage-shadow rounded-sm relative">
            <div className="absolute top-1.5 right-2 font-mono text-[7px] opacity-35 font-black uppercase tracking-widest hidden sm:block">SYS: MONITOR_V2</div>
            <div>
              <div className="flex justify-between items-center border-b-2 border-ink pb-1.5 mb-3">
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setIsHabitWidgetExpanded(true)}
                    className="cursor-pointer hover:scale-110 active:scale-95 transition-all outline-none"
                    title="Click to expand Subway Terminal Console"
                  >
                    <SubwayTransitIcon size={30} />
                  </button>
                  <div 
                    onClick={() => setIsHabitWidgetExpanded(true)}
                    className="cursor-pointer group"
                    title="Click to expand Subway Terminal Console"
                  >
                    <h3 className="font-sans font-black uppercase text-xs tracking-tight text-ink leading-none group-hover:text-subway-red transition-colors flex items-center gap-1">
                      Habit Tracks
                      <span className="text-[6.5px] bg-subway-red/10 border border-subway-red/30 px-1 rounded-3xs text-subway-red font-bold font-mono tracking-widest uppercase animate-pulse">EXPAND</span>
                    </h3>
                    <p className="font-mono text-[7.5px] text-ink-light font-bold uppercase mt-0.5 tracking-wider">Subway Transit Network</p>
                  </div>
                </div>
                <button 
                  onClick={openCreateHabit}
                  className="bg-ink hover:bg-subway-red text-white p-1 rounded-sm border border-ink hover:scale-105 transition-all outline-none cursor-pointer flex items-center justify-center shadow-[1px_1px_0px_#1A1A1B]"
                  title="Add new habit route"
                >
                  <Plus size={11} strokeWidth={3} />
                </button>
              </div>

              {habits.length === 0 ? (
                <div className="py-8 text-center bg-paper-dark/20 border border-dashed border-ink/30 rounded-sm">
                  <p className="font-serif italic text-xs text-ink/50">No active tracks monitored.</p>
                  <button 
                    onClick={openCreateHabit}
                    className="mt-3 bg-taxi hover:bg-taxi/90 text-ink border-2 border-ink px-3 py-1 text-[9.5px] font-mono font-black uppercase rounded shadow-[1.5px_1.5px_0px_#1a1a1b] active:translate-y-0.5 active:shadow-[0px_0px_0px_#1a1a1b] transition-all cursor-pointer"
                  >
                    + Launch Track Route
                  </button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-0.5 custom-scrollbar">
                  {habits.map((habit) => {
                    const stats = getHabitStats(habit, today);
                    
                    return (
                      <div 
                        key={habit.id} 
                        className="relative bg-paper border-2 border-ink p-3 rounded shadow-[2.5px_2.5px_0px_#1A1A1B] flex flex-col gap-2.5 transition-all hover:-translate-y-0.5 hover:shadow-[3.5px_3.5px_0px_#1A1A1B] overflow-hidden"
                      >
                        {/* Custom visual route left-stripe accent representing the lines */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: habit.color || '#E11D48' }} />
                        
                        {/* Habit header info */}
                        <div className="pl-1.5 flex justify-between items-start gap-1">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Route Icon */}
                            <div 
                              className="w-6 h-6 rounded-full border border-ink flex items-center justify-center text-[11px] shrink-0 shadow-[1px_1px_0px_#1A1A1B] text-white"
                              style={{ backgroundColor: habit.color || '#E11D48' }}
                            >
                              <HabitIcon iconName={habit.icon || '📍'} size={11} className="shrink-0 text-white" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-sans font-black uppercase text-[10.5px] text-ink truncate leading-tight tracking-tight">
                                {habit.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                                <span className="font-mono text-[7px] font-black tracking-wider text-subway-red uppercase bg-subway-red/10 border border-subway-red/30 px-1 py-0.2 rounded-3xs">
                                  {habit.frequency || 'daily'}
                                </span>
                                {habit.hour !== undefined && (
                                  <span className="font-mono text-[7px] font-bold text-ink/60 bg-paper-dark border border-ink/15 px-1 py-0.2 rounded-3xs">
                                    ⏰ {String(habit.hour).padStart(2, '0')}:{String(habit.minute !== undefined ? habit.minute : 0).padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Streak Badge & Config */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span 
                              className="font-mono text-[8px] font-black bg-taxi border border-ink px-1.5 py-[2px] rounded-3xs select-none shadow-[1px_1px_0px_#1A1A1B] flex items-center gap-0.5 uppercase leading-none"
                              title="Current active streak"
                            >
                              🔥 {stats.currentStreak}d
                            </span>
                            <button
                              onClick={(e) => openEditHabit(habit, e)}
                              className="text-ink/50 hover:text-ink hover:scale-105 p-0.5 border border-transparent hover:border-ink hover:bg-paper-dark transition-all rounded-xs outline-none cursor-pointer"
                              title="Edit habit track"
                            >
                              <Settings size={10} strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>

                        {/* Beautifully stylized railway station node network */}
                        <div className="pl-1.5 mt-0.5">
                          <div className="bg-paper-dark/20 border border-ink/10 rounded-xs p-2.5">
                            <div className="flex justify-between items-center text-[7px] font-mono uppercase tracking-wider text-ink/40 font-black mb-2.5 leading-none">
                              <span>🛤️ LINE SCHEDULE STATUS</span>
                              <span className="text-subway-red flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-subway-red animate-ping" />
                                Terminal (Today)
                              </span>
                            </div>
                            
                            <div className="relative flex items-center justify-between px-2 h-7 mt-1">
                              {/* Background Railway line */}
                              <div className="absolute left-4 right-4 h-[4px] bg-ink/10 rounded-full" />
                              
                              {/* Filled active Railway line tracker */}
                              <div 
                                className="absolute left-4 h-[4px] rounded-full transition-all duration-300 pointer-events-none"
                                style={{ 
                                  backgroundColor: habit.color || '#E11D48',
                                  width: 'calc(100% - 32px)'
                                }} 
                              />

                              {daysOfWeekList.map((dayObj) => {
                                const isDone = !!habit.history?.[dayObj.dateStr];
                                const dayOfWeek = dayObj.rawDate.getDay();
                                const freq = habit.frequency || 'daily';
                                let isScheduled = true;
                                if (freq === 'weekdays') isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
                                else if (freq === 'weekends') isScheduled = dayOfWeek === 0 || dayOfWeek === 6;
                                else if (freq === 'weekly' || freq === 'custom') {
                                  if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
                                    isScheduled = habit.daysOfWeek.includes(dayOfWeek);
                                  }
                                }
                                const isToday = isSameDay(dayObj.rawDate, today);

                                return (
                                  <div key={dayObj.dateStr} className="flex flex-col items-center relative z-10 w-9">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (toggleHabitHistory && isScheduled) {
                                          toggleHabitHistory(habit.id, dayObj.dateStr);
                                        }
                                      }}
                                      disabled={!isScheduled}
                                      className={cn(
                                        "w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all cursor-pointer select-none relative",
                                        !isScheduled 
                                          ? "bg-ink/10 border-ink/20 opacity-40 cursor-not-allowed border-dashed overflow-hidden" 
                                          : isDone 
                                            ? "border-ink text-white scale-110 shadow-[1px_1px_1px_rgba(0,0,0,0.2)] hover:scale-125" 
                                            : "bg-paper border-ink hover:bg-paper-dark hover:scale-110 shadow-[0.5px_0.5px_0px_rgba(0,0,0,0.1)]",
                                        isToday && !isDone && "ring-2 ring-subway-red"
                                      )}
                                      style={isDone && isScheduled ? { backgroundColor: habit.color || '#E11D48' } : undefined}
                                      title={`${dayObj.dayLabel}: ${isDone ? 'COMPLETED' : !isScheduled ? 'BLOCKED - NOT SET' : 'PENDING'} (Click to toggle)`}
                                    >
                                      {isDone ? (
                                        <Check size={8} className="text-white shrink-0" strokeWidth={5} />
                                      ) : !isScheduled ? (
                                        <>
                                          <div className="absolute w-[1.5px] h-3 bg-ink/40 rotate-45" />
                                          <div className="absolute w-[1.5px] h-3 bg-ink/40 -rotate-45" />
                                        </>
                                      ) : (
                                        <div className="w-[4px] h-[4px] rounded-full bg-ink/30" />
                                      )}
                                    </button>
                                    <span className={cn(
                                      "font-mono text-[7px] font-black mt-1.5 uppercase tracking-wide select-none leading-none px-1 py-0.2 rounded-3xs",
                                      isToday 
                                        ? "bg-subway-red text-white border border-ink/30 shadow-[0.5px_0.5px_0px_rgba(0,0,0,0.2)]" 
                                        : "text-ink/40"
                                    )}>
                                      {dayObj.shortLabel}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Extra bottom metrics bar & Board Today Ticket Punch toggle */}
                        <div className="pl-1.5 flex items-center justify-between font-mono text-[7.5px] font-bold opacity-80 border-t border-ink/5 border-dashed pt-2 mt-1 gap-2">
                          <div className="flex items-center gap-2 text-ink/50 uppercase leading-none font-black">
                            <span>🔄 RATE: <strong className="text-ink font-mono">{stats.completionRate30}%</strong></span>
                            <span>🏆 TOTAL: <strong className="text-ink font-mono">{stats.totalCompletions}x</strong></span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (toggleHabitHistory) {
                                toggleHabitHistory(habit.id, todayStr);
                              }
                            }}
                            className={cn(
                              "font-mono text-[7px] font-black border border-ink/80 py-0.5 px-2 uppercase select-none transition-all active:translate-y-[0.5px] cursor-pointer shadow-[1px_1px_0px_#1A1A1B] active:shadow-none flex items-center gap-1 rounded-sm",
                              habit.history?.[todayStr] 
                                ? "bg-emerald-500 text-white border-white shadow-none scale-95" 
                                : "bg-taxi text-ink hover:bg-taxi/90"
                            )}
                          >
                            <span>🎟️</span>
                            <span>{habit.history?.[todayStr] ? 'RIDE APPROVED' : 'BOARD TODAY'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Focus Timer Mini */}
          <div className="border-[6px] border-ink bg-ink text-white p-3 text-center flex flex-col justify-center items-center">
            <div className="w-16 h-16 rounded-full border-4 border-taxi flex items-center justify-center bg-transparent mb-2 shadow-[2px_2px_0px_#F7C331]">
              <span className="font-mono font-black text-xl">{m}</span>
            </div>
            <span className="font-sans font-black uppercase tracking-tight text-xs">Min Focus</span>
            <span className="font-mono text-[9px] font-bold uppercase text-taxi mt-1">Session {isRunning ? 'Active' : 'Paused'}</span>
          </div>
        </div>

        {/* RETRO HABIT DISPATCH CONTROLLER MODAL */}
        {isHabitModalOpen && (
          <div className="fixed inset-0 bg-ink/75 z-50 flex items-center justify-center p-4 backdrop-blur-3xs select-none">
            <div className="w-full max-w-[420px] bg-paper border-[6px] border-ink p-6 relative shadow-[8px_8px_0px_#1A1A1B] animate-in fade-in zoom-in-95 duration-100 text-ink">
              {/* Close button */}
              <button 
                type="button"
                onClick={() => setIsHabitModalOpen(false)}
                className="absolute top-3 right-3 text-ink hover:scale-105 transition-all outline-none border-2 border-ink bg-paper p-0.5 rounded cursor-pointer"
              >
                <span className="text-xs font-black block w-3.5 h-3.5 leading-none">✕</span>
              </button>

              <h3 className="font-sans font-black uppercase text-lg border-b-4 border-ink pb-1 mb-4 leading-none">
                {editingHabit ? 'MODIFY ROUTE' : 'NEW HABIT TRACK'}
              </h3>

              <form onSubmit={handleHabitSubmit} className="space-y-4">
                {habitFormError && (
                  <div className="bg-subway-red/15 border-2 border-subway-red text-subway-red font-mono text-[10px] font-extrabold p-2 uppercase">
                    ⚠️ {habitFormError}
                  </div>
                )}

                {/* Habit Name input */}
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-black uppercase block text-ink/70">
                    TRACK ROUTE NAME
                  </label>
                  <input 
                    type="text" 
                    value={habitFormName}
                    onChange={(e) => {
                      setHabitFormName(e.target.value);
                      if (habitFormError) setHabitFormError('');
                    }}
                    placeholder="E.G. MORNING CODING ROUTINE"
                    className="w-full bg-paper border-[3px] border-ink p-2 font-mono text-xs font-black uppercase focus:bg-taxi/5 focus:ring-0 outline-none shadow-[2px_2px_0px_#1A1A1B]"
                  />
                </div>

                 {/* Icon Selection */}
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-black uppercase block text-ink/70">
                    ROUTE SYMBOL
                  </label>
                  <div className="grid grid-cols-6 gap-2 bg-paper-dark border-2 border-dashed border-ink/30 p-2 rounded">
                    {[
                      { id: 'dumbbell', desc: 'Workout' },
                      { id: 'book-open', desc: 'Reading' },
                      { id: 'brain', desc: 'Mind/Zen' },
                      { id: 'droplet', desc: 'Hydrate' },
                      { id: 'apple', desc: 'Health/Diet' },
                      { id: 'coffee', desc: 'Coffee/Morning' },
                      { id: 'laptop', desc: 'Coding/Work' },
                      { id: 'pen-tool', desc: 'Journaling' },
                      { id: 'moon', desc: 'Rest/Sleep' },
                      { id: 'key', desc: 'Core Habit' },
                      { id: 'brush', desc: 'Chore/Clean' },
                      { id: 'music', desc: 'Music/Hobby' }
                    ].map((item) => {
                      const isSelected = habitFormIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setHabitFormIcon(item.id)}
                          className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-full border-2 transition-all cursor-pointer hover:scale-110",
                            isSelected 
                              ? "bg-taxi border-ink scale-110 shadow-[2px_2px_0px_#1a1a1b]" 
                              : "bg-paper border-ink/35 text-ink/70 hover:border-ink hover:text-ink shadow-[1px_1px_0px_rgba(0,0,0,0.1)]"
                          )}
                          title={item.desc}
                        >
                          <HabitIcon iconName={item.id} size={15} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Habit Custom Color selection */}
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-black uppercase block text-ink/70">
                    TRACK LINE COLOR
                  </label>
                  <div className="grid grid-cols-6 gap-2 bg-paper-dark border-2 border-dashed border-ink/30 p-2 rounded">
                    {[
                      { hex: '#E11D48', name: 'RED' },
                      { hex: '#2563EB', name: 'BLUE' },
                      { hex: '#F59E0B', name: 'TAXI' },
                      { hex: '#10B981', name: 'GREEN' },
                      { hex: '#0D9488', name: 'TEAL' },
                      { hex: '#7C3AED', name: 'VIOL' },
                    ].map((colorObj) => (
                      <button
                        key={colorObj.hex}
                        type="button"
                        onClick={() => setHabitFormColor(colorObj.hex)}
                        className={cn(
                          "w-9 h-9 rounded-full border-2 transition-all cursor-pointer hover:scale-110 relative flex items-center justify-center",
                          habitFormColor === colorObj.hex 
                            ? "border-ink border-[3px] scale-105 shadow-[2px_2px_0px_#1A1A1B]" 
                            : "border-black/20"
                        )}
                        style={{ backgroundColor: colorObj.hex }}
                      >
                        {habitFormColor === colorObj.hex && (
                          <Check size={12} strokeWidth={4} className="text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] font-black uppercase block text-ink/70">
                      SET DISPATCH HOUR
                    </label>
                    <select
                      value={habitFormHour}
                      onChange={(e) => setHabitFormHour(parseInt(e.target.value, 10))}
                      className="w-full bg-paper border-[3px] border-ink p-1.5 font-mono text-xs font-black uppercase outline-none shadow-[2px_2px_0px_#1A1A1B]"
                    >
                      {Array.from({ length: 24 }).map((_, h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')}:00 ({h >= 12 ? 'PM' : 'AM'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-[10px] font-black uppercase block text-ink/70">
                      DISPATCH MINUTE
                    </label>
                    <select
                      value={habitFormMinute}
                      onChange={(e) => setHabitFormMinute(parseInt(e.target.value, 10))}
                      className="w-full bg-paper border-[3px] border-ink p-1.5 font-mono text-xs font-black uppercase outline-none shadow-[2px_2px_0px_#1A1A1B]"
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, '0')} MINS
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tracker Frequency */}
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-black uppercase block text-ink/70">
                    TRACK FREQUENCY
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { value: 'daily', label: 'DAILY' },
                      { value: 'weekdays', label: 'W-DAYS' },
                      { value: 'weekends', label: 'W-ENDS' },
                      { value: 'weekly', label: 'WEEKLY' },
                      { value: 'custom', label: 'CUSTOM' }
                    ].map((freqObj) => (
                      <button
                        key={freqObj.value}
                        type="button"
                        onClick={() => setHabitFormFrequency(freqObj.value as any)}
                        className={cn(
                          "font-mono text-[8px] font-bold py-1 px-1 border-2 transition-all cursor-pointer text-center",
                          habitFormFrequency === freqObj.value 
                            ? "bg-ink text-white border-ink rounded-xs shadow-[1.5px_1.5px_0px_#1A1A1B]" 
                            : "bg-paper text-ink border-ink/40"
                        )}
                      >
                        {freqObj.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Days of Week Selector */}
                {(habitFormFrequency === 'custom' || habitFormFrequency === 'weekly') && (
                  <div className="space-y-1.5 p-2 bg-paper-dark border-2 border-ink border-dashed">
                    <label className="font-mono text-[9px] font-black uppercase block text-ink/70">
                      CHOOSE DAYS TO RUN ROUTE
                    </label>
                    <div className="flex justify-between items-center px-1">
                      {[
                        { index: 1, label: 'M' },
                        { index: 2, label: 'T' },
                        { index: 3, label: 'W' },
                        { index: 4, label: 'T' },
                        { index: 5, label: 'F' },
                        { index: 6, label: 'S' },
                        { index: 0, label: 'S' },
                      ].map((dayObj) => {
                        const isSelected = habitFormDaysOfWeek.includes(dayObj.index);
                        return (
                          <button
                            key={dayObj.index}
                            type="button"
                            onClick={() => toggleDayOfWeekSelection(dayObj.index)}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center font-mono text-[9px] font-black cursor-pointer transition-all hover:scale-105",
                              isSelected
                                ? "bg-emerald-500 border-ink text-white shadow-[1px_1px_0px_#1A1A1B] font-extrabold"
                                : "bg-paper border-ink/40 text-ink/50"
                            )}
                            style={isSelected ? { backgroundColor: habitFormColor } : undefined}
                          >
                            {dayObj.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-2">
                  {editingHabit && (
                    <button
                      type="button"
                      onClick={(e) => handleHabitDelete(editingHabit.id, e)}
                      className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border-[3px] border-ink py-2 font-mono text-[11px] font-extrabold uppercase rounded shadow-[3px_3px_0px_#1A1A1B] active:translate-y-0.5 active:shadow-[1px_1px_0px_#1A1A1B] transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} strokeWidth={3} /> Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-2 bg-taxi hover:bg-taxi/95 text-ink border-[3px] border-ink py-2 font-mono text-[11px] font-extrabold uppercase rounded shadow-[3px_3px_0px_#1A1A1B] active:translate-y-0.5 active:shadow-[1px_1px_0px_#1A1A1B] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check size={12} strokeWidth={3} /> {editingHabit ? 'APPLY' : 'ACTIVATE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* EXPANDED SUBWAY TRANSIT INFORMATION TERMINAL BOARD */}
        {isHabitWidgetExpanded && (
          <div className="fixed inset-0 bg-[#F4F1EA] z-50 overflow-y-auto overflow-x-hidden p-4 md:p-8 flex flex-col gap-6 font-sans text-ink border-[8px] md:border-[12px] border-ink animate-in fade-in zoom-in-95 duration-200 select-none">
            {/* Control Board Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b-[6px] border-ink pb-5">
              <div className="flex items-center gap-3">
                {/* Mechanical Pulsing Signal lights */}
                <div className="flex gap-1.5 shrink-0 bg-ink p-1.5 rounded border-2 border-ink-light/20">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse border border-emerald-300" />
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-[pulse_1.5s_infinite] border border-amber-300" />
                  <div className="w-3.5 h-3.5 rounded-full bg-subway-red border border-red-300" />
                </div>
                <div>
                  <h2 className="font-sans font-black uppercase text-xl md:text-2xl tracking-tight leading-none flex items-center gap-2">
                    SUBWAY METRO DISPATCH CONSOLE
                  </h2>
                  <p className="font-mono text-[9px] md:text-[10px] text-ink-light font-black uppercase tracking-wider mt-1 flex items-center gap-1.5">
                    <Activity size={12} className="text-subway-red animate-pulse" />
                    LIVE NETWORK OPERATIONS MONITOR & TICKETING PANEL
                  </p>
                </div>
              </div>

              {/* Quick Operation Metrics banner */}
              <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] font-black">
                <div className="bg-ink text-paper border border-ink px-2.5 py-1 rounded shadow-[1.5px_1.5px_0px_#1A1A1B] uppercase whitespace-nowrap">
                  🚃 ACTIVE LINES: {habits.length}
                </div>
                <div className="bg-emerald-500 text-white border border-ink px-2.5 py-1 rounded shadow-[1.5px_1.5px_0px_#1A1A1B] uppercase whitespace-nowrap">
                  🎫 APPROVED TODAY: {habits.filter(h => h.history?.[todayStr]).length}/{habits.length}
                </div>
                {/* Close Overlay btn */}
                <button
                  type="button"
                  onClick={() => setIsHabitWidgetExpanded(false)}
                  className="bg-subway-red hover:bg-subway-red/90 text-white border-2 border-ink px-4 py-1.5 text-[10px] font-mono font-black uppercase rounded shadow-[2.5px_2.5px_0px_#1A1A1B] hover:translate-y-[-0.5px] active:translate-y-[0.5px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 ml-0 lg:ml-4 select-none"
                >
                  <X size={11} strokeWidth={3} /> CLOSE PANEL
                </button>
              </div>
            </div>

            {/* Retro Analog Control Gauges Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Gauge A: Overall completion success rate */}
              <div className="border-4 border-ink bg-paper p-3.5 rounded shadow-[3px_3px_0px_#1A1A1B] relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-1 right-2 text-[6.5px] font-mono font-black text-ink-light opacity-30 select-none">METER_R1</div>
                <div>
                  <span className="font-mono text-[8px] font-black text-ink-light uppercase tracking-wider block">ROUTE COMPLETION RATE</span>
                  <div className="flex items-baseline mt-2 gap-1.5">
                    <span className="font-sans font-black text-2xl leading-none">
                      {habits.length > 0 
                        ? Math.round(habits.reduce((sum, h) => sum + getHabitStats(h, today).completionRate30, 0) / habits.length)
                        : 0
                      }%
                    </span>
                    <span className="font-mono text-[8.5px] text-emerald-600 font-extrabold font-black">▲ OPTIMAL FLOW</span>
                  </div>
                  {/* Miniature railway style bar meter */}
                  <div className="relative border-2 border-ink bg-paper-dark h-3 shadow-[1px_1px_0px_#1A1A1B] mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ 
                        width: `${habits.length > 0 
                          ? Math.round(habits.reduce((sum, h) => sum + getHabitStats(h, today).completionRate30, 0) / habits.length)
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
                <p className="font-sans text-[8px] text-ink-light/80 mt-2 font-bold uppercase">Average performance efficiency across all running routes in past 30 days.</p>
              </div>

              {/* Gauge B: Total ticket punch actions */}
              <div className="border-4 border-ink bg-paper p-3.5 rounded shadow-[3px_3px_0px_#1A1A1B] relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-1 right-2 text-[6.5px] font-mono font-black text-ink-light opacity-30 select-none">METER_R2</div>
                <div>
                  <span className="font-mono text-[8px] font-black text-ink-light uppercase tracking-wider block">CONSECUTIVE NETWORK STREAK</span>
                  <div className="flex items-baseline mt-2 gap-1.5">
                    <span className="font-sans font-black text-2xl leading-none flex items-center gap-1 text-subway-red">
                      🔥 {habits.length > 0 
                        ? Math.max(...habits.map(h => getHabitStats(h, today).currentStreak))
                        : 0
                      }d
                    </span>
                    <span className="font-mono text-[8.5px] text-subway-red font-black uppercase animate-pulse">● PEAK COMMUTE</span>
                  </div>
                  <div className="relative border-2 border-ink bg-paper-dark h-3 shadow-[1px_1px_0px_#1A1A1B] mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-subway-red transition-all duration-500"
                      style={{ 
                        width: `${Math.min((habits.length > 0 ? Math.max(...habits.map(h => getHabitStats(h, today).currentStreak)) : 0) * 10, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                <p className="font-sans text-[8px] text-ink-light/80 mt-2 font-bold uppercase">The longest active streak of continuous daily habit completions currently on file.</p>
              </div>

              {/* Gauge C: Central Dispatch News */}
              <div className="border-4 border-ink bg-[#1A1A1B] text-paper p-3.5 rounded shadow-[3px_3px_0px_#1A1A1B] relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[8px] font-black text-taxi uppercase tracking-wider block">DISPATCH CONTROLLER MESSAGE</span>
                  <div className="font-serif italic text-xs text-[#FCFAF5]/90 mt-2 leading-relaxed">
                    "ALL SYSTEMS GREEN. ENSURE PROMPT TICKET APPROVAL AT EACH TERMINAL TO AVOID TIMELINE ROUTE DERAILMENT."
                  </div>
                </div>
                <div className="font-mono text-[7px] text-white/50 uppercase mt-2 font-black tracking-widest flex justify-between">
                  <span>SYSTEM_CODE: OK/74</span>
                  <span className="animate-pulse text-emerald-400">● LIVE CONNECTION</span>
                </div>
              </div>
            </div>

            {/* Core Lines monitoring section */}
            <div className="flex-1 border-[6px] border-ink bg-paper-dark/30 p-4 md:p-6 rounded-sm min-h-[400px]">
              <div className="flex justify-between items-center border-b-2 border-ink pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛤️</span>
                  <div>
                    <h3 className="font-sans font-black uppercase text-base tracking-tight text-ink leading-none">ACTIVE ROUTE LINES</h3>
                    <p className="font-mono text-[8px] text-ink-light font-bold uppercase mt-1 tracking-wider">MANAGE, ARCHIVE OR DECOMMISSION TRACK CONFIGURATIONS</p>
                  </div>
                </div>
                <button 
                  onClick={openCreateHabit}
                  className="bg-ink hover:bg-subway-red text-white py-1 md:py-1.5 px-3 rounded-sm border-2 border-ink hover:scale-105 transition-all outline-none cursor-pointer flex items-center gap-2 shadow-[2px_2px_0px_#1A1A1B] text-[10px] font-mono font-black uppercase"
                  title="Add new habit route"
                >
                  <Plus size={11} strokeWidth={3} /> NEW LINE
                </button>
              </div>

              {habits.length === 0 ? (
                <div className="py-20 text-center bg-paper border border-dashed border-ink/30 rounded shadow-[4px_4px_0px_#1A1A1B]">
                  <p className="font-serif italic text-sm text-ink/50">No active transit route networks created.</p>
                  <button 
                    onClick={openCreateHabit}
                    className="mt-4 bg-taxi hover:bg-taxi/90 text-ink border-2 border-ink px-4 py-2 text-[10.5px] font-mono font-black uppercase rounded shadow-[2.5px_2.5px_0px_#1a1b1b] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                  >
                    + CREATE NEW TRACK ROUTE
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {habits.map((habit) => {
                    const stats = getHabitStats(habit, today);
                    
                    return (
                      <div 
                        key={habit.id} 
                        className="relative bg-paper border-[4px] border-ink p-4 md:p-5 rounded shadow-[4px_4px_0px_#1A1A1B] flex flex-col gap-4 overflow-hidden animate-in fade-in duration-350"
                      >
                        {/* Custom visual route left-sticker accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-2.5" style={{ backgroundColor: habit.color || '#E11D48' }} />

                        {/* Top Line Info */}
                        <div className="pl-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b-2 border-dashed border-ink/15 pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Route Icon */}
                            <div 
                              className="w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1A1A1B] text-white"
                              style={{ backgroundColor: habit.color || '#E11D48' }}
                            >
                              <HabitIcon iconName={habit.icon || '📍'} size={14} className="text-white shrink-0" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-sans font-black uppercase text-sm text-ink truncate tracking-tight leading-none">
                                {habit.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-1.5 leading-none">
                                <span className="font-mono text-[7.5px] font-black tracking-wider text-subway-red uppercase bg-subway-red/10 border border-subway-red/30 px-1.5 py-0.5 rounded-3xs">
                                  {habit.frequency || 'daily'}
                                </span>
                                {habit.hour !== undefined && (
                                  <span className="font-mono text-[7.5px] font-bold text-ink/65 bg-paper-dark border border-ink/15 px-1.5 py-0.5 rounded-3xs font-black">
                                    ⏰ SCHEDULED CHRONO: {String(habit.hour).padStart(2, '0')}:{String(habit.minute !== undefined ? habit.minute : 0).padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Streak Display info */}
                          <div className="flex items-center gap-2 shrink-0 select-none">
                            <span className="font-mono text-[9px] font-black bg-taxi border-2 border-ink px-2.5 py-1 rounded shadow-[2px_2px_0px_#1A1A1B] uppercase flex items-center gap-1 leading-none">
                              🔥 Streak {stats.currentStreak} Days
                            </span>
                          </div>
                        </div>

                        {/* Mid Station Nodes tracker */}
                        <div className="pl-3 py-1">
                          <span className="font-mono text-[8px] font-black text-ink-light uppercase block mb-3 tracking-wider">
                            🚉 RAILROAD STATION STOPS (CLICK STATION DOTS TO COMPLETE/REVERT SESSIONS)
                          </span>
                          <div className="bg-[#FCFAF5] border border-ink/10 rounded p-4 relative">
                            {/* Custom railroad line background */}
                            <div className="absolute left-6 right-6 h-[4.5px] top-[42px] bg-ink/10 rounded-full" />
                            <div 
                              className="absolute left-6 h-[4.5px] top-[42px] rounded-full transition-all duration-300" 
                              style={{ 
                                backgroundColor: habit.color || '#E11D48',
                                width: 'calc(100% - 48px)'
                              }}
                            />

                            <div className="flex justify-between items-center px-2 relative z-10 gap-2 overflow-x-auto scrollbar-none">
                              {daysOfWeekList.map((dayObj) => {
                                const isDone = !!habit.history?.[dayObj.dateStr];
                                const dayOfWeek = dayObj.rawDate.getDay();
                                const freq = habit.frequency || 'daily';
                                let isScheduled = true;
                                if (freq === 'weekdays') isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
                                else if (freq === 'weekends') isScheduled = dayOfWeek === 0 || dayOfWeek === 6;
                                else if (freq === 'weekly' || freq === 'custom') {
                                  if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
                                    isScheduled = habit.daysOfWeek.includes(dayOfWeek);
                                  }
                                }
                                const isToday = isSameDay(dayObj.rawDate, today);

                                return (
                                  <div key={dayObj.dateStr} className="flex flex-col items-center min-w-[32px] cursor-pointer">
                                    <span className="font-mono text-[7px] text-ink-light/50 uppercase font-black tracking-widest leading-none mb-1.5">
                                      {dayObj.shortLabel}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (toggleHabitHistory && isScheduled) {
                                          toggleHabitHistory(habit.id, dayObj.dateStr);
                                        }
                                      }}
                                      disabled={!isScheduled}
                                      className={cn(
                                        "w-[22px] h-[22px] rounded-full border-2 border-ink flex items-center justify-center transition-all cursor-pointer select-none relative shadow-[1px_1px_0px_rgba(0,0,0,0.15)]",
                                        !isScheduled 
                                          ? "bg-ink/10 border-ink/15 opacity-30 cursor-not-allowed border-dashed" 
                                          : isDone 
                                            ? "text-white scale-110 shadow-md hover:scale-120 active:scale-95" 
                                            : "bg-paper hover:bg-paper-dark hover:scale-110 hover:shadow-xs",
                                        isToday && !isDone && "ring-4 ring-subway-red/30 animate-pulse border-subway-red"
                                      )}
                                      style={isDone && isScheduled ? { backgroundColor: habit.color || '#E11D48' } : undefined}
                                      title={`${dayObj.dayLabel}: ${isDone ? 'COMPLETED' : 'PENDING'}`}
                                    >
                                      {isDone ? (
                                        <Check size={10} className="text-white shrink-0" strokeWidth={5} />
                                      ) : !isScheduled ? (
                                        <span className="text-[7px] font-black opacity-30">❌</span>
                                      ) : (
                                        <div className="w-[5px] h-[5px] rounded-full bg-ink/30" />
                                      )}
                                    </button>
                                    <span className="font-sans font-black text-[6.5px] text-ink-light leading-none uppercase mt-1.5 tracking-tighter">
                                      {dayObj.dayLabel.slice(0, 3)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Route performance stats & Dispatch toolbar button approvals */}
                        <div className="pl-3 border-t border-ink/10 border-dashed pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex flex-wrap gap-2 font-mono text-[8px] font-black text-ink-light">
                            <span className="bg-ink/5 px-2 py-0.5 rounded font-black uppercase">📊 Line Efficiency: <strong className="text-ink font-mono">{stats.completionRate30}%</strong></span>
                            <span className="bg-ink/5 px-2 py-0.5 rounded font-black uppercase">🏆 Total Trips: <strong className="text-ink font-mono">{stats.totalCompletions} Trips</strong></span>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {/* Edit dispatcher settings */}
                            <button
                              type="button"
                              onClick={(e) => openEditHabit(habit, e)}
                              className="bg-paper hover:bg-paper-dark text-ink border-2 border-ink py-1 px-2.5 text-[8.5px] font-mono font-black uppercase rounded shadow-[1.5px_1.5px_0px_#1A1A1B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1 hover:-translate-y-0.5 whitespace-nowrap"
                              title="Modify dispatch properties"
                            >
                              <Settings size={10} strokeWidth={3} /> ADJUST SETTINGS
                            </button>

                            {/* Ticket punch status today toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                if (toggleHabitHistory) {
                                  toggleHabitHistory(habit.id, todayStr);
                                }
                              }}
                              className={cn(
                                "py-1 px-3 text-[8.5px] font-mono font-black uppercase rounded shadow-[1.5px_1.5px_0px_#1A1A1B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-1 hover:-translate-y-0.5 whitespace-nowrap",
                                habit.history?.[todayStr]
                                  ? "bg-emerald-500 text-white border-2 border-white shadow-none"
                                  : "bg-taxi text-ink border-2 border-ink hover:bg-taxi/90"
                              )}
                            >
                              <span>🎫</span>
                              <span>{habit.history?.[todayStr] ? 'TICKET APPROVED' : 'BOARD ROUTE TODAY'}</span>
                            </button>

                            {/* Decommission route tracks */}
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm("Are you sure you want to decommission this transit route? This will derail all recorded history.")) {
                                  if (deleteHabit) {
                                    await deleteHabit(habit.id);
                                  }
                                }
                              }}
                              className="bg-subway-red/10 text-subway-red hover:bg-subway-red hover:text-white border-2 border-subway-red py-1 px-2 text-[8.5px] font-mono font-black uppercase rounded shadow-[1.5px_1.5px_0px_rgba(225,29,72,0.15)] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center shrink-0"
                              title="Decommission track from list"
                            >
                              <Trash2 size={10} strokeWidth={3} />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom operations manual bar */}
            <div className="bg-ink text-[#FCFAF5]/80 py-2 px-4 rounded-sm flex flex-col md:flex-row justify-between items-center gap-2 text-[8.5px] font-mono font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-emerald-300" />
                CENTRAL CONTROL SERVER: OPERATIONAL
              </span>
              <span className="opacity-60 hidden md:inline">SYSTEM CONTEXT: {format(today, 'yyyy-MM-dd')} IST</span>
              <span className="text-taxi">EXIT SCREEN TO VIEW DASHBOARD</span>
            </div>
          </div>
        )}

        {/* Quote Block */}
        <div className="bg-[#1c1c1c] text-[#f4f1ea] p-4 font-serif">
           <h3 className="uppercase font-mono text-[10px] font-bold tracking-widest text-taxi mb-2">Daily Intelligence</h3>
           <blockquote className="text-xl italic font-bold">
             "New York is the only city in the world where you can get mowed down on the sidewalk by a pedestrian."
           </blockquote>
        </div>

      </div>

      {/* Column 3: Focus & Extras */}
      <div className="md:col-span-3 space-y-6">
        
        <NotesWidget />

      </div>
    </div>
  );
}
