import React, { useState, useEffect } from 'react';
import { Task, Habit, Birthday } from '../types';
import { format, isSameDay } from 'date-fns';
import { Play, Square, RotateCcw, Check, ChevronDown, ChevronUp, Gift, Plus, Trash2, Edit2, Sparkles, Award, Settings, Calendar, Clock, Flame } from 'lucide-react';
import { cn, toIST } from '../lib/utils';
import { getOccurrencesForDateRange } from '../lib/recurrence';
import { HabitIcon } from '../components/HabitIcon';

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
  const totalTasks = todayOccurrences.length || 1;
  const progressPercent = Math.round((completedTasks.length / totalTasks) * 100);

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
        <div className="border-[6px] border-ink p-4 relative overflow-hidden bg-paper">
          <div className="absolute top-0 right-0 p-2 font-mono text-4xl text-ink font-black opacity-10">{progressPercent}'</div>
          <h2 className="font-sans font-black uppercase tracking-tight text-xl mb-1 mt-1">Subway Momentum</h2>
          <p className="font-mono text-[10px] font-bold uppercase opacity-60 border-b border-ink pb-2 mb-4">Progress along the Local-8 Line</p>
          
          <div className="relative pt-6 pb-2">
            {/* The line */}
            <div className="absolute left-0 right-0 h-1 bg-ink top-8"></div>
            <div 
              className="absolute left-0 h-1 bg-subway-red top-8 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            ></div>
            
            {/* Stations */}
            <div className="relative flex justify-between">
              {[0, 25, 50, 75, 100].map(stop => (
                <div key={stop} className="flex flex-col items-center">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2 border-ink z-10",
                    progressPercent >= stop ? "bg-subway-red" : "bg-paper"
                  )}></div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between mt-4 font-mono text-[10px] uppercase font-bold tracking-widest text-ink-light">
              <span>Uptown</span>
              <span>{progressPercent}% Complete</span>
              <span>Downtown</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Habit Chain */}
          <div className="border-[6px] border-ink bg-paper p-4 flex flex-col justify-between min-h-[260px] vintage-shadow rounded-sm relative">
            <div className="absolute top-1.5 right-2 font-mono text-[7px] opacity-35 font-black uppercase tracking-widest hidden sm:block">SYS: MONITOR_V2</div>
            <div>
              <div className="flex justify-between items-center border-b-2 border-ink pb-1.5 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🚇</span>
                  <div>
                    <h3 className="font-sans font-black uppercase text-xs tracking-tight text-ink leading-none">Habit Tracks</h3>
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
        
        <div className="border-[6px] border-ink p-4 bg-paper shadow-[4px_4px_0px_#1A1A1B]">
          <h3 className="font-sans font-black uppercase tracking-tight text-lg border-b border-ink pb-2 mb-3">The Archive</h3>
          <ul className="space-y-4">
            <li>
              <div className="font-mono text-[10px] font-bold uppercase opacity-60">OCT 12, 1974</div>
              <h4 className="font-sans font-black uppercase text-sm mt-1">The Soho Loft Project</h4>
              <p className="font-mono font-bold uppercase text-[9px] mt-1 opacity-60 line-clamp-2">Discussed the new gallery space with Martha. The neighborhood is changing...</p>
            </li>
             <li>
              <div className="font-mono text-[10px] font-bold uppercase opacity-60">OCT 11, 1974</div>
              <h4 className="font-sans font-black uppercase text-sm mt-1">Rainy Morning Notes</h4>
              <p className="font-mono font-bold uppercase text-[9px] mt-1 opacity-60 line-clamp-2">Watching the yellow cabs splash through puddles from the fire escape.</p>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
