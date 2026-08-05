import React, { useState, useRef, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay, parse, getHours, getMinutes, addHours } from 'date-fns';
import { Task, Birthday, Habit, TimeTableEntry } from '../types';
import { cn, toIST } from '../lib/utils';
import { Clock, Tag, Briefcase, Plus, X, Calendar, Edit, Gift, Trash2, ChevronDown, ChevronLeft, ChevronRight, CalendarDays, Zap, Milestone, Gauge, Activity, Timer, GraduationCap } from 'lucide-react';
import { AnalogClockPicker } from '../components/AnalogClockPicker';
import { getOccurrencesForDateRange } from '../lib/recurrence';
import { SketchPushPin } from '../components/SketchPushPin';
import { HabitIcon } from '../components/HabitIcon';

interface WeeklyCalendarProps {
  tasks: Task[];
  habits?: Habit[];
  addTask: (task: Omit<Task, 'id'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string, deleteMode?: 'this' | 'following' | 'all') => void;
  updateTask?: (id: string, updatedFields: Partial<Omit<Task, 'id'>> & { updateMode?: 'this' | 'following' | 'all' }) => void;
  birthdays: Birthday[];
  onOpenBirthdays: () => void;
  timeTableEntries?: TimeTableEntry[];
  onOpenTimeTable?: () => void;
}

interface EventLayout {
  top: number;
  height: number;
  left: number; // percentage
  width: number; // percentage
}

function getEventLayouts(dayTasks: Task[], hourTops: number[], hourHeights: number[]): Record<string, EventLayout> {
  const layouts: Record<string, EventLayout> = {};
  if (dayTasks.length === 0) return layouts;

  // 1. Calculate top and height for each task
  const taskPositions = dayTasks.map(task => {
    const dateObj = new Date(task.deadline!);
    const startHour = getHours(dateObj);
    const startMinute = getMinutes(dateObj);
    const baseTop = hourTops[startHour] || 0;
    const startHourHeight = hourHeights[startHour] || 85;
    const top = baseTop + (startMinute / 60) * startHourHeight;

    let height = startHourHeight - 4; // default minimum is 1 hour minus spacing

    if (task.endTime) {
      const endDateObj = new Date(task.endTime);
      const endHour = getHours(endDateObj);
      const endMinute = getMinutes(endDateObj);
      const endBaseTop = hourTops[endHour] || 0;
      const endHourHeight = hourHeights[endHour] || 85;
      const endTop = endBaseTop + (endMinute / 60) * endHourHeight;

      if (endTop > top) {
        height = endTop - top - 4;
      }
    }
    const finalHeight = Math.max(height, 20);

    return {
      task,
      top,
      height: finalHeight,
      bottom: top + finalHeight
    };
  });

  // 2. Sort by 'top' (start position) ascending, then by duration descending (longer events first)
  taskPositions.sort((a, b) => {
    if (a.top !== b.top) {
      return a.top - b.top;
    }
    return (b.bottom - b.top) - (a.bottom - a.top);
  });

  // 3. Divide into overlapping clusters
  const clusters: typeof taskPositions[] = [];
  let currentCluster: typeof taskPositions = [];

  for (const pos of taskPositions) {
    if (currentCluster.length === 0) {
      currentCluster.push(pos);
    } else {
      const maxBottom = Math.max(...currentCluster.map(c => c.bottom));
      if (pos.top < maxBottom) {
        currentCluster.push(pos);
      } else {
        clusters.push(currentCluster);
        currentCluster = [pos];
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 4. For each cluster, assign columns side-by-side
  for (const cluster of clusters) {
    const columns: typeof taskPositions[] = [];

    for (const pos of cluster) {
      let placed = false;
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const lastInCol = columns[colIdx][columns[colIdx].length - 1];
        if (pos.top >= lastInCol.bottom) {
          columns[colIdx].push(pos);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([pos]);
      }
    }

    // 5. Compute left & width ratios for each item
    const totalColumns = columns.length;
    for (let colIdx = 0; colIdx < totalColumns; colIdx++) {
      for (const pos of columns[colIdx]) {
        const colWidth = 100 / totalColumns;
        const left = colIdx * colWidth;
        const rightSpaced = totalColumns === 1 ? 1.5 : 1;
        const width = colWidth - rightSpaced;

        layouts[pos.task.id] = {
          top: pos.top,
          height: pos.height,
          left: Math.max(0.5, left + 0.5),
          width: Math.max(10, width)
        };
      }
    }
  }

  return layouts;
}

function formatIndianTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = String(minute).padStart(2, '0');
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

function to12HourFrom24(hour24: number): { hour12: number; ampm: 'AM' | 'PM' } {
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, ampm };
}

function to24HourFrom12(hour12: number, ampm: 'AM' | 'PM'): number {
  let hr = hour12;
  if (ampm === 'PM' && hr !== 12) {
    hr += 12;
  } else if (ampm === 'AM' && hr === 12) {
    hr = 0;
  }
  return hr;
}

function formatTaskTimeRange(task: Task): string {
  if (!task.deadline) return 'ANY';
  const start = new Date(task.deadline);
  const startTimeStr = formatIndianTime(start.getHours(), start.getMinutes());
  if (task.endTime) {
    const end = new Date(task.endTime);
    const endTimeStr = formatIndianTime(end.getHours(), end.getMinutes());
    return `${startTimeStr} - ${endTimeStr}`;
  }
  return startTimeStr;
}

export function WeeklyCalendar({ 
  tasks, 
  habits = [], 
  addTask, 
  toggleTask, 
  deleteTask, 
  updateTask, 
  birthdays, 
  onOpenBirthdays,
  timeTableEntries = [],
  onOpenTimeTable
}: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(toIST(new Date()));
  const [activePopoverPinId, setActivePopoverPinId] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(currentDate);
  const [now, setNow] = useState(toIST(new Date()));
  const [isMinimizedView, setIsMinimizedView] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(toIST(new Date()));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activePopoverPinId) return;
    const handleGlobalClick = () => {
      setActivePopoverPinId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [activePopoverPinId]);

  // Time Section Pins Feature States & Type definitions
  interface TimePin {
    id: string;
    name: string;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    color: string;
  }

  const [timePins, setTimePins] = useState<TimePin[]>(() => {
    try {
      const saved = localStorage.getItem('daily_docket_time_pins2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('daily_docket_time_pins2', JSON.stringify(timePins));
  }, [timePins]);

  // Modal State for Time Pins
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    pinId?: string; // defined if editing
    defaultHour?: number; // prefill
  }>({ isOpen: false });

  const [isConfirmingPinDelete, setIsConfirmingPinDelete] = useState(false);

  useEffect(() => {
    if (!pinModal.isOpen) {
      setIsConfirmingPinDelete(false);
    }
  }, [pinModal.isOpen]);

  // Pin Form Fields
  const [pinFormName, setPinFormName] = useState('');
  const [pinFormStartHour, setPinFormStartHour] = useState(9);
  const [pinFormStartMinute, setPinFormStartMinute] = useState(0);
  const [pinFormEndHour, setPinFormEndHour] = useState(12);
  const [pinFormEndMinute, setPinFormEndMinute] = useState(0);
  const [pinFormColor, setPinFormColor] = useState('#F7C331');
  const [pinFormError, setPinFormError] = useState('');

  // Handlers for Pins modal
  const handleOpenCreatePin = (defaultHour?: number) => {
    setPinFormName('');
    const hr = typeof defaultHour === 'number' ? defaultHour : 9;
    setPinFormStartHour(hr);
    setPinFormStartMinute(0);
    setPinFormEndHour(Math.min(23, hr + 1));
    setPinFormEndMinute(30);
    setPinFormColor('#F7C331');
    setPinFormError('');
    setPinModal({ isOpen: true, defaultHour });
  };

  const handleOpenEditPin = (pin: TimePin) => {
    setPinFormName(pin.name);
    setPinFormStartHour(pin.startHour);
    setPinFormStartMinute(pin.startMinute);
    setPinFormEndHour(pin.endHour);
    setPinFormEndMinute(pin.endMinute);
    setPinFormColor(pin.color);
    setPinFormError('');
    setPinModal({ isOpen: true, pinId: pin.id });
  };

  const handleSavePin = () => {
    if (!pinFormName.trim()) {
      setPinFormError('PLEASE SPECIFY PIN LABEL NAME');
      return;
    }

    const startVal = pinFormStartHour * 60 + pinFormStartMinute;
    const endVal = pinFormEndHour * 60 + pinFormEndMinute;

    if (startVal >= endVal) {
      setPinFormError('END TIME MUST BE GREATER THAN START TIME');
      return;
    }

    if (pinModal.pinId) {
      // Edit mode
      setTimePins(prev => prev.map(p => p.id === pinModal.pinId ? {
        ...p,
        name: pinFormName.trim(),
        startHour: pinFormStartHour,
        startMinute: pinFormStartMinute,
        endHour: pinFormEndHour,
        endMinute: pinFormEndMinute,
        color: pinFormColor
      } : p));
    } else {
      // Create mode
      const newPin: TimePin = {
        id: Math.random().toString(36).substring(7),
        name: pinFormName.trim(),
        startHour: pinFormStartHour,
        startMinute: pinFormStartMinute,
        endHour: pinFormEndHour,
        endMinute: pinFormEndMinute,
        color: pinFormColor
      };
      setTimePins(prev => [...prev, newPin]);
    }

    setPinModal({ isOpen: false });
  };

  const handleDeletePin = (id: string) => {
    setTimePins(prev => prev.filter(p => p.id !== id));
    setPinModal({ isOpen: false });
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteMode, setDeleteMode] = useState<'this' | 'following' | 'all'>('this');
  const [isDeleteSelectorOpen, setIsDeleteSelectorOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setDeleteMode('this');
    setIsDeleteSelectorOpen(false);
    setIsConfirmingDelete(false);
  }, [selectedTask]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [prefilledValues, setPrefilledValues] = useState<{
    startDate: string;
    endDate: string;
    time: string;
    endTime: string;
  } | null>(null);

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingTask(null);
  };

  const handleCreateAtSlot = (dateStr: string, timeStr: string, endTimeStr: string) => {
    setPrefilledValues({
      startDate: dateStr,
      endDate: dateStr,
      time: timeStr,
      endTime: endTimeStr
    });
    setEditingTask(null);
    setIsDrawerOpen(true);
  };
  
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [currentDate]);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const expandedTasksForWeek = React.useMemo(() => {
    if (weekDays.length === 0) return [];
    return getOccurrencesForDateRange(tasks, weekDays[0], weekDays[6]);
  }, [tasks, weekDays]);

  const multiDayTasksForWeek = React.useMemo(() => {
    const seen = new Set<string>();
    return expandedTasksForWeek.filter(task => {
      if (!task.deadline || !task.endTime) return false;
      const baseId = task.id.split('::')[0];
      if (seen.has(baseId)) return false;

      const taskStart = new Date(task.deadline);
      const taskEnd = new Date(task.endTime);
      const isMulti = !isSameDay(taskStart, taskEnd) && taskEnd > taskStart;
      if (!isMulti) return false;

      const weekStart = weekDays[0];
      const weekEnd = weekDays[6];
      const startOfCurrentWeek = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
      const endOfCurrentWeek = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59);

      const inWeek = taskStart <= endOfCurrentWeek && taskEnd >= startOfCurrentWeek;
      if (inWeek) {
        seen.add(baseId);
        return true;
      }
      return false;
    });
  }, [expandedTasksForWeek, weekDays]);

  const gridRef = useRef<HTMLDivElement>(null);

  // Dynamic hour heights sizing: check if any day of this week has a task on this hour (or spanning across it).
  // Standard height is 85px (expanded to fit details comfortably).
  // Empty height is 30px (shrunk to compress whitespace).
  const { hourHeights, hourTops, totalGridHeight } = React.useMemo(() => {
    const heights = Array.from({ length: 24 }, (_, hour) => {
      if (isMinimizedView) {
        return 22; // small size so the entire 24h fits clearly on one screen with good text legibility
      }
      const hasTaskThisHour = weekDays.some(day => {
        return expandedTasksForWeek.some(t => {
          if (!t.deadline) return false;
          const start = new Date(t.deadline);
          if (!isSameDay(start, day)) return false;

          const sHour = getHours(start);
          if (t.endTime) {
            const end = new Date(t.endTime);
            const eHour = getHours(end);
            return hour >= sHour && hour <= eHour;
          }
          return sHour === hour;
        });
      });
      return hasTaskThisHour ? 85 : 30;
    });

    const tops: number[] = [];
    let currentTop = 0;
    for (let h = 0; h < 24; h++) {
      tops.push(currentTop);
      currentTop += heights[h];
    }

    return {
      hourHeights: heights,
      hourTops: tops,
      totalGridHeight: currentTop,
    };
  }, [expandedTasksForWeek, weekDays, isMinimizedView]);

  const getNowYPosition = () => {
    const hh = now.getHours();
    const mm = now.getMinutes();
    const baseTop = hourTops[hh] || 0;
    const hourHeight = hourHeights[hh] || 85;
    return baseTop + (mm / 60) * hourHeight;
  };

  // Scroll to current hour on mount, adjust dynamically based on heights
  useEffect(() => {
    if (isMinimizedView) {
      if (gridRef.current) {
        gridRef.current.scrollTop = 0;
      }
      return;
    }
    if (gridRef.current && hourTops.length > 0) {
      const currentHour = toIST(new Date()).getHours();
      const targetTop = hourTops[currentHour] || 0;
      gridRef.current.scrollTop = targetTop - 100;
    }
  }, [hourTops, isMinimizedView]);

  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleToday = () => setCurrentDate(toIST(new Date()));

  const getEventStyle = (task: Task) => {
    if (!task.deadline) return {};
    const dateObj = new Date(task.deadline);
    const startHour = getHours(dateObj);
    const startMinute = getMinutes(dateObj);
    const baseTop = hourTops[startHour] || 0;
    const startHourHeight = hourHeights[startHour] || 85;
    const top = baseTop + (startMinute / 60) * startHourHeight;

    let height = startHourHeight - 4; // default minimum is 1 hour minus spacing

    if (task.endTime) {
      const endDateObj = new Date(task.endTime);
      const endHour = getHours(endDateObj);
      const endMinute = getMinutes(endDateObj);
      const endBaseTop = hourTops[endHour] || 0;
      const endHourHeight = hourHeights[endHour] || 85;
      const endTop = endBaseTop + (endMinute / 60) * endHourHeight;

      if (endTop > top) {
        height = endTop - top - 4;
      }
    }

    return { top, height: Math.max(height, 20) };
  };

  const getEventColor = (task: Task) => {
    if (task.status === 'done') return 'bg-[#E3DFD5] text-ink/40 border-dashed border-ink/40 line-through opacity-60';
    if (task.priority === 'urgent') return 'bg-taxi text-ink border-ink';
    if (task.tags?.includes('Focus')) return 'bg-ink text-paper border-taxi';
    return 'bg-paper text-ink border-ink';
  };

  const formatPinTime = (hour: number, minute: number) => {
    const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour >= 12 ? 'pm' : 'am';
    const m = minute < 10 ? `0${minute}` : minute;
    return `${h}:${m}${ampm}`;
  };

  // Chronologically sorted pins for visual representation
  const sortedPins = [...timePins].sort((a, b) => (a.startHour * 60 + a.startMinute) - (b.startHour * 60 + b.startMinute));
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const nowTotalMins = currentHour * 60 + currentMinute;

  const currentPin = sortedPins.find(pin => {
    const startMins = pin.startHour * 60 + pin.startMinute;
    const endMins = pin.endHour * 60 + pin.endMinute;
    return nowTotalMins >= startMins && nowTotalMins < endMins;
  });

  // Calculate next pin and time to it
  let nextPin: TimePin | null = null;
  let minsToNextPin = 0;

  if (!currentPin) {
    const upcoming = sortedPins.find(pin => {
      const startMins = pin.startHour * 60 + pin.startMinute;
      return startMins > nowTotalMins;
    });
    if (upcoming) {
      nextPin = upcoming;
      minsToNextPin = (upcoming.startHour * 60 + upcoming.startMinute) - nowTotalMins;
    } else if (sortedPins.length > 0) {
      nextPin = sortedPins[0];
      minsToNextPin = (1440 - nowTotalMins) + (nextPin.startHour * 60 + nextPin.startMinute);
    }
  }

  // Elapsed calculations if currently inside a pin
  let elapsedPercent = 0;
  let hrsLeft = 0;
  let remMins = 0;
  if (currentPin) {
    const startMins = currentPin.startHour * 60 + currentPin.startMinute;
    const endMins = currentPin.endHour * 60 + currentPin.endMinute;
    const totalMins = endMins - startMins;
    const elapsedMins = nowTotalMins - startMins;
    elapsedPercent = Math.min(Math.max((elapsedMins / totalMins) * 100, 0), 100);
    const minsLeft = endMins - nowTotalMins;
    hrsLeft = Math.floor(minsLeft / 60);
    remMins = minsLeft % 60;
  }

  return (
    <div className={cn(
      "flex flex-col flex-1 bg-paper relative font-sans pb-12 transition-all duration-300",
      isMinimizedView ? "h-auto min-h-0" : "h-[70vh] md:h-[75vh] min-h-[500px]"
    )}>
      {/* Header controls matching screenshot */}
      <div className="flex justify-between items-end mb-4 pb-3.5 md:pb-4 border-b-[6px] border-ink shrink-0 gap-2">
        <h2 className="font-sans text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none flex flex-col min-w-0 relative">
          <div 
            onClick={() => setIsMinimizedView(!isMinimizedView)}
            className="flex flex-col cursor-pointer group hover:text-[#EF4444] transition-colors select-none"
            title="Click to toggle Full View scale mode"
          >
            <span>This</span>
            <span>Week's</span>
            <span className="text-subway-red group-hover:text-ink transition-colors mb-1">
              Transit
            </span>
          </div>
          <div className="relative inline-block mt-1.5 max-w-full">
            <button 
              type="button"
              onClick={() => {
                setPickerMonth(currentDate);
                setIsDatePickerOpen(!isDatePickerOpen);
              }}
              className="flex items-center gap-1 font-mono text-[9px] md:text-[11.5px] font-black tracking-widest text-[#EF4444] uppercase hover:text-ink transition-colors cursor-pointer text-left select-none focus:outline-none"
            >
              <span>{format(weekDays[0], 'MMM dd')} — {format(weekDays[6], 'MMM dd, yyyy')}</span>
              <ChevronDown size={14} className={cn("text-[#EF4444] transition-transform duration-200 shrink-0", isDatePickerOpen && "rotate-180")} strokeWidth={3} />
            </button>

            {isDatePickerOpen && (() => {
              const year = pickerMonth.getFullYear();
              const month = pickerMonth.getMonth();
              const firstDayOfMonth = new Date(year, month, 1);
              let startOffset = firstDayOfMonth.getDay() - 1;
              if (startOffset < 0) startOffset = 6;
              const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
              const totalDaysInPrevMonth = new Date(year, month, 0).getDate();
              const daysArr = [];
              for (let i = startOffset - 1; i >= 0; i--) {
                daysArr.push({
                  date: new Date(year, month - 1, totalDaysInPrevMonth - i),
                  isCurrentMonth: false,
                });
              }
              for (let i = 1; i <= totalDaysInMonth; i++) {
                daysArr.push({
                  date: new Date(year, month, i),
                  isCurrentMonth: true,
                });
              }
              const remainingSlots = 42 - daysArr.length;
              for (let i = 1; i <= remainingSlots; i++) {
                daysArr.push({
                  date: new Date(year, month + 1, i),
                  isCurrentMonth: false,
                });
              }

              return (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent cursor-default" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDatePickerOpen(false);
                    }} 
                  />
                  <div className="absolute top-full left-0 mt-3 z-50 bg-[#FFFEEF] border-[4px] border-ink shadow-[6px_6px_0px_#1A1A1B] p-4 w-[290px] md:w-[330px] select-none text-ink animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between mb-4 pb-2 border-b-[3px] border-ink">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickerMonth(new Date(year, month - 1, 1));
                        }}
                        className="p-1 border-2 border-ink bg-paper shadow-[2px_2px_0px_#1A1A1B] active:shadow-none hover:bg-taxi active:translate-y-[1px] active:translate-x-[1px] transition-all cursor-pointer shrink-0"
                      >
                        <ChevronLeft size={14} strokeWidth={3} />
                      </button>
                      
                      <div className="flex items-center gap-1.5 font-sans font-black uppercase text-[11px] md:text-xs tracking-widest text-ink select-none">
                        <CalendarDays size={13} className="text-subway-red" strokeWidth={2.5} />
                        <span>{format(pickerMonth, 'MMMM yyyy')}</span>
                      </div>

                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickerMonth(new Date(year, month + 1, 1));
                        }}
                        className="p-1 border-2 border-ink bg-paper shadow-[2px_2px_0px_#1A1A1B] active:shadow-none hover:bg-taxi active:translate-y-[1px] active:translate-x-[1px] transition-all cursor-pointer shrink-0"
                      >
                        <ChevronRight size={14} strokeWidth={3} />
                      </button>
                    </div>

                    {/* Weekday names starting with Monday */}
                    <div className="grid grid-cols-7 text-center font-mono text-[9px] font-black uppercase tracking-wider mb-2 text-ink/75">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {daysArr.map(({ date, isCurrentMonth }, idx) => {
                        const isSelectedWeek = date >= weekStart && date <= weekDays[6];
                        const isToday = isSameDay(date, toIST(new Date()));
                        const isSelectedDay = isSameDay(date, currentDate);

                        return (
                          <button
                            key={`${date.toISOString()}-${idx}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentDate(date);
                              setIsDatePickerOpen(false);
                            }}
                            className={cn(
                              "aspect-square flex flex-col items-center justify-center font-mono text-[10px] font-bold border transition-all cursor-pointer relative rounded-none",
                              isCurrentMonth ? "text-ink border-ink/15 bg-paper" : "text-ink/30 border-transparent bg-transparent",
                              isSelectedWeek && "bg-taxi/25 border-taxi/50 font-extrabold text-ink",
                              isSelectedDay && "bg-taxi text-ink border-[3px] border-ink font-black scale-105 shadow-[2.5px_2.5px_0px_#1A1A1B] z-10",
                              isToday && !isSelectedDay && "border-2 border-subway-red text-subway-red font-black"
                            )}
                          >
                            <span>{date.getDate()}</span>
                            {isToday && (
                              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-subway-red" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Jump Options */}
                    <div className="mt-4 pt-2.5 border-t-2 border-ink flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const today = toIST(new Date());
                          setCurrentDate(today);
                          setPickerMonth(today);
                          setIsDatePickerOpen(false);
                        }}
                        className="flex-1 text-center py-1.5 border-2 border-ink bg-paper hover:bg-taxi font-mono text-[8px] font-black uppercase shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[1.5px] active:translate-x-[1.5px] cursor-pointer transition-all"
                      >
                        GO TO TODAY
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDatePickerOpen(false);
                        }}
                        className="px-3 py-1.5 border-2 border-ink bg-paper-dark hover:bg-ink hover:text-paper font-mono text-[8px] font-black uppercase shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[1.5px] active:translate-x-[1.5px] cursor-pointer transition-all"
                      >
                        CLOSE
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </h2>
        <div className="flex flex-col items-end gap-2 mb-1 shrink-0">
          {onOpenTimeTable && (
            <button 
              type="button"
              onClick={onOpenTimeTable} 
              className="px-2.5 py-1.5 border-[3px] border-ink font-mono text-[10px] uppercase font-bold hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] bg-paper text-ink transition-all shrink-0 flex items-center gap-1.5 select-none cursor-pointer group"
              title="Open College Time Table"
            >
              <GraduationCap size={13} strokeWidth={2.5} className="text-subway-red group-hover:text-taxi transition-colors" /> TIME TABLE ({timeTableEntries.length})
            </button>
          )}
          <button 
            type="button"
            onClick={onOpenBirthdays} 
            className="px-2.5 py-1.5 border-[3px] border-ink font-mono text-[10px] uppercase font-bold hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] bg-taxi text-ink transition-all shrink-0 flex items-center gap-1.5 select-none cursor-pointer"
          >
            <Gift size={12} strokeWidth={2.5} /> BIRTHDAYS ({birthdays.length})
          </button>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <button onClick={handleToday} className="px-2.5 py-1.5 border-[3px] border-ink font-mono text-[10px] uppercase font-bold hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] bg-paper transition-all shrink-0">TODAY</button>
            <button onClick={handlePrevWeek} className="px-2.5 py-1.5 border-[3px] border-ink font-mono text-[10px] uppercase font-bold hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] bg-paper transition-all shrink-0">PREV</button>
            <button onClick={handleNextWeek} className="px-2.5 py-1.5 border-[3px] border-ink font-mono text-[10px] uppercase font-bold hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] bg-paper transition-all shrink-0">NEXT</button>
          </div>
        </div>
      </div>

      <div className={cn(
        "flex-1 flex flex-col border-[6px] border-ink shadow-[6px_6px_0px_#1A1A1B] bg-paper relative select-none",
        isMinimizedView ? "overflow-hidden" : "overflow-x-auto overflow-y-hidden"
      )}>
        <div className={cn(
          "flex-1 flex flex-col",
          isMinimizedView ? "min-w-0 w-full" : "min-w-[720px] md:min-w-full"
        )}>
          {/* Scrollable Time Grid */}
          <div 
            ref={gridRef} 
            className={cn(
              "flex-1 relative scrollbar-hide",
              isMinimizedView ? "overflow-hidden pointer-events-none" : "overflow-y-auto overflow-x-hidden"
            )}
          >
            
            {/* Week Days Header inside the scroll container to align perfectly */}
            <div className={cn(
              "z-30 sticky top-0 shrink-0 bg-paper",
              isMinimizedView ? "border-b border-ink" : "border-b-[4px] border-ink"
            )}>
              <div className="flex border-b border-ink/40">
                <div className={cn(
                  "flex flex-col items-center justify-center px-1 shrink-0 bg-paper sticky left-0 z-40 block-decor",
                  isMinimizedView ? "w-10 border-r border-ink py-1" : "w-14 md:w-16 border-r-[4px] border-ink py-1 md:py-2"
                )}>
                  <span className={cn("font-mono font-bold tracking-widest leading-none text-center", isMinimizedView ? "text-[6px]" : "text-[8px] uppercase")}>IST</span>
                  {!isMinimizedView && (
                    <button 
                      type="button" 
                      onClick={() => handleOpenCreatePin()}
                      className="mt-1 px-1 py-0.5 border-2 border-ink font-mono text-[5.5px] md:text-[7px] uppercase font-black bg-taxi hover:bg-taxi/90 text-ink shadow-[1.1px_1.1px_0px_#1A1A1B] hover:translate-y-[-0.5px] active:shadow-none active:translate-x-[0.5px] active:translate-y-[0.5px] transition-all select-none cursor-pointer leading-none shrink-0"
                      title="Anchor a new time section pin"
                    >
                      + PIN
                    </button>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-7">
                  {weekDays.map((day, dayIndex) => {
                    const today = isSameDay(day, toIST(new Date()));
                    const dayBirthdays = (birthdays || []).filter(bday => {
                      if (!bday.date) return false;
                      const parts = bday.date.split('-');
                      if (parts.length < 3) return false;
                      const bMonth = parseInt(parts[1], 10);
                      const bDay = parseInt(parts[2], 10);
                      return bMonth === (day.getMonth() + 1) && bDay === day.getDate();
                    });

                    return (
                      <div 
                        key={day.toISOString()} 
                        onClick={() => {
                          if (isMinimizedView) return;
                          const formattedDate = format(day, 'yyyy-MM-dd');
                          handleCreateAtSlot(formattedDate, '10:30', '11:30');
                        }}
                        className={cn(
                          "text-center flex flex-col items-center justify-center relative select-none", 
                          isMinimizedView 
                            ? "p-0.5 border-r border-ink/20 min-h-[32px] cursor-default" 
                            : "border-r-[4px] border-ink p-1 md:p-3 min-h-[55px] cursor-pointer hover:bg-paper-dark transition-colors",
                          today ? "bg-taxi text-ink hover:bg-taxi-hover" : "bg-transparent",
                          dayIndex === 6 ? "border-r-0" : ""
                        )}
                        title={isMinimizedView ? undefined : "Click header to schedule dispatch on this date"}
                      >
                        <span className={cn("font-mono font-bold uppercase tracking-widest leading-none", isMinimizedView ? "text-[6px]" : "text-[8px] md:text-[10px]")}>{format(day, 'EEE')}</span>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <span className={cn("font-sans font-black mt-1 leading-none", isMinimizedView ? "text-[11px]" : "text-lg md:text-3xl")}>{format(day, 'd')}</span>
                          {isMinimizedView && dayBirthdays.length > 0 && (
                            <span className="text-[7.5px]" title={`${dayBirthdays.length} birthday(s)`}>🎂</span>
                          )}
                        </div>
                        {!isMinimizedView && dayBirthdays.length > 0 && (
                          <div className="mt-1 flex flex-col gap-1 w-full items-center px-1">
                            {dayBirthdays.map(b => (
                              <div 
                                key={b.id} 
                                className="bg-ink text-taxi border border-taxi text-[7px] md:text-[9px] font-mono uppercase font-black px-1.5 py-0.5 rounded flex items-center justify-center gap-0.5 select-none text-center max-w-full truncate shadow-[1px_1px_0px_#F7C331] leading-none"
                                title={`🎂 ${b.name}'s Birthday`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenBirthdays();
                                }}
                              >
                                🎂 {b.name}
                              </div>
                            ))}
                          </div>
                        )}
                        {today && <div className={cn("absolute rounded-full bg-subway-red animate-pulse", isMinimizedView ? "top-0.5 right-0.5 w-1 h-1" : "top-1 left-1 w-2 h-2")} title="Current Station" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Multi-day / All-day Tasks spanning multiple days */}
              {multiDayTasksForWeek.length > 0 && (
                <div className="flex bg-paper-dark border-t border-ink shrink-0 relative">
                  <div className={cn(
                    "flex flex-col items-center justify-center p-1 shrink-0 bg-paper sticky left-0 z-40",
                    isMinimizedView ? "w-10 border-r border-ink" : "w-14 md:w-16 border-r-[4px] border-ink"
                  )}>
                    <span className="font-mono text-[7px] uppercase font-black text-ink/50 tracking-wider text-center leading-none">SPAN</span>
                  </div>
                  <div className="flex-1 relative py-1 min-h-[36px] bg-paper/30 flex flex-col justify-center">
                    {/* Background grid indicators */}
                    <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                      {Array.from({ length: 7 }).map((_, idx) => (
                        <div key={idx} className={cn("h-full", isMinimizedView ? "border-r border-ink/10" : "border-r-[4px] border-ink/10", idx === 6 ? "border-r-0" : "")} />
                      ))}
                    </div>
                    
                    {/* Spanning task cards */}
                    <div className="flex flex-col gap-1 px-1 relative z-10 w-full">
                      {multiDayTasksForWeek.map(task => {
                        const taskStart = new Date(task.deadline!);
                        const taskEnd = new Date(task.endTime!);

                        const startDayStr = format(taskStart, 'yyyy-MM-dd');
                        const endDayStr = format(taskEnd, 'yyyy-MM-dd');

                        let startIndex = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === startDayStr);
                        if (startIndex === -1) {
                          startIndex = taskStart < weekDays[0] ? 0 : 6;
                        }

                        let endIndex = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === endDayStr);
                        if (endIndex === -1) {
                          endIndex = taskEnd > weekDays[6] ? 6 : 0;
                        }

                        const colSpan = Math.max(1, endIndex - startIndex + 1);
                        const leftPct = (startIndex / 7) * 100;
                        const widthPct = (colSpan / 7) * 100;

                        return (
                          <div
                            key={task.id}
                            onClick={(e) => {
                              if (isMinimizedView) return;
                              e.stopPropagation();
                              setSelectedTask(task);
                            }}
                            style={{
                              marginLeft: `${leftPct}%`,
                              width: `calc(${widthPct}% - 6px)`,
                            }}
                            className={cn(
                              "border rounded-none select-none text-left relative overflow-hidden transition-all",
                              isMinimizedView 
                                ? "border-ink px-1 py-0.5 shadow-[1px_1px_0px_#1A1A1B] text-[6px]" 
                                : "border-[2px] border-ink px-1.5 py-0.5 shadow-[1.5px_1.5px_0px_#1A1A1B] cursor-pointer hover:translate-y-[-0.5px] hover:shadow-[2.5px_2.5px_0px_#1A1A1B]",
                              getEventColor(task)
                            )}
                          >
                            <div className={cn(
                              "absolute left-0 top-0 bottom-0 w-1",
                              task.status === 'done' ? "bg-ink/10" : (task.priority === 'urgent' ? "bg-subway-red" : task.priority === 'medium' ? "bg-taxi" : "bg-ink/30")
                            )} />
                            <div className={cn(
                              "flex items-center justify-between pl-1 font-bold uppercase leading-tight tracking-tight",
                              isMinimizedView ? "text-[6px]" : "text-[9px]"
                            )}>
                              <span className="truncate max-w-[75%]">
                                {task.status === 'in-progress' && <span className="text-subway-blue mr-0.5 animate-pulse">⚡</span>}
                                <span className={cn(task.status === 'done' && "line-through opacity-50")}>{task.title}</span>
                              </span>
                              {!isMinimizedView && (
                                <span className="font-mono text-[6.5px] font-semibold opacity-70 ml-1 shrink-0 bg-ink/5 px-1 rounded-xs">
                                  {format(taskStart, 'MMM d, h:mm a')} — {format(taskEnd, 'MMM d, h:mm a')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex relative pb-20">
              
              {/* Time Labels Rail with integrated Custom Pins & Side Sections on the left */}
              <div 
                className={cn(
                  "shrink-0 bg-[#FAF8F2] sticky left-0 z-20 group/timerail relative",
                  isMinimizedView ? "w-10 border-r border-ink" : "w-14 md:w-16 border-r-[4px] border-ink"
                )}
                style={{ height: `${totalGridHeight}px` }}
              >
                {/* Clickable slot on each hour to anchor a pin */}
                <div className="absolute inset-0 flex flex-col pointer-events-auto z-10">
                  {hours.map(hour => (
                    <div
                      key={hour}
                      onClick={() => {
                        if (isMinimizedView) return;
                        handleOpenCreatePin(hour);
                      }}
                      className={cn(
                        "w-full flex items-end justify-start p-1 transition-all group/timehour",
                        isMinimizedView ? "cursor-default border-b border-dashed border-ink/5" : "hover:bg-black/5 cursor-pointer border-b border-dashed border-ink/5"
                      )}
                      style={{ height: `${hourHeights[hour]}px` }}
                      title={isMinimizedView ? undefined : `Click here to anchor section starting at ${hour}:00`}
                    >
                      {!isMinimizedView && (
                        <span className="font-mono text-[5px] md:text-[6px] font-black text-ink/30 opacity-0 group-hover/timehour:opacity-100 transition-opacity uppercase tracking-tighter leading-none select-none pl-3 pb-1">
                          + PIN
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Drawn Section side indicators & Pins inside Time Labels Rail */}
                {!isMinimizedView && timePins.map((pin, idx) => {
                  const startBaseTop = hourTops[pin.startHour] || 0;
                  const startHourHeight = hourHeights[pin.startHour] || 85;
                  const startTop = startBaseTop + (pin.startMinute / 60) * startHourHeight;

                  const endBaseTop = hourTops[pin.endHour] || 0;
                  const endHourHeight = hourHeights[pin.endHour] || 85;
                  const endTop = endBaseTop + (pin.endMinute / 60) * endHourHeight;
                  const height = Math.max(12, endTop - startTop);

                  const overlapOffset = (idx % 2) * 5; // shift tiny bit to right if overlapping

                  return (
                    <div key={`rail-pin-${pin.id}`} className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none" style={{ zIndex: 30 }}>
                      {/* Vertical highlight strip on leftmost part of time rail */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopoverPinId(activePopoverPinId === pin.id ? null : pin.id);
                        }}
                        className="absolute w-[5px] md:w-[7px] rounded-full border border-ink cursor-pointer hover:w-[10px] transition-all pointer-events-auto group/pinstrip shadow-[1px_1px_px_rgba(0,0,0,0.15)]"
                        style={{
                          top: `${startTop}px`,
                          height: `${height}px`,
                          left: `${2 + overlapOffset}px`,
                          backgroundColor: pin.color,
                        }}
                        title={`${pin.name} (${formatIndianTime(pin.startHour, pin.startMinute)} - ${formatIndianTime(pin.endHour, pin.endMinute)})`}
                      >
                        {/* Interactive Click Popover Card holding premium journal theme details shown in the screenshot */}
                        {activePopoverPinId === pin.id && (
                          <div 
                            onClick={(e) => {
                              // Prevent closing the popover when clicking inside it
                              e.stopPropagation();
                            }}
                            className="absolute left-[12px] top-1/2 -translate-y-1/2 bg-[#FCFAF2] border-[3px] border-ink p-3 shadow-[4px_4px_0px_#1A1A1B] w-52 md:w-56 z-[999] pointer-events-auto rounded-lg text-left"
                          >
                            <p className="font-mono text-[8px] font-bold uppercase text-ink/50 tracking-widest leading-none mb-1">Time Section</p>
                            <p className="font-sans font-black text-[12px] md:text-[14px] text-ink uppercase tracking-tight leading-snug mb-1">
                              {pin.name}
                            </p>
                            <div className="flex items-center gap-1.5 font-mono text-[9px] md:text-[10px] font-bold text-ink/75">
                              <Clock size={12} strokeWidth={2.5} className="text-ink/65 shrink-0" />
                              <span>
                                {formatIndianTime(pin.startHour, pin.startMinute)} - {formatIndianTime(pin.endHour, pin.endMinute)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditPin(pin);
                                setActivePopoverPinId(null);
                              }}
                              className="w-full mt-3 py-1.5 px-3 border-[2.5px] border-ink font-mono text-[8.5px] md:text-[10px] font-black uppercase text-center bg-taxi hover:bg-taxi/90 text-ink shadow-[2.5px_2.5px_0px_#1A1A1B] hover:translate-y-[-0.5px] active:shadow-none active:translate-x-[0.5px] active:translate-y-[0.5px] transition-all cursor-pointer rounded-md select-none tracking-widest leading-none block"
                            >
                              CLICK TO EDIT
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Start Pin - points horizontally */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopoverPinId(activePopoverPinId === pin.id ? null : pin.id);
                        }}
                        className="absolute cursor-pointer pointer-events-auto hover:scale-110 active:scale-95 transition-transform"
                        style={{
                          top: `${startTop - 9}px`, // center pin
                          left: `${overlapOffset - 1.5}px`
                        }}
                        title={`Start marker: ${pin.name}`}
                      >
                        <SketchPushPin color={pin.color} size={18} horizontal={true} />
                      </div>

                      {/* End Pin - points horizontally */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopoverPinId(activePopoverPinId === pin.id ? null : pin.id);
                        }}
                        className="absolute cursor-pointer pointer-events-auto hover:scale-110 active:scale-95 transition-transform"
                        style={{
                          top: `${endTop - 9}px`, // center pin
                          left: `${overlapOffset - 1.5}px`
                        }}
                        title={`End marker: ${pin.name}`}
                      >
                        <SketchPushPin color={pin.color} size={18} horizontal={true} />
                      </div>
                    </div>
                  );
                })}

                {/* Normal Time Labels */}
                <div className="absolute inset-0 pointer-events-none z-0">
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className={cn(
                        "flex justify-end items-start pr-1 relative",
                        isMinimizedView ? "border-b border-dashed border-ink/5" : "border-b-2 border-dashed border-ink/20"
                      )}
                      style={{ height: `${hourHeights[hour]}px` }}
                    >
                      <span className={cn(
                        "font-mono uppercase tracking-tighter bg-transparent px-1 mt-0.5 z-10 leading-none transition-all mr-0.5",
                        isMinimizedView 
                          ? "text-ink/45 text-[7.5px]" 
                          : hourHeights[hour] === 30 ? "text-ink/30 text-[8px] md:text-[9.5px] scale-[0.8] origin-right" : "text-ink/60 text-[8px] md:text-[9.5px]"
                      )}>
                        {format(toIST(new Date()).setHours(hour, 0, 0, 0), 'ha')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overlay Horizontal Pin Lines spanning across the entire width of week columns */}
              <div className={cn(
                "absolute inset-y-0 right-0 pointer-events-none z-10 overflow-hidden",
                isMinimizedView ? "left-[40px]" : "left-[56px] md:left-[64px]"
              )}>
                {(() => {
                  const lines: Array<{
                    id: string;
                    top: number;
                    color: string;
                    pin: TimePin;
                    type: 'start' | 'end';
                  }> = [];

                  timePins.forEach(pin => {
                    const baseTop = hourTops[pin.startHour] || 0;
                    const startHourHeight = hourHeights[pin.startHour] || 85;
                    const startTop = baseTop + (pin.startMinute / 60) * startHourHeight;

                    const endBaseTop = hourTops[pin.endHour] || 0;
                    const endHourHeight = hourHeights[pin.endHour] || 85;
                    const endTop = endBaseTop + (pin.endMinute / 60) * endHourHeight;

                    lines.push({
                      id: `${pin.id}-start`,
                      top: startTop,
                      color: pin.color,
                      pin,
                      type: 'start'
                    });

                    lines.push({
                      id: `${pin.id}-end`,
                      top: endTop,
                      color: pin.color,
                      pin,
                      type: 'end'
                    });
                  });

                  const groups: Array<Array<{
                    id: string;
                    top: number;
                    color: string;
                    pin: TimePin;
                    type: 'start' | 'end';
                  }>> = [];

                  lines.forEach(line => {
                    const matchedGroup = groups.find(g => Math.abs(g[0].top - line.top) <= 2);
                    if (matchedGroup) {
                      matchedGroup.push(line);
                    } else {
                      groups.push([line]);
                    }
                  });

                  return groups.flatMap(group => {
                    return group.map((line, index) => {
                      const offset = (index - (group.length - 1) / 2) * 4;
                      const adjustedTop = line.top + offset;

                      return (
                        <div 
                          key={line.id}
                          className="absolute left-0 right-0 border-t-2 border-dashed flex items-center transition-all animate-fade-in"
                          style={{ 
                            top: `${adjustedTop}px`, 
                            borderColor: line.color,
                            filter: 'drop-shadow(1px 1px 0px rgba(0,0,0,0.15))',
                            zIndex: 10 + index,
                          }}
                        />
                      );
                    });
                  });
                })()}
              </div>

              {/* Grid Columns */}
              <div 
                className="flex-1 grid grid-cols-7 relative"
                style={{ height: `${totalGridHeight}px` }}
              >
                {/* Background horizontal lines */}
                <div className="absolute inset-0 pointer-events-none flex flex-col">
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className={cn(
                        "w-full shrink-0",
                        isMinimizedView ? "border-b border-dashed border-ink/10" : "border-b-2 border-dashed border-ink/20"
                      )} 
                      style={{ height: `${hourHeights[hour]}px` }}
                    />
                  ))}
                </div>

                {weekDays.map((day, dayIndex) => {
                  const dayTasks = expandedTasksForWeek.filter(t => {
                    if (!t.deadline) return false;
                    const sameDay = isSameDay(new Date(t.deadline), day);
                    if (!sameDay) return false;
                    if (t.endTime) {
                      const isMulti = !isSameDay(new Date(t.deadline), new Date(t.endTime)) && new Date(t.endTime) > new Date(t.deadline);
                      if (isMulti) return false;
                    }
                    return true;
                  });
                  const dayLayouts = getEventLayouts(dayTasks, hourTops, hourHeights);
                  
                  return (
                    <div key={day.toISOString()} className={cn(
                      "relative group/col",
                      isMinimizedView ? "border-r border-ink/10" : "border-r-[4px] border-ink/40",
                      dayIndex === 6 ? "border-r-0" : ""
                    )}>
                      {/* Interactive Hour slots background for clicking to add task */}
                      <div className={cn(
                        "absolute inset-0 flex flex-col pointer-events-auto",
                        isMinimizedView && "pointer-events-none"
                      )}>
                        {!isMinimizedView && hours.map(hour => (
                          <div
                            key={hour}
                            onClick={() => {
                              const formattedDate = format(day, 'yyyy-MM-dd');
                              const formattedTime = String(hour).padStart(2, '0') + ':00';
                              // set end time 1 hour later
                              const endHour = (hour + 1) % 24;
                              const formattedEndTime = String(endHour).padStart(2, '0') + ':00';
                              handleCreateAtSlot(formattedDate, formattedTime, formattedEndTime);
                            }}
                            className="w-full hover:bg-taxi/5 active:bg-taxi/15 cursor-crosshair transition-all border-b border-dashed border-transparent"
                            style={{ height: `${hourHeights[hour]}px` }}
                            title={`Click to schedule dispatch at ${hour}:00`}
                          />
                        ))}
                      </div>

                      {/* Events */}
                      {dayTasks.map(task => {
                        const layout = dayLayouts[task.id];
                        const style = layout ? {
                          top: `${layout.top}px`,
                          height: `${layout.height}px`,
                          left: `${layout.left}%`,
                          width: `${layout.width}%`,
                        } : getEventStyle(task);

                        const cardHeight = layout ? layout.height : (getEventStyle(task).height || 85);
                        const isVerySmall = cardHeight < 36;
                        const isMediumSmall = cardHeight >= 36 && cardHeight < 62;
                        const isTaller = cardHeight >= 62;

                        return (
                          <div 
                            key={task.id}
                            onClick={(e) => {
                              if (isMinimizedView) return;
                              e.stopPropagation();
                              setSelectedTask(task);
                            }}
                            className={cn(
                              "absolute z-10 overflow-hidden transition-all select-none border-ink",
                              isMinimizedView 
                                ? "border p-[1.2px] text-[6.5px] shadow-none cursor-default leading-none"
                                : cn("border-[3px] shadow-[2px_2px_0px_#1A1A1B] cursor-pointer hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#1A1A1B]", isVerySmall ? "p-0.5" : isMediumSmall ? "p-1" : "p-1.5"),
                              getEventColor(task),
                              task.status === 'in-progress' && "animate-doing-pulse"
                            )}
                            style={style}
                          >
                            {/* Priority Indicator Line on Left Side */}
                            <div className={cn(
                              "absolute left-0 top-0 bottom-0",
                              isMinimizedView ? "w-0.5" : "w-1",
                              task.status === 'done' ? "bg-ink/10" : (task.priority === 'urgent' ? "bg-subway-red" : task.priority === 'medium' ? "bg-taxi" : "bg-ink/30")
                            )} />

                            {isMinimizedView ? (
                              <div className="flex items-center h-full pl-[3.5px] pr-1 text-[6.5px] font-black text-ink overflow-hidden select-none leading-none">
                                <span className="truncate w-full block">
                                  {task.status === 'in-progress' && <span className="text-subway-blue mr-0.5 animate-pulse inline-block">⚡</span>}
                                  {task.title}
                                </span>
                              </div>
                            ) : (
                              <div className={cn(
                                "flex flex-col h-full pl-1",
                                isVerySmall ? "justify-center" : "justify-between py-0.5 pb-0.5"
                              )}>
                                {isVerySmall ? (
                                  <div className="flex items-center justify-between gap-1 w-full text-[7px] md:text-[8px] font-black text-ink leading-none">
                                    <span className="truncate pr-1">
                                      {task.status === 'in-progress' && <span className="text-subway-blue mr-0.5 animate-pulse inline-block">⚡</span>}
                                      {task.title}
                                    </span>
                                  {task.title.length < 10 && task.deadline && (
                                    <span className="font-mono text-[6px] md:text-[7px] font-extrabold opacity-60 shrink-0">
                                      {format(new Date(task.deadline), 'H:mm')}
                                    </span>
                                  )}
                                </div>
                              ) : isMediumSmall ? (
                                <>
                                  {/* Title */}
                                  <div className={cn(
                                    "font-sans font-black tracking-tight leading-none",
                                    cardHeight < 48 ? "text-[8px] md:text-[8.5px] line-clamp-1" : "text-[8.5px] md:text-[9.5px] line-clamp-2",
                                    task.status === 'done' ? "line-through text-ink/40" : "text-ink"
                                  )}>
                                    {task.status === 'in-progress' && <span className="text-subway-blue mr-0.5 animate-pulse inline-block">⚡</span>}
                                    {task.title}
                                  </div>

                                  {/* Compact Meta row showing Priority & Duration since space is available */}
                                  <div className="flex items-center gap-1 flex-wrap text-ink font-mono text-[6.5px] md:text-[7.5px] font-bold leading-none opacity-90 select-none overflow-hidden h-3.5 md:h-4 mt-0.5">
                                    <span className={cn(
                                      "px-1 border border-ink/15 scale-90 origin-left shrink-0 rounded-[1.5px] tracking-wide",
                                      task.status === 'done' ? "bg-transparent text-ink/30 border-ink/10" : 
                                      task.priority === 'urgent' ? "bg-subway-red/15 text-subway-red border-subway-red/25" :
                                      task.priority === 'medium' ? "bg-taxi/20 text-ink border-taxi/40" : "bg-ink/5 text-ink/65 border-ink/15"
                                    )}>
                                      {task.priority === 'urgent' ? 'P1' : task.priority === 'medium' ? 'P2' : 'P3'}
                                    </span>
                                    {task.deadline && (
                                      <span className="flex items-center gap-0.5 text-ink/75 shrink-0 scale-95 origin-left truncate max-w-[70%]">
                                        <Clock size={7} className="shrink-0" strokeWidth={3} />
                                        {formatTaskTimeRange(task)}
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Card Tag & Priority Header (For Taller Cards) */}
                                  <div className="flex items-center justify-between gap-1 select-none">
                                    <span className={cn(
                                      "font-mono text-[6px] md:text-[7.5px] font-extrabold uppercase px-1 border border-ink/20 scale-90 origin-left shrink-0",
                                      task.status === 'done' ? "bg-transparent text-ink/30 border-ink/10" : (task.priority === 'urgent' && "bg-subway-red/10 text-subway-red border-subway-red/30")
                                    )}>
                                      {task.priority === 'urgent' ? 'P1 Urgent' : task.priority === 'medium' ? 'P2 Med' : 'P3 Low'}
                                    </span>
                                    {task.tags && task.tags.length > 0 && (
                                      <span className={cn(
                                        "hidden sm:inline font-mono text-[6px] md:text-[7.5px] font-semibold uppercase border px-0.5 truncate scale-90 origin-right",
                                        task.status === 'done' ? "text-ink/30 bg-transparent border-ink/10" : "text-ink/60 bg-paper-dark border-ink/20"
                                      )}>
                                        {task.tags[0]}
                                      </span>
                                    )}
                                  </div>

                                  {/* Title */}
                                  <div className={cn(
                                    "font-sans font-black tracking-tight leading-tight text-[9px] md:text-[11px] line-clamp-2 mt-0.5",
                                    task.status === 'done' ? "line-through text-ink/40" : "text-ink"
                                  )}>
                                    {task.status === 'in-progress' && <span className="text-subway-blue mr-0.5 animate-pulse inline-block">⚡</span>}
                                    {task.title}
                                  </div>

                                  {/* Time & Checklist stamp (For Taller Cards) */}
                                  <div className="font-mono text-[7px] md:text-[8px] font-bold opacity-80 mt-0.5 flex items-center justify-between">
                                    <span className="flex items-center gap-0.5">
                                      <Clock size={8} className="shrink-0" />
                                      {formatTaskTimeRange(task)}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0 select-none">
                                      {task.status === 'done' && (
                                        <span className="text-green-700 font-extrabold text-[8px] md:text-[10px] leading-none">✓</span>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );})}

                      {/* Real-time Current Position indicator line & badges */}
                      {(() => {
                        const isToday = isSameDay(day, now);
                        if (!isToday) return null;
                        if (isMinimizedView) {
                          return (
                            <div 
                              className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                              style={{ top: `${getNowYPosition()}px`, transform: 'translateY(-50%)' }}
                            >
                              <div className="w-full relative flex items-center">
                                <div className="absolute inset-x-0 h-[1.2px] bg-subway-red/60" />
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div 
                            className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                            style={{ top: `${getNowYPosition()}px`, transform: 'translateY(-50%)' }}
                          >
                            <div className="w-full relative flex items-center">
                              {/* Sleek retro high-contrast time horizontal thread line */}
                              <div className="absolute inset-x-0 h-[3.5px] bg-ink" />
                              <div className="absolute inset-x-0 h-[1.5px] bg-subway-red" />
                              
                              {/* Circle node bead matching transit theme */}
                              <div className="absolute -left-[9px] flex items-center z-40 select-none">
                                {/* The perfect transit station node circle */}
                                <div className="w-[18px] h-[18px] rounded-full bg-paper border-[3px] border-ink flex items-center justify-center shadow-[1.5px_1.5px_0px_#1A1A1B] shrink-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-subway-red" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Render Habits for current Day */}
                      {(() => {
                        const dayOfWeek = day.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
                        const dayHabits = habits.filter(habit => {
                          const freq = habit.frequency || 'daily';
                          if (freq === 'daily') {
                            return true;
                          } else if (freq === 'weekdays') {
                            return dayOfWeek >= 1 && dayOfWeek <= 5;
                          } else if (freq === 'weekends') {
                            return dayOfWeek === 0 || dayOfWeek === 6;
                          } else if (freq === 'weekly' || freq === 'custom') {
                            if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
                              return habit.daysOfWeek.includes(dayOfWeek);
                            }
                            return true;
                          }
                          return true;
                        });

                        return dayHabits.map((habit) => {
                          const hHour = habit.hour !== undefined ? habit.hour : 8;
                          const hMin = habit.minute !== undefined ? habit.minute : 0;
                          
                          const baseTop = hourTops[hHour] || 0;
                          const hourHeight = hourHeights[hHour] || 85;
                          const top = baseTop + (hMin / 60) * hourHeight;
                          
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const isCompleted = !!habit.history?.[dateStr];

                          return (
                            <div
                              key={`calendar-habit-${habit.id}-${dateStr}`}
                              className={cn(
                                "absolute z-20 pointer-events-auto select-none",
                                isMinimizedView ? "right-0.5" : "right-1"
                              )}
                              style={{
                                top: `${top}px`,
                                transform: 'translateY(-50%)',
                                width: 'auto',
                                maxWidth: '95%',
                              }}
                              title={`Habit Station: ${habit.name} (${isCompleted ? 'Completed' : 'Pending'})`}
                            >
                              <div 
                                className={cn(
                                  "flex items-center select-none font-mono font-black leading-none uppercase tracking-tight",
                                  isMinimizedView
                                    ? "gap-[1px] border border-ink/80 py-0 px-[2.5px] rounded-full shadow-none text-[4.5px]"
                                    : "gap-1 border-2 border-ink px-1.5 py-0.5 rounded-full shadow-[1.5px_1.5px_0px_#1A1A1B] text-[8px] md:text-[9.5px]",
                                  isCompleted 
                                    ? (isMinimizedView 
                                        ? "bg-emerald-500 text-white border-emerald-600 font-extrabold" 
                                        : "bg-[#D1FAE5] text-emerald-950 border-emerald-500 shadow-[1px_1px_0px_rgba(16,185,129,1)]") 
                                    : "bg-paper text-ink"
                                )}
                                style={(!isCompleted && habit.color) ? { backgroundColor: `${habit.color}F0` } : undefined}
                              >
                                <HabitIcon iconName={habit.icon || '📍'} size={isMinimizedView ? 6 : 10} className="shrink-0" />
                                <span className={cn(
                                  "truncate",
                                  isMinimizedView ? "max-w-[14px] text-[4px] tracking-widest leading-none" : "max-w-[45px] md:max-w-[65px] tracking-tight",
                                  isCompleted && "line-through opacity-60"
                                )}>
                                  {habit.name}
                                </span>
                                
                                {/* Tiny transit connection dot */}
                                <div className={cn(
                                  isMinimizedView ? "w-0.5 h-0.5 border-[0.3px] border-ink ml-[0.5px] shrink-0 rounded-full" : "w-1.5 h-1.5 border border-ink ml-0.5 shrink-0 rounded-full",
                                  isCompleted ? "bg-emerald-200 border-emerald-300" : "bg-white"
                                )} />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  );
                })}
              </div>
              
            </div>
          </div>
        </div>
        {isMinimizedView && (
          <div className="border-t-[4px] border-ink bg-[#FCFAF5] p-3 flex flex-col gap-2.5 shrink-0 select-none">
            {/* Header section of the monitor */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b-2 border-dashed border-ink/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    currentPin ? "bg-emerald-400" : "bg-amber-400"
                  )}></span>
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    currentPin ? "bg-emerald-500" : "bg-amber-500"
                  )}></span>
                </span>
                <span className="font-mono text-[9px] md:text-[10px] font-black uppercase tracking-widest text-ink flex items-center gap-1">
                  <Activity size={10} className="text-ink animate-[pulse_2s_infinite]" />
                  LIVE TRANSIT ROUTE MONITOR
                </span>
              </div>
              
              <div className="font-mono text-[8px] md:text-[9px] font-bold text-ink-light bg-paper-dark border border-ink/25 px-1.5 py-0.5 rounded uppercase">
                CURRENT STATION CLOCK: {format(now, 'hh:mm:ss a')}
              </div>
            </div>

            {/* Main Alert & Progress Container */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Alert details */}
              <div className="md:col-span-4 border-2 border-ink bg-paper p-2 shadow-[2px_2px_0px_#1A1A1B] flex flex-col justify-center min-h-[58px]">
                {currentPin ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[8.5px] font-black uppercase tracking-wide text-ink truncate max-w-[85%]">
                        ACTIVE PIN: {currentPin.name}
                      </span>
                      <span 
                        className="w-2.5 h-2.5 rounded-full border border-ink shrink-0 animate-pulse"
                        style={{ backgroundColor: currentPin.color }}
                      />
                    </div>
                    <div className="font-mono text-[9.5px] font-black text-emerald-600 mt-1 flex items-center gap-1">
                      <Timer size={10} strokeWidth={3} className="animate-[spin_40s_linear_infinite]" />
                      {hrsLeft > 0 ? `${hrsLeft}h ${remMins}m` : `${remMins}m`} REMAINING
                    </div>
                    <div className="font-mono text-[7px] text-ink-light uppercase mt-0.5 font-semibold">
                      SPAN: {formatPinTime(currentPin.startHour, currentPin.startMinute)} - {formatPinTime(currentPin.endHour, currentPin.endMinute)}
                    </div>
                  </>
                ) : nextPin ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[8.5px] font-black uppercase tracking-wide text-ink-light">
                        STATUS: OFF-PEAK TRANSIT
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-ink shrink-0 animate-pulse" />
                    </div>
                    <div className="font-mono text-[9px] font-black text-amber-600 mt-1 flex items-center gap-1">
                      <Milestone size={10} strokeWidth={2.5} />
                      NEXT: IN {Math.floor(minsToNextPin / 60) > 0 ? `${Math.floor(minsToNextPin / 60)}h ${minsToNextPin % 60}m` : `${minsToNextPin % 60}m`}
                    </div>
                    <div className="font-sans font-bold text-[7.5px] text-ink uppercase mt-0.5 truncate">
                      AWAITING DEPARTURE: {nextPin.name}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-mono text-[8.5px] font-black uppercase tracking-wide text-ink-light">
                      STATUS: SLEEP MODE
                    </div>
                    <div className="font-mono text-[9.5px] font-bold text-ink-light/70 mt-1">
                      NO ROUTE BLOCKS DEFINED
                    </div>
                    <div className="font-mono text-[7px] text-ink-light mt-0.5">
                      CREATE PINS TO TRACK LIVE DAILY DOCKETS
                    </div>
                  </>
                )}
              </div>

              {/* Progress visual rail */}
              <div className="md:col-span-8 flex flex-col justify-center gap-1">
                <div className="flex justify-between items-center px-1">
                  <span className="font-mono text-[7.5px] font-black uppercase tracking-wider text-ink-light flex items-center gap-1">
                    <Gauge size={9} />
                    SECTION DURATION PROGRESS
                  </span>
                  {currentPin && (
                    <span className="font-mono text-[8px] font-black text-ink-light bg-ink/5 px-1 py-0.2 rounded">
                      {Math.round(elapsedPercent)}% COMPLETE
                    </span>
                  )}
                </div>
                
                {/* Vintage mechanical striped railroad progress container */}
                <div className="relative border-2 border-ink bg-paper h-[13px] shadow-[1px_1px_0px_#1A1A1B] flex items-center overflow-hidden">
                  {/* Railway ties background lines inside the progress bar */}
                  <div className="absolute inset-0 flex justify-between pointer-events-none opacity-[0.12] px-2">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="w-[1.5px] h-full bg-ink" />
                    ))}
                  </div>

                  {currentPin ? (
                    <div 
                      className="h-full relative transition-all duration-500 ease-out fill-current"
                      style={{ 
                        width: `${elapsedPercent}%`,
                        backgroundColor: currentPin.color || '#E11D48',
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(26,26,27,0.06), rgba(26,26,27,0.06) 5px, transparent 5px, transparent 10px)'
                      }}
                    />
                  ) : nextPin ? (
                    <div 
                      className="h-full bg-amber-200/55 animate-pulse relative transition-all"
                      style={{ 
                        width: '100%',
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(217,119,6,0.08), rgba(217,119,6,0.08) 6px, transparent 6px, transparent 12px)'
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Horizontal Transit Line Map (Subway route rendering) */}
            {sortedPins.length > 0 && (
              <div className="relative mt-2 border-t-2 border-dashed border-ink/15 pt-2">
                <div className="font-mono text-[7.5px] font-black uppercase tracking-wider text-ink-light mb-2 flex items-center gap-1.5">
                  <Milestone size={10} className="shrink-0 text-ink-light" />
                  STATION ROUTE MAP (TOTAL SCHEDULED HOURS: {sortedPins.reduce((sum, p) => {
                    const startM = p.startHour * 60 + p.startMinute;
                    const endM = p.endHour * 60 + p.endMinute;
                    return sum + (endM - startM) / 60;
                  }, 0).toFixed(1)} hrs)
                </div>

                {/* Simulated subway system track alignment */}
                <div className="relative flex items-center justify-between px-6 py-2 mt-1 gap-4 overflow-x-auto scrollbar-thin">
                  {/* Outer mechanical line */}
                  <div className="absolute left-10 right-10 h-[4.5px] bg-ink/10 rounded-full" />
                  
                  {sortedPins.map((p) => {
                    const isActive = currentPin?.id === p.id;
                    const isNext = !currentPin && nextPin?.id === p.id;
                    
                    const startM = p.startHour * 60 + p.startMinute;
                    const endM = p.endHour * 60 + p.endMinute;
                    const durationHrs = (endM - startM) / 60;

                    return (
                      <div key={p.id} className="relative z-10 flex flex-col items-center min-w-[75px] max-w-[100px]">
                        {/* Transit connection Station Bullet marker button */}
                        <div 
                          className={cn(
                            "w-5 h-5 rounded-full border-[3px] border-ink flex items-center justify-center transition-all bg-paper relative shadow-[1px_1px_0px_rgba(0,0,0,0.15)]",
                            isActive ? "scale-115 ring-4 ring-emerald-400/30" : "",
                            isNext ? "ring-2 ring-amber-400/30" : ""
                          )}
                        >
                          <div 
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                        </div>

                        {/* Station badge Details box */}
                        <div className="flex flex-col items-center mt-2 text-center px-1">
                          <span className={cn(
                            "font-sans font-black uppercase text-[8px] tracking-tight truncate max-w-[78px] leading-tight",
                            isActive ? "text-emerald-700" : "text-ink/80",
                            isNext ? "text-amber-700" : ""
                          )}>
                            {p.name}
                          </span>
                          <span className="font-mono text-[6.5px] font-bold text-ink-light flex items-center gap-0.5 leading-none mt-0.5 whitespace-nowrap">
                            ⏰ {durationHrs < 1 ? `${Math.round(durationHrs * 60)}m` : `${durationHrs.toFixed(1)}h`}
                          </span>
                          <span className="font-mono text-[5.5px] text-ink-light/65 uppercase leading-none mt-0.5">
                            {formatPinTime(p.startHour, p.startMinute)}
                          </span>
                        </div>

                        {/* YOU ARE HERE miniature mechanical arrow marker pin */}
                        {isActive && (
                          <div className="absolute -top-3.5 flex flex-col items-center transition-all">
                            <span className="font-mono text-[5.5px] font-black text-emerald-600 tracking-wider">HERE</span>
                            <div className="w-[1.5px] h-1 bg-emerald-600 animate-[bounce_1s_infinite]" />
                          </div>
                        )}
                        {isNext && (
                          <div className="absolute -top-3.5 flex flex-col items-center transition-all">
                            <span className="font-mono text-[5.5px] font-black text-amber-600 tracking-wider">NEXT</span>
                            <div className="w-[1.5px] h-1 bg-amber-600" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => {
          const todayStr = format(toIST(new Date()), 'yyyy-MM-dd');
          setPrefilledValues({
            startDate: todayStr,
            endDate: todayStr,
            time: '10:30',
            endTime: '11:30'
          });
          setEditingTask(null);
          setIsDrawerOpen(true);
        }}
        className="fixed bottom-24 right-6 md:bottom-12 md:right-12 w-16 h-16 bg-taxi border-[4px] border-ink flex items-center justify-center shadow-[6px_6px_0px_#1A1A1B] hover:shadow-[4px_4px_0px_#1A1A1B] hover:translate-y-[2px] hover:translate-x-[2px] hover:bg-taxi-hover active:shadow-none active:translate-y-[6px] active:translate-x-[6px] transition-all z-20 group"
      >
        <Plus size={32} className="text-ink group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
        {/* Industrial mechanical details */}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-ink/20"></div>
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-ink/20"></div>
        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-ink/20"></div>
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-ink/20"></div>
      </button>

      {/* Task Drawer overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-end font-sans">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={handleCloseDrawer}></div>
          
          <div className="relative w-full md:w-[450px] h-[90vh] md:h-screen bg-paper border-l-[6px] border-t-[6px] md:border-t-0 border-ink shadow-[-10px_0px_0px_#F7C331] flex flex-col transform translate-x-0 transition-transform animate-in slide-in-from-right md:slide-in-from-right duration-300">
            
            <div className="bg-ink text-paper p-4 flex justify-between items-center border-b-[6px] border-taxi shrink-0">
              <div>
                <h3 className="font-sans font-black text-2xl uppercase tracking-tight">
                  {editingTask ? 'Modify Dispatch' : 'New Dispatch'}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-widest font-bold opacity-80 text-taxi">
                  {editingTask ? 'Edit the dispatch parameters.' : 'File an objective for the record.'}
                </p>
              </div>
              <button onClick={handleCloseDrawer} className="text-paper hover:text-taxi transition-colors">
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
               <DrawForm 
                 addTask={(tk) => { addTask(tk); handleCloseDrawer(); }} 
                 updateTask={updateTask}
                 initialTask={editingTask}
                 initialStartDate={prefilledValues?.startDate}
                 initialEndDate={prefilledValues?.endDate}
                 initialTime={prefilledValues?.time}
                 initialEndTime={prefilledValues?.endTime}
                 onComplete={handleCloseDrawer}
               />
             </div>

          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/75 backdrop-blur-sm" onClick={() => setSelectedTask(null)}></div>
          
          <div className="relative w-full max-w-md max-h-[85vh] md:max-h-[90vh] bg-paper border-[6px] border-ink shadow-[8px_8px_0px_#1A1A1B] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Ticket Rip Top */}
            <div className="bg-ink text-paper p-4 flex justify-between items-center border-b-[6px] border-taxi shrink-0">
              <div>
                <span className="font-mono text-[9px] font-black uppercase text-taxi tracking-widest">
                  Operations Dispatch
                </span>
                <h3 className="font-sans font-black text-xl uppercase tracking-tight leading-none mt-1">
                  Dispatch Dossier
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedTask(null)} 
                className="text-paper hover:text-taxi transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Ticket Main Details */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Title Block */}
              <div className="border-b-[4px] border-ink pb-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={cn(
                    "font-mono text-[9px] font-bold uppercase px-2 py-0.5 border-2 border-ink",
                    selectedTask.priority === 'urgent' ? "bg-subway-red text-white" : "bg-taxi text-ink"
                  )}>
                    {selectedTask.priority} priority
                  </span>
                  {selectedTask.tags?.map(t => (
                    <span key={t} className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 border-2 border-ink bg-paper-dark">
                      {t}
                    </span>
                  ))}
                </div>
                <h4 className="font-sans font-black text-2xl tracking-tight text-ink leading-tight">
                  {selectedTask.title}
                </h4>
              </div>

              {/* Deadline & Time */}
              <div className="border-[3px] border-ink bg-paper divide-y-[3px] divide-ink overflow-hidden shadow-[3px_3px_0px_#1A1A1B] select-none">
                {/* Header banner */}
                <div className="bg-ink text-paper px-3 py-1.5 flex justify-between items-center">
                  <span className="font-mono text-[9px] font-black uppercase tracking-wider">
                    DEPARTURE & ARRIVAL TRANSIT LOG
                  </span>
                  <span className="font-mono text-[8px] opacity-75 font-bold">
                    DOCKET NO. {selectedTask.id ? selectedTask.id.slice(0, 6).toUpperCase() : 'N/A'}
                  </span>
                </div>
                
                {/* Information Grid */}
                <div className={`grid ${selectedTask.endTime ? 'grid-cols-2 divide-x-[3px] divide-ink' : 'grid-cols-1'}`}>
                  {/* Departure Block */}
                  <div className="p-3 bg-[#FFFDF5]">
                    <span className="font-mono text-[9px] font-black uppercase tracking-wider text-subway-red block mb-1">
                      ◀ DEPARTURE
                    </span>
                    <div className="flex items-baseline gap-2">
                       <span className="font-sans font-black text-2xl tracking-tighter text-ink leading-none">
                        {selectedTask.deadline ? format(new Date(selectedTask.deadline), 'dd') : '--'}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-sans font-extrabold text-[11px] uppercase text-ink leading-none">
                          {selectedTask.deadline ? format(new Date(selectedTask.deadline), 'MMM yyyy') : 'NO DATE'}
                        </span>
                        <span className="font-mono text-[8px] font-black text-ink/60 uppercase mt-0.5 leading-none">
                          {selectedTask.deadline ? format(new Date(selectedTask.deadline), 'EEEE') : ''}
                        </span>
                      </div>
                    </div>
                    {/* Departure Time */}
                    <div className="mt-3 pt-2 border-t border-dashed border-ink/35 flex items-center gap-1.5">
                      <span className="font-mono text-[8px] bg-ink text-paper px-1.5 py-0.5 font-black uppercase tracking-wider rounded-xs leading-none">
                        DEP
                      </span>
                      <span className="font-sans font-black text-xs uppercase text-ink leading-none">
                        {selectedTask.deadline ? format(new Date(selectedTask.deadline), 'hh:mm a') : 'ANYTIME'}
                      </span>
                    </div>
                  </div>

                  {/* Arrival Block (if selectedTask.endTime exists) */}
                  {selectedTask.endTime && (
                    <div className="p-3 bg-[#FFFEEF]">
                      <span className="font-mono text-[9px] font-black uppercase tracking-wider text-[#10B981] block mb-1">
                        ▶ ARRIVAL
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-sans font-black text-2xl tracking-tighter text-ink leading-none">
                          {format(new Date(selectedTask.endTime), 'dd')}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-sans font-extrabold text-[11px] uppercase text-ink leading-none">
                            {format(new Date(selectedTask.endTime), 'MMM yyyy')}
                          </span>
                          <span className="font-mono text-[8px] font-black text-ink/60 uppercase mt-0.5 leading-none">
                            {format(new Date(selectedTask.endTime), 'EEEE')}
                          </span>
                        </div>
                      </div>
                      {/* Arrival Time */}
                      <div className="mt-3 pt-2 border-t border-dashed border-ink/35 flex items-center gap-1.5">
                        <span className="font-mono text-[8px] bg-ink text-paper px-1.5 py-0.5 font-black uppercase tracking-wider rounded-xs leading-none">
                          ARR
                        </span>
                        <span className="font-sans font-black text-xs uppercase text-ink leading-none">
                          {format(new Date(selectedTask.endTime), 'hh:mm a')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Single day footer if no endTime */}
                {!selectedTask.endTime && (
                  <div className="bg-[#FFFEEF] px-3 py-2 flex items-center justify-between text-ink">
                    <span className="font-mono text-[8px] font-black uppercase opacity-60">Transit Scope</span>
                    <span className="font-sans font-extrabold text-[10px] uppercase flex items-center gap-1">
                      ⚡ SINGLE-DAY DISPATCH PASS
                    </span>
                  </div>
                )}
              </div>

              {/* Description / Notes */}
              <div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60 block mb-1">Dossier Notes</span>
                <p className="bg-[#eeeadf] border-2 border-ink p-3 font-mono text-xs font-bold leading-relaxed text-ink/80 min-h-[60px] whitespace-pre-line">
                  {selectedTask.description || "NO ADDITIONAL SUB-INTELLIGENCE RECORDED."}
                </p>
              </div>

              {/* Status Section */}
              <div className="flex justify-between items-center bg-[#eeeadf] border-2 border-ink p-3">
                <div>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60 block">Current Status</span>
                  <span className="font-mono text-xs font-black uppercase text-ink mt-0.5 block">
                    {selectedTask.status === 'todo' && '● STANDBY (TODO)'}
                    {selectedTask.status === 'in-progress' && '⚡ IN TRANSIT (ACTIVE)'}
                    {selectedTask.status === 'done' && '✓ ARRIVED (COMPLETED)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toggleTask(selectedTask.id);
                    // Cycle status in local state for seamless feel
                    const statuses = ['todo', 'in-progress', 'done'] as const;
                    const nextIdx = (statuses.indexOf(selectedTask.status) + 1) % statuses.length;
                    setSelectedTask({ ...selectedTask, status: statuses[nextIdx] });
                  }}
                  className="bg-taxi border-[3px] border-ink px-4 py-1.5 font-mono text-[10px] font-black uppercase shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all"
                >
                  Cycle Status
                </button>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-4 w-full">
                {isConfirmingDelete ? (
                  <div className="bg-[#EF4444]/15 border-[3px] border-dashed border-[#EF4444] p-4 text-center space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <p className="font-mono text-[9px] font-black uppercase text-[#EF4444] tracking-wider">
                      ⚠ Confirm annihilation of this dispatch?
                    </p>
                    {selectedTask.id.includes('::') && (
                      <p className="font-mono text-[8.5px] font-black uppercase text-ink bg-taxi px-1.5 py-0.5 inline-block border border-ink">
                        Scope: {deleteMode === 'this' ? 'THIS INSTANCE ONLY' : deleteMode === 'following' ? 'THIS & FOLLOWING' : 'ALL INSTANCES'}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedTask.id.includes('::')) {
                            deleteTask(selectedTask.id, deleteMode);
                          } else {
                            deleteTask(selectedTask.id);
                          }
                          setSelectedTask(null);
                        }}
                        className="flex-1 bg-[#EF4444] text-white border-[3px] border-ink py-2 font-mono text-[10px] font-black uppercase shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all cursor-pointer"
                      >
                        YES, DELETE
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="flex-1 bg-paper border-[3px] border-ink py-2 font-mono text-[10px] font-black uppercase hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all cursor-pointer"
                      >
                        NO, KEEP IT
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {selectedTask.id.includes('::') ? (
                      <div className="flex gap-3 w-full">
                        {/* Deletion Scope Selector Button */}
                        <div className="relative w-2/5 min-h-[42px] flex">
                          <button
                            type="button"
                            onClick={() => setIsDeleteSelectorOpen(!isDeleteSelectorOpen)}
                            className="w-full bg-[#FFFEEF] text-ink border-[3px] border-ink py-2 px-1.5 font-mono text-[9px] font-black uppercase shadow-[3px_3px_0px_#1A1A1B] hover:bg-taxi/20 active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all text-center flex items-center justify-center gap-1.5"
                            title="Select scope of deletion"
                          >
                            <span className="truncate">{deleteMode === 'this' ? 'Only This' : deleteMode === 'following' ? 'Following' : 'All'}</span>
                            <span className="text-[7px] shrink-0">▼</span>
                          </button>
                          
                          {isDeleteSelectorOpen && (
                            <>
                              <div className="fixed inset-0 z-[100]" onClick={() => setIsDeleteSelectorOpen(false)} />
                              <div className="absolute left-0 bottom-full mb-1.5 bg-[#FFFEEF] border-[3px] border-ink text-ink font-mono text-[9px] font-black uppercase shadow-[4px_4px_0px_#1a1a1b] w-[140px] z-[110] flex flex-col rounded-sm">
                                <div className="px-2 py-1 bg-ink text-paper text-[8px] font-black border-b-[3px] border-ink uppercase tracking-wider">
                                  Scope of Removal
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteMode('this');
                                    setIsDeleteSelectorOpen(false);
                                  }}
                                  className={`px-2 py-2 text-left border-b-2 border-ink hover:bg-ink hover:text-paper transition-all ${deleteMode === 'this' ? 'bg-taxi/30 text-ink' : ''}`}
                                >
                                  Only This Event
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteMode('following');
                                    setIsDeleteSelectorOpen(false);
                                  }}
                                  className={`px-2 py-2 text-left border-b-2 border-ink hover:bg-ink hover:text-paper transition-all ${deleteMode === 'following' ? 'bg-taxi/30 text-ink' : ''}`}
                                >
                                  This & Following
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteMode('all');
                                    setIsDeleteSelectorOpen(false);
                                  }}
                                  className={`px-2 py-2 text-left hover:bg-ink hover:text-paper transition-all ${deleteMode === 'all' ? 'bg-taxi/30 text-ink' : ''}`}
                                >
                                  All Events
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Trigger Button */}
                        <button
                          onClick={() => {
                            setIsConfirmingDelete(true);
                          }}
                          className="w-3/5 bg-[#EF4444] text-white border-[3px] border-ink py-2 font-mono text-[10px] font-black uppercase shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all flex items-center justify-center min-h-[42px]"
                          title="Annihilate selected instances"
                        >
                          Annihilate
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setIsConfirmingDelete(true);
                        }}
                        className="flex-1 bg-[#EF4444] text-[#FFFFFF] border-[3px] border-ink py-2.5 font-mono text-[10px] font-black uppercase shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all cursor-pointer"
                      >
                        Annihilate Dispatch
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingTask(selectedTask);
                        setSelectedTask(null);
                        setIsDrawerOpen(true);
                      }}
                      className="flex-1 bg-taxi hover:bg-taxi-hover text-ink border-[3px] border-ink py-2.5 font-mono text-[10px] font-black uppercase shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit size={11} strokeWidth={3} /> Edit Dispatch
                    </button>
                  </>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Birthdays Manager Modal was removed because it is now rendered globally at the app root level */}

      {/* TIME PINS (SECTIONS OF THE DAY) DIALOG MODAL */}
      {pinModal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 select-none">
          <div 
            className="absolute inset-0 bg-ink/75 backdrop-blur-sm" 
            onClick={() => setPinModal({ isOpen: false })}
          />
          
          <div className="relative w-full max-w-sm bg-paper border-[6px] border-ink shadow-[8px_8px_0px_#1A1A1B] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-ink text-paper p-4 flex justify-between items-center border-b-[6px] border-taxi shrink-0">
              <div className="flex items-center gap-2">
                <SketchPushPin color={pinFormColor} size={28} />
                <div className="text-left">
                  <span className="font-mono text-[9px] font-black uppercase text-taxi tracking-widest leading-none block">
                    CHRONOLOGY PIN
                  </span>
                  <h3 className="font-sans font-black text-lg uppercase tracking-tight leading-none mt-1">
                    {pinModal.pinId ? 'MODIFY SECTION' : 'ANCHOR SECTION'}
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPinModal({ isOpen: false })} 
                className="text-paper hover:text-taxi transition-colors text-xl font-bold cursor-pointer"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <div className="p-5 space-y-4 overflow-y-auto">
              
              {/* Error banner */}
              {pinFormError && (
                <div className="bg-[#EF4444]/15 border-2 border-dashed border-[#EF4444] p-2.5 text-center font-mono text-[9px] font-black text-[#EF4444] uppercase tracking-wider rounded">
                  ⚠ {pinFormError}
                </div>
              )}

              {/* Input: Name */}
              <div className="space-y-1 block text-left">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60 block">Section Name / Label</label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="E.G., MORNING ROUTINE, SHIFT A..."
                  value={pinFormName}
                  onChange={(e) => setPinFormName(e.target.value)}
                  className="w-full bg-paper-dark border-[3px] border-ink p-2 font-mono text-xs font-black uppercase focus:outline-none focus:bg-paper"
                />
              </div>

              {/* Time inputs: Start and End */}
              {(() => {
                const start12 = to12HourFrom24(pinFormStartHour);
                const end12 = to12HourFrom24(pinFormEndHour);

                return (
                  <div className="space-y-4">
                    {/* Start Time Section */}
                    <div className="space-y-1 block text-left">
                      <div className="flex justify-between items-center">
                        <label className="font-mono text-[10px] font-black uppercase tracking-widest opacity-65 block">Start Time (IST)</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {/* Hour and Minute Grid */}
                        <div className="flex gap-1.5">
                          {/* Hour custom Styled select */}
                          <div className="relative flex-1">
                            <select
                              value={start12.hour12}
                              onChange={(e) => {
                                const newHour12 = Number(e.target.value);
                                const new24 = to24HourFrom12(newHour12, start12.ampm);
                                setPinFormStartHour(new24);
                              }}
                              className="w-full bg-paper border-[3px] border-ink p-2 font-mono text-xs font-black shadow-[2px_2px_0px_#1A1A1B] hover:bg-paper-dark focus:outline-none focus:bg-paper cursor-pointer rounded-none appearance-none"
                              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='black' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px', paddingRight: '28px' }}
                            >
                              {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => (
                                <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                              ))}
                            </select>
                          </div>

                          {/* Minutes custom Styled select */}
                          <div className="relative w-20">
                            <select
                              value={pinFormStartMinute}
                              onChange={(e) => setPinFormStartMinute(Number(e.target.value))}
                              className="w-full bg-paper border-[3px] border-ink p-2 font-mono text-xs font-black shadow-[2px_2px_0px_#1A1A1B] hover:bg-paper-dark focus:outline-none focus:bg-paper cursor-pointer rounded-none appearance-none"
                              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='black' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`, backgroundPosition: 'right 6px center', backgroundRepeat: 'no-repeat', backgroundSize: '14px', paddingRight: '22px' }}
                            >
                              {Array.from({ length: 12 }).map((_, i) => {
                                const m = i * 5;
                                return (
                                  <option key={m} value={m}>:{String(m).padStart(2, '0')}</option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {/* AM / PM Segmented selector */}
                        <div className="flex border-[3px] border-ink divide-x-[3px] divide-ink shadow-[2px_2px_0px_#1A1A1B] rounded-none overflow-hidden h-[38px]">
                          <button
                            type="button"
                            onClick={() => {
                              const new24 = to24HourFrom12(start12.hour12, 'AM');
                              setPinFormStartHour(new24);
                            }}
                            className={cn(
                              "flex-1 font-mono text-[10px] md:text-xs font-black cursor-pointer transition-colors focus:outline-none",
                              start12.ampm === 'AM' ? "bg-taxi text-ink" : "bg-paper text-ink/40 hover:bg-paper-dark"
                            )}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const new24 = to24HourFrom12(start12.hour12, 'PM');
                              setPinFormStartHour(new24);
                            }}
                            className={cn(
                              "flex-1 font-mono text-[10px] md:text-xs font-black cursor-pointer transition-colors focus:outline-none",
                              start12.ampm === 'PM' ? "bg-taxi text-ink" : "bg-paper text-ink/40 hover:bg-paper-dark"
                            )}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* End Time Section */}
                    <div className="space-y-1 block text-left">
                      <div className="flex justify-between items-center">
                        <label className="font-mono text-[10px] font-black uppercase tracking-widest opacity-65 block">End Time (IST)</label>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {/* Hour and Minute Grid */}
                        <div className="flex gap-1.5">
                          {/* Hour custom Styled select */}
                          <div className="relative flex-1">
                            <select
                              value={end12.hour12}
                              onChange={(e) => {
                                const newHour12 = Number(e.target.value);
                                const new24 = to24HourFrom12(newHour12, end12.ampm);
                                setPinFormEndHour(new24);
                              }}
                              className="w-full bg-paper border-[3px] border-ink p-2 font-mono text-xs font-black shadow-[2px_2px_0px_#1A1A1B] hover:bg-paper-dark focus:outline-none focus:bg-paper cursor-pointer rounded-none appearance-none"
                              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='black' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`, backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px', paddingRight: '28px' }}
                            >
                              {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => (
                                <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                              ))}
                            </select>
                          </div>

                          {/* Minutes custom Styled select */}
                          <div className="relative w-20">
                            <select
                              value={pinFormEndMinute}
                              onChange={(e) => setPinFormEndMinute(Number(e.target.value))}
                              className="w-full bg-paper border-[3px] border-ink p-2 font-mono text-xs font-black shadow-[2px_2px_0px_#1A1A1B] hover:bg-paper-dark focus:outline-none focus:bg-paper cursor-pointer rounded-none appearance-none"
                              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='black' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`, backgroundPosition: 'right 6px center', backgroundRepeat: 'no-repeat', backgroundSize: '14px', paddingRight: '22px' }}
                            >
                              {Array.from({ length: 12 }).map((_, i) => {
                                const m = i * 5;
                                return (
                                  <option key={m} value={m}>:{String(m).padStart(2, '0')}</option>
                                );
                              })}
                            </select>
                          </div>
                        </div>

                        {/* AM / PM Segmented selector */}
                        <div className="flex border-[3px] border-ink divide-x-[3px] divide-ink shadow-[2px_2px_0px_#1A1A1B] rounded-none overflow-hidden h-[38px]">
                          <button
                            type="button"
                            onClick={() => {
                              const new24 = to24HourFrom12(end12.hour12, 'AM');
                              setPinFormEndHour(new24);
                            }}
                            className={cn(
                              "flex-1 font-mono text-[10px] md:text-xs font-black cursor-pointer transition-colors focus:outline-none",
                              end12.ampm === 'AM' ? "bg-taxi text-ink" : "bg-paper text-ink/40 hover:bg-paper-dark"
                            )}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const new24 = to24HourFrom12(end12.hour12, 'PM');
                              setPinFormEndHour(new24);
                            }}
                            className={cn(
                              "flex-1 font-mono text-[10px] md:text-xs font-black cursor-pointer transition-colors focus:outline-none",
                              end12.ampm === 'PM' ? "bg-taxi text-ink" : "bg-paper text-ink/40 hover:bg-paper-dark"
                            )}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Color Selector */}
              <div className="space-y-1.5 block text-left">
                <label className="font-mono text-[10px] font-black uppercase tracking-widest opacity-60 block">Emblem Colorway</label>
                <div className="grid grid-cols-8 gap-1.5 pt-1">
                  {[
                    { hex: '#F7C331', name: 'TAXI YELLOW' },
                    { hex: '#EF4444', name: 'REDLINE EXPRESS' },
                    { hex: '#3B82F6', name: 'SUBWAY BLUE' },
                    { hex: '#10B981', name: 'TUNNEL GREEN' },
                    { hex: '#F97316', name: 'TANGERINE LINE' },
                    { hex: '#8B5CF6', name: 'TROLLEY PURPLE' },
                    { hex: '#EC4899', name: 'DOWNTOWN PINK' },
                    { hex: '#14B8A6', name: 'TEAL TERMINAL' },
                    { hex: '#06B6D4', name: 'OCEAN OVERPASS' },
                    { hex: '#22C55E', name: 'FOREST CANOPY' },
                    { hex: '#84CC16', name: 'LIME TRAJECTORY' },
                    { hex: '#F59E0B', name: 'STEEL GOLD' },
                    { hex: '#64748B', name: 'INDUSTRIAL SLATE' },
                    { hex: '#6366F1', name: 'INDIGO RUN' },
                    { hex: '#D946EF', name: 'FUCHSIA DEPOT' },
                    { hex: '#F43F5E', name: 'CHERRY JUNCTION' },
                  ].map((colorOpt) => (
                    <button
                      key={colorOpt.hex}
                      type="button"
                      onClick={() => setPinFormColor(colorOpt.hex)}
                      className={cn(
                        "aspect-square w-full rounded-sm border-2 border-ink shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-95 transition-all relative cursor-pointer block",
                        pinFormColor === colorOpt.hex ? "ring-2 ring-offset-1 ring-ink scale-110 border-ink font-bold" : ""
                      )}
                      style={{ backgroundColor: colorOpt.hex }}
                      title={colorOpt.name}
                    >
                      {pinFormColor === colorOpt.hex && (
                        <span className="absolute inset-0 flex items-center justify-center font-sans text-[10px] font-black text-ink select-none" style={{ filter: 'drop-shadow(0.5px 0.5px 1px white)' }}>
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="font-mono text-[8 rounded] text-[8.5px] font-black uppercase tracking-wide flex items-center gap-1.5">
                  <span className="opacity-60">SELECTED:</span>
                  <span style={{ color: pinFormColor }} className="font-extrabold filter brightness-90">
                    {
                      [
                        { hex: '#F7C331', name: 'TAXI YELLOW' },
                        { hex: '#EF4444', name: 'REDLINE EXPRESS' },
                        { hex: '#3B82F6', name: 'SUBWAY BLUE' },
                        { hex: '#10B981', name: 'TUNNEL GREEN' },
                        { hex: '#F97316', name: 'TANGERINE LINE' },
                        { hex: '#8B5CF6', name: 'TROLLEY PURPLE' },
                        { hex: '#EC4899', name: 'DOWNTOWN PINK' },
                        { hex: '#14B8A6', name: 'TEAL TERMINAL' },
                        { hex: '#06B6D4', name: 'OCEAN OVERPASS' },
                        { hex: '#22C55E', name: 'FOREST CANOPY' },
                        { hex: '#84CC16', name: 'LIME TRAJECTORY' },
                        { hex: '#F59E0B', name: 'STEEL GOLD' },
                        { hex: '#64748B', name: 'INDUSTRIAL SLATE' },
                        { hex: '#6366F1', name: 'INDIGO RUN' },
                        { hex: '#D946EF', name: 'FUCHSIA DEPOT' },
                        { hex: '#F43F5E', name: 'CHERRY JUNCTION' },
                      ].find(c => c.hex === pinFormColor)?.name || 'MATCHING TRANSIT COLOR'
                    }
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 bg-paper-dark border-t-4 border-ink flex items-center justify-between gap-3 shrink-0">
              {pinModal.pinId ? (
                isConfirmingPinDelete ? (
                  <div className="flex gap-1.5 items-center">
                    <span className="font-mono text-[9px] font-black text-[#EF4444] animate-pulse mr-1">SURE?</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeletePin(pinModal.pinId!);
                        setIsConfirmingPinDelete(false);
                      }}
                      className="px-2.5 py-1.5 bg-[#EF4444] text-white border-2 border-ink font-mono text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_#1A1A1B] active:shadow-none active:translate-x-[0.5px] active:translate-y-[0.5px] cursor-pointer"
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingPinDelete(false)}
                      className="px-2.5 py-1.5 bg-paper text-ink border-2 border-ink font-mono text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_#1A1A1B] active:shadow-none active:translate-x-[0.5px] active:translate-y-[0.5px] cursor-pointer"
                    >
                      NO
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingPinDelete(true)}
                    className="px-3 py-2 bg-[#EF4444] text-white border-2 border-ink font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_#1A1A1B] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all hover:bg-[#DC2626] cursor-pointer"
                  >
                    DELETE PIN
                  </button>
                )
              ) : (
                <div />
              )}
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPinModal({ isOpen: false })}
                  className="px-3 py-2 bg-paper border-2 border-ink font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_#1A1A1B] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all hover:bg-paper-dark cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSavePin}
                  className="px-4 py-2 bg-taxi hover:bg-taxi/90 border-2 border-ink text-ink font-mono text-[9px] font-black uppercase shadow-[2px_2px_0px_#1A1A1B] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                >
                  SAVE ANCHOR
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function MiniCalendarPicker({
  value,
  onChange,
  onClose,
  minDate,
}: {
  value: string;
  onChange: (dateStr: string) => void;
  onClose: () => void;
  minDate?: string;
}) {
  const parsedDate = parse(value, 'yyyy-MM-dd', new Date());
  const [viewDate, setViewDate] = useState(parsedDate);

  const monthStart = startOfWeek(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), { weekStartsOn: 1 });
  const daysInMonth: Date[] = [];
  
  let currentDay = monthStart;
  for (let i = 0; i < 42; i++) {
    daysInMonth.push(currentDay);
    currentDay = addDays(currentDay, 1);
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  return (
    <div className="bg-paper border-[4px] border-ink p-3 shadow-[8px_8px_0px_#1A1A1B] text-ink max-w-[280px] select-none font-sans">
      {/* Header Month / Nav */}
      <div className="flex justify-between items-center mb-2 border-b-2 border-ink/20 pb-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="font-mono font-bold text-xs px-2.5 py-1 border-2 border-ink hover:bg-ink hover:text-paper active:bg-paper-dark transition-all shadow-[2px_2px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px]"
        >
          &lt;
        </button>
        <span className="font-mono text-[10px] font-black uppercase tracking-wider text-ink/80">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="font-mono font-bold text-xs px-2.5 py-1 border-2 border-ink hover:bg-ink hover:text-paper active:bg-paper-dark transition-all shadow-[2px_2px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px]"
        >
          &gt;
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[8.5px] font-bold opacity-60 uppercase mb-1">
        <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const isSelected = dayStr === value;
          const isCurrentMonth = day.getMonth() === viewDate.getMonth();
          const isDisabled = !!minDate && dayStr < minDate;

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                onChange(dayStr);
                onClose();
              }}
              className={cn(
                "w-7 h-7 font-mono text-[10px] font-black transition-all border flex items-center justify-center cursor-pointer",
                isSelected
                  ? "bg-taxi text-ink border-ink font-black scale-105"
                  : "border-transparent text-ink hover:border-ink/50 hover:bg-paper-dark",
                !isCurrentMonth && !isSelected ? "opacity-30" : "",
                isDisabled ? "opacity-10 cursor-not-allowed pointer-events-none" : ""
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DrawForm({ 
  addTask,
  updateTask,
  initialTask,
  initialStartDate,
  initialEndDate,
  initialTime,
  initialEndTime,
  onComplete
}: { 
  addTask: (t: any) => void;
  updateTask?: (id: string, updatedFields: Partial<Omit<Task, 'id'>> & { updateMode?: 'this' | 'following' | 'all' }) => void;
  initialTask?: Task | null;
  initialStartDate?: string;
  initialEndDate?: string;
  initialTime?: string;
  initialEndTime?: string;
  onComplete: () => void;
}) {
  const [title, setTitle] = useState(initialTask ? initialTask.title : '');
  const [description, setDescription] = useState(initialTask ? initialTask.description || '' : '');
  
  const [startDate, setStartDate] = useState(() => {
    if (initialTask && initialTask.deadline) {
      return format(new Date(initialTask.deadline), 'yyyy-MM-dd');
    }
    return initialStartDate || format(toIST(new Date()), 'yyyy-MM-dd');
  });
  
  const [endDate, setEndDate] = useState(() => {
    if (initialTask && initialTask.endTime) {
      return format(new Date(initialTask.endTime), 'yyyy-MM-dd');
    }
    return initialEndDate || format(toIST(new Date()), 'yyyy-MM-dd');
  });

  const [time, setTime] = useState(() => {
    if (initialTask && initialTask.deadline) {
      return format(new Date(initialTask.deadline), 'HH:mm');
    }
    return initialTime || '10:30';
  });

  const [endTime, setEndTime] = useState(() => {
    if (initialTask && initialTask.endTime) {
      return format(new Date(initialTask.endTime), 'HH:mm');
    }
    return initialEndTime || '11:30';
  });

  const [priority, setPriority] = useState<any>(initialTask ? initialTask.priority : 'medium');

  const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>(() => {
    if (initialTask) {
      return initialTask.recurring || 'none';
    }
    return 'none';
  });

  const [recurrenceRule, setRecurrenceRule] = useState<any>(() => {
    if (initialTask) {
      return initialTask.recurrenceRule;
    }
    return undefined;
  });

  const [isRecurringSelectorOpen, setIsRecurringSelectorOpen] = useState(false);
  const isRecurringInstance = !!initialTask && initialTask.id.includes('::');
  const [updateMode, setUpdateMode] = useState<'this' | 'following' | 'all'>('this');

  const [isStartPickerOpen, setIsStartPickerOpen] = useState(false);
  const [isEndPickerOpen, setIsEndPickerOpen] = useState(false);

  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);

  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);

  // Sync state if prefilled properties shift
  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority);
      setRecurring(initialTask.recurring || 'none');
      setRecurrenceRule(initialTask.recurrenceRule);
      if (initialTask.deadline) {
        setStartDate(format(new Date(initialTask.deadline), 'yyyy-MM-dd'));
        setTime(format(new Date(initialTask.deadline), 'HH:mm'));
      }
      if (initialTask.endTime) {
        setEndDate(format(new Date(initialTask.endTime), 'yyyy-MM-dd'));
        setEndTime(format(new Date(initialTask.endTime), 'HH:mm'));
      }
    } else {
      if (initialStartDate) setStartDate(initialStartDate);
      if (initialEndDate) setEndDate(initialEndDate);
      if (initialTime) setTime(initialTime);
      if (initialEndTime) setEndTime(initialEndTime);
      setRecurring('none');
      setRecurrenceRule(undefined);
    }
  }, [initialStartDate, initialEndDate, initialTime, initialEndTime, initialTask]);

  // Click outside to close calendar popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) {
        setIsStartCalendarOpen(false);
      }
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) {
        setIsEndCalendarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    try {
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      return format(parsed, 'EEE, d MMM, yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return 'Select Time';
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'pm' : 'am';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const displayM = String(m).padStart(2, '0');
      return `${displayH}:${displayM} ${period}`;
    } catch (e) {
      return timeStr;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let deadlineDate: Date | undefined;
    if (startDate) {
      deadlineDate = new Date(`${startDate}T${time || '10:30'}`);
    }

    let endDateTime: Date | undefined;
    if (endDate && endTime) {
      endDateTime = new Date(`${endDate}T${endTime}`);
    } else if (startDate && endTime) {
      endDateTime = new Date(`${startDate}T${endTime}`);
    }

    if (deadlineDate && endDateTime && endDateTime < deadlineDate) {
      endDateTime = addDays(endDateTime, 1);
    }

    const resolvedRule = recurring === 'custom' ? recurrenceRule : undefined;

    if (initialTask && updateTask) {
      updateTask(initialTask.id, {
        title,
        description,
        priority,
        deadline: deadlineDate,
        endTime: endDateTime,
        recurring,
        recurrenceRule: resolvedRule,
        updateMode,
      });
    } else {
      addTask({
        title,
        description,
        priority,
        status: 'todo',
        deadline: deadlineDate,
        endTime: endDateTime,
        recurring,
        recurrenceRule: resolvedRule,
        tags: []
      });
    }
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isRecurringInstance && (
        <div className="bg-taxi/15 border-[3px] border-dashed border-ink p-4 space-y-2 select-none">
          <span className="font-mono text-[9px] font-black uppercase text-ink tracking-wider block">⚠️ Recurring Occurrence Redirection</span>
          <p className="font-sans font-bold text-xs uppercase leading-snug">
            This is an occurrence part of a repeating schedule. How do you wish to apply your modifications?
          </p>
          <div className="flex flex-col gap-2 pt-2 mt-2 border-t border-ink/15">
            <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase font-bold text-ink/85">
              <input 
                type="radio" 
                name="updateMode"
                checked={updateMode === 'this'} 
                onChange={() => setUpdateMode('this')} 
                className="accent-ink scale-110"
              />
              Only this instance
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase font-bold text-ink/85">
              <input 
                type="radio" 
                name="updateMode"
                checked={updateMode === 'following'} 
                onChange={() => setUpdateMode('following')} 
                className="accent-ink scale-110"
              />
              This and following events
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase font-bold text-ink/85">
              <input 
                type="radio" 
                name="updateMode"
                checked={updateMode === 'all'} 
                onChange={() => setUpdateMode('all')} 
                className="accent-ink scale-110"
              />
              All recurring instances
            </label>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60">Objective Title</label>
        <input 
          autoFocus
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-paper-dark border-[4px] border-ink p-3 font-sans font-black text-xl focus:outline-none focus:border-taxi focus:bg-paper transition-colors"
          placeholder="e.g. Board meeting..."
          required
        />
      </div>

      <div className="space-y-1 border-b-2 border-dashed border-ink/20 pb-6">
        <label className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-1">
          <Clock size={11} className="text-taxi" /> Transit Coordinates
        </label>
        
        {/* Beautiful thematic newspaper ledger box */}
        <div className="bg-paper-dark/60 border-[4px] border-ink p-4 shadow-[6px_6px_0px_#1A1A1B] flex flex-col divide-y-[3px] divide-ink font-sans">
          
          {/* Departure (OUTBOUND) */}
          <div className="pb-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            {/* Left Column: Date picker */}
            <div className="flex flex-col select-none relative" ref={startCalendarRef}>
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/50 mb-1 flex items-center gap-1">
                <span>01 // OUTBOUND DEPARTURE</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsStartCalendarOpen(!isStartCalendarOpen);
                  setIsEndCalendarOpen(false);
                }}
                className="font-sans text-lg md:text-xl font-black uppercase tracking-tight text-ink hover:text-taxi-hover transition-colors text-left focus:outline-none flex items-center gap-2 cursor-pointer"
              >
                <Calendar size={18} className="text-taxi shrink-0" strokeWidth={2.5} />
                {formatDisplayDate(startDate)}
              </button>
              {isStartCalendarOpen && (
                <div className="absolute top-[44px] left-0 z-50">
                  <MiniCalendarPicker
                    value={startDate}
                    onChange={(newValue) => {
                      setStartDate(newValue);
                      if (newValue > endDate) {
                        setEndDate(newValue);
                      }
                    }}
                    onClose={() => setIsStartCalendarOpen(false)}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Time picker */}
            <div className="flex flex-col md:items-end select-none">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/50 mb-1 md:text-right">
                DEPARTURE TIME
              </span>
              <button
                type="button"
                onClick={() => setIsStartPickerOpen(true)}
                className="font-mono text-lg md:text-xl font-black text-ink hover:text-taxi-hover transition-colors text-left md:text-right focus:outline-none flex items-center gap-2 cursor-pointer"
              >
                <Clock size={18} className="text-taxi shrink-0" strokeWidth={2.5} />
                {formatDisplayTime(time)}
              </button>
            </div>
          </div>

          {/* Arrival (INBOUND) */}
          <div className="pt-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            {/* Left Column: Date picker */}
            <div className="flex flex-col select-none relative" ref={endCalendarRef}>
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/50 mb-1 flex items-center gap-1">
                <span>02 // INBOUND ARRIVAL</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsEndCalendarOpen(!isEndCalendarOpen);
                  setIsStartCalendarOpen(false);
                }}
                className="font-sans text-lg md:text-xl font-black uppercase tracking-tight text-ink hover:text-taxi-hover transition-colors text-left focus:outline-none flex items-center gap-2 cursor-pointer"
              >
                <Calendar size={18} className="text-ink/60 shrink-0" strokeWidth={2.5} />
                {formatDisplayDate(endDate)}
              </button>
              {isEndCalendarOpen && (
                <div className="absolute top-[44px] left-0 z-50">
                  <MiniCalendarPicker
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    onClose={() => setIsEndCalendarOpen(false)}
                    minDate={startDate}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Time picker */}
            <div className="flex flex-col md:items-end select-none">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/50 mb-1 md:text-right">
                ARRIVAL TIME
              </span>
              <button
                type="button"
                onClick={() => setIsEndPickerOpen(true)}
                className="font-mono text-lg md:text-xl font-black text-ink hover:text-taxi-hover transition-colors text-left md:text-right focus:outline-none flex items-center gap-2 cursor-pointer"
              >
                <Clock size={18} className="text-ink/60 shrink-0" strokeWidth={2.5} />
                {formatDisplayTime(endTime)}
              </button>
            </div>
          </div>

        </div>
        <p className="font-mono text-[8px] text-ink/40 tracking-wider uppercase mt-1">
          ➔ Click date text for vintage newspaper-style calendar • Click time text for dial control
        </p>
      </div>

      {/* Repeating events section similar to Google Calendar */}
      <div className="space-y-1 relative">
        <label className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60">Transit Interval (Recurrence)</label>
        <button
          type="button"
          onClick={() => setIsRecurringSelectorOpen(!isRecurringSelectorOpen)}
          className="w-full bg-paper-dark border-[4px] border-ink p-3 font-sans font-black uppercase text-left flex justify-between items-center hover:bg-paper transition-colors cursor-pointer"
        >
          <span>
            {recurring === 'none' && 'Does not repeat'}
            {recurring === 'daily' && 'Every day'}
            {recurring === 'weekly' && 'Every week'}
            {recurring === 'monthly' && 'Every month'}
            {recurring === 'yearly' && 'Every year'}
            {recurring === 'custom' && `Custom: Repeat every ${recurrenceRule?.interval || 1} ${recurrenceRule?.frequency || 'day'}${ (recurrenceRule?.interval || 1) > 1 ? 's' : ''}`}
          </span>
          <span className="font-mono text-xs text-ink/50 select-none">▼</span>
        </button>

        {isRecurringSelectorOpen && (
          <div className="absolute top-[48px] left-0 right-0 z-50 bg-paper border-[4px] border-ink shadow-[8px_8px_0px_#1A1A1B] p-2 divide-y-2 divide-ink/10 select-none">
            {[
              { id: 'none', label: 'Does not repeat' },
              { id: 'daily', label: 'Every day' },
              { id: 'weekly', label: 'Every week' },
              { id: 'monthly', label: 'Every month' },
              { id: 'yearly', label: 'Every year' },
              { id: 'custom', label: 'Custom...' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setRecurring(opt.id as any);
                  if (opt.id === 'custom' && !recurrenceRule) {
                    setRecurrenceRule({
                      frequency: 'daily',
                      interval: 1,
                      daysOfWeek: [],
                    });
                  }
                  setIsRecurringSelectorOpen(false);
                }}
                className="w-full text-left font-mono text-xs uppercase font-extrabold px-3 py-2.5 hover:bg-taxi/20 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>{opt.label}</span>
                <div className="w-4 h-4 rounded-full border-2 border-ink flex items-center justify-center">
                  {recurring === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-taxi border border-ink" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {recurring === 'custom' && (
        <div className="bg-[#eeeadf]/60 border-[4px] border-ink p-4 shadow-[6px_6px_0px_#1A1A1B] space-y-4">
          <span className="font-mono text-[9px] font-black uppercase text-ink/70 tracking-widest block border-b-2 border-ink/10 pb-1">
            CUSTOM SCHEDULE PARAMETERS
          </span>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="font-mono text-[10px] font-bold uppercase shrink-0">Repeat Every:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={recurrenceRule?.interval || 1}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  setRecurrenceRule(prev => prev ? { ...prev, interval: val } : { frequency: 'daily', interval: val });
                }}
                className="w-16 bg-paper-dark border-2 border-ink p-1.5 focus:outline-none focus:bg-paper font-sans font-black text-center text-sm"
              />
              <div className="flex gap-1">
                {[
                  { id: 'daily', label: 'Day' },
                  { id: 'weekly', label: 'Wk' },
                  { id: 'monthly', label: 'Mo' },
                  { id: 'yearly', label: 'Yr' },
                ].map((freqOpt) => (
                  <button
                    key={freqOpt.id}
                    type="button"
                    onClick={() => {
                      setRecurrenceRule(prev => prev 
                        ? { ...prev, frequency: freqOpt.id as any } 
                        : { frequency: freqOpt.id as any, interval: 1 }
                      );
                    }}
                    className={cn(
                      "border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase transition-all text-center cursor-pointer",
                      recurrenceRule?.frequency === freqOpt.id
                        ? "bg-taxi text-ink border-ink"
                        : "bg-transparent text-ink border-ink/20 hover:border-ink"
                    )}
                  >
                    {freqOpt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {recurrenceRule?.frequency === 'weekly' && (
            <div className="space-y-1.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60 block">Repeat On (Days Of Week):</span>
              <div className="grid grid-cols-7 gap-1">
                {[
                  { id: 1, label: 'M' },
                  { id: 2, label: 'T' },
                  { id: 3, label: 'W' },
                  { id: 4, label: 'T' },
                  { id: 5, label: 'F' },
                  { id: 6, label: 'S' },
                  { id: 0, label: 'S' },
                ].map((dayOpt) => {
                  const selected = recurrenceRule.daysOfWeek?.includes(dayOpt.id) || false;
                  return (
                    <button
                      key={dayOpt.id}
                      type="button"
                      onClick={() => {
                        const currentDays = recurrenceRule.daysOfWeek || [];
                        let nextDays = [...currentDays];
                        if (currentDays.includes(dayOpt.id)) {
                          nextDays = nextDays.filter(d => d !== dayOpt.id);
                        } else {
                          nextDays.push(dayOpt.id);
                        }
                        setRecurrenceRule(prev => prev ? { ...prev, daysOfWeek: nextDays } : undefined);
                      }}
                      className={cn(
                        "w-full aspect-square border-2 font-mono text-xs font-bold transition-all text-center flex items-center justify-center cursor-pointer",
                        selected
                          ? "bg-ink text-paper border-ink"
                          : "bg-transparent border-ink/20 hover:border-ink"
                      )}
                    >
                      {dayOpt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-ink/10 pt-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 block">Ends (Occurrence Limit):</span>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase font-bold">
                <input
                  type="radio"
                  name="ends"
                  checked={!recurrenceRule?.until && !recurrenceRule?.count}
                  onChange={() => {
                    setRecurrenceRule(prev => {
                      if (!prev) return undefined;
                      const { until, count, ...rest } = prev;
                      return rest;
                    });
                  }}
                  className="accent-ink scale-110"
                />
                Never end
              </label>

              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase font-bold shrink-0">
                  <input
                    type="radio"
                    name="ends"
                    checked={!!recurrenceRule?.until}
                    onChange={() => {
                      setRecurrenceRule(prev => prev ? { ...prev, until: format(addDays(new Date(), 30), 'yyyy-MM-dd'), count: undefined } : undefined);
                    }}
                    className="accent-ink scale-110"
                  />
                  On Date:
                </label>
                {recurrenceRule?.until !== undefined && (
                  <input
                    type="date"
                    value={recurrenceRule.until}
                    onChange={(e) => {
                      setRecurrenceRule(prev => prev ? { ...prev, until: e.target.value } : undefined);
                    }}
                    className="bg-paper border-2 border-ink p-1 text-[11px] font-mono focus:outline-none"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase font-bold shrink-0">
                  <input
                    type="radio"
                    name="ends"
                    checked={!!recurrenceRule?.count}
                    onChange={() => {
                      setRecurrenceRule(prev => prev ? { ...prev, count: 12, until: undefined } : undefined);
                    }}
                    className="accent-ink scale-110"
                  />
                  Occurrence threshold:
                </label>
                {recurrenceRule?.count !== undefined && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      value={recurrenceRule.count}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setRecurrenceRule(prev => prev ? { ...prev, count: val } : undefined);
                      }}
                      className="w-12 bg-paper border-2 border-ink p-0.5 text-center text-xs focus:outline-none font-mono"
                    />
                    <span className="font-mono text-[9px] font-bold text-ink/60">OCCURRENCES</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60">Clearance Level (Priority)</label>
        <div className="grid grid-cols-3 gap-2">
          {['low', 'medium', 'urgent'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "border-[4px] py-2 font-mono text-xs font-bold uppercase text-center transition-all cursor-pointer",
                priority === p 
                  ? p === 'urgent' ? "bg-subway-red text-white border-ink shadow-[3px_3px_0px_#1A1A1B]" : "bg-taxi text-ink border-ink shadow-[3px_3px_0px_#1A1A1B]"
                  : "bg-transparent text-ink border-ink/30 hover:border-ink"
              )}
            >
              {p === 'urgent' ? 'P1' : p === 'medium' ? 'P2' : 'P3'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60">Dossier / Notes</label>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-paper-dark border-[4px] border-ink p-3 font-mono text-sm font-bold focus:outline-none focus:border-taxi focus:bg-paper min-h-[120px]"
          placeholder="Additional notes..."
        />
      </div>

      <button 
        type="submit"
        className="w-full py-4 mt-8 bg-ink text-paper font-sans font-black text-xl uppercase tracking-widest border-[4px] border-ink hover:bg-taxi hover:text-ink shadow-[6px_6px_0px_#1A1A1B] hover:shadow-[4px_4px_0px_#1A1A1B] hover:translate-y-[2px] transition-all active:shadow-none active:translate-y-[6px]"
      >
        Submit Dispatch
      </button>

      {/* Analog Clock Dial Pickers */}
      <AnalogClockPicker
        isOpen={isStartPickerOpen}
        onClose={() => setIsStartPickerOpen(false)}
        value={time}
        onChange={(newValue) => {
          setTime(newValue);
          const [h, m] = newValue.split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) {
            const nextHour = (h + 1) % 24;
            const nextHourStr = String(nextHour).padStart(2, '0');
            const mStr = String(m).padStart(2, '0');
            setEndTime(`${nextHourStr}:${mStr}`);
          }
        }}
        title="DEPARTURE TIME DIAL"
      />

      <AnalogClockPicker
        isOpen={isEndPickerOpen}
        onClose={() => setIsEndPickerOpen(false)}
        value={endTime}
        onChange={(newValue) => setEndTime(newValue)}
        title="ARRIVAL TIME DIAL"
      />

    </form>
  )
}
