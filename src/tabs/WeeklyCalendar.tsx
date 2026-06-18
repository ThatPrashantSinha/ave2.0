import React, { useState, useRef, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay, parse, getHours, getMinutes, addHours } from 'date-fns';
import { Task } from '../types';
import { cn, toIST } from '../lib/utils';
import { Clock, Tag, Briefcase, Plus, X, Calendar, Edit } from 'lucide-react';
import { AnalogClockPicker } from '../components/AnalogClockPicker';
import { getOccurrencesForDateRange } from '../lib/recurrence';

interface WeeklyCalendarProps {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask?: (id: string, updatedFields: Partial<Omit<Task, 'id'>> & { updateAllOccurrences?: boolean }) => void;
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

export function WeeklyCalendar({ tasks, addTask, toggleTask, deleteTask, updateTask }: WeeklyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(toIST(new Date()));
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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

  const gridRef = useRef<HTMLDivElement>(null);

  // Dynamic hour heights sizing: check if any day of this week has a task on this hour (or spanning across it).
  // Standard height is 85px (expanded to fit details comfortably).
  // Empty height is 30px (shrunk to compress whitespace).
  const { hourHeights, hourTops, totalGridHeight } = React.useMemo(() => {
    const heights = Array.from({ length: 24 }, (_, hour) => {
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
  }, [expandedTasksForWeek, weekDays]);

  // Scroll to current hour on mount, adjust dynamically based on heights
  useEffect(() => {
    if (gridRef.current && hourTops.length > 0) {
      const currentHour = toIST(new Date()).getHours();
      const targetTop = hourTops[currentHour] || 0;
      gridRef.current.scrollTop = targetTop - 100;
    }
  }, [hourTops]);

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
    if (task.status === 'done') return 'bg-olive text-paper border-ink';
    if (task.priority === 'urgent') return 'bg-taxi text-ink border-ink';
    if (task.tags?.includes('Focus')) return 'bg-ink text-paper border-taxi';
    return 'bg-paper text-ink border-ink';
  };

  return (
    <div className="flex flex-col flex-1 h-[70vh] md:h-[75vh] min-h-[500px] bg-paper relative font-sans pb-12">
      {/* Header controls matching screenshot */}
      <div className="flex justify-between items-end mb-4 pb-2 border-b-[6px] border-ink shrink-0">
        <h2 className="font-sans text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none flex flex-col">
          <span>This</span>
          <span>Week's</span>
          <span>Transit</span>
        </h2>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={handleToday} className="px-3 py-1.5 border-[3px] border-ink font-mono text-[10px] uppercase font-bold hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] bg-paper transition-all">TODAY</button>
          <button onClick={handlePrevWeek} className="px-3 py-1.5 border-[3px] border-ink font-mono text-[10px] uppercase font-bold hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] bg-paper transition-all">PREV</button>
          <button onClick={handleNextWeek} className="px-3 py-1.5 border-[3px] border-ink font-mono text-[10px] uppercase font-bold hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] active:translate-x-[3px] bg-paper transition-all">NEXT</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col border-[6px] border-ink shadow-[6px_6px_0px_#1A1A1B] bg-paper overflow-x-auto overflow-y-hidden relative select-none">
        <div className="min-w-[720px] md:min-w-full flex-1 flex flex-col">
          {/* Week Days Header */}
          <div className="flex border-b-[4px] border-ink shrink-0 bg-paper z-10 sticky top-0">
            <div className="w-10 md:w-12 border-r-[4px] border-ink flex items-center justify-center p-1 shrink-0 bg-paper sticky left-0 z-20">
              <span className="font-mono text-[8px] uppercase font-bold tracking-widest leading-tight text-center">I<br/>S<br/>T</span>
            </div>
            <div className="flex-1 grid grid-cols-7">
              {weekDays.map(day => {
                const today = isSameDay(day, toIST(new Date()));
                return (
                  <div 
                    key={day.toISOString()} 
                    onClick={() => {
                      const formattedDate = format(day, 'yyyy-MM-dd');
                      handleCreateAtSlot(formattedDate, '10:30', '11:30');
                    }}
                    className={cn(
                      "border-r-[4px] border-ink p-1 md:p-3 text-center flex flex-col items-center justify-center relative cursor-pointer hover:bg-paper-dark transition-colors select-none", 
                      today ? "bg-taxi text-ink hover:bg-taxi-hover" : "bg-transparent"
                    )}
                    title="Click header to schedule dispatch on this date"
                  >
                    <span className="font-mono text-[8px] md:text-[10px] font-bold uppercase tracking-widest">{format(day, 'EEE')}</span>
                    <span className={cn("font-sans text-lg md:text-3xl font-black mt-1", today ? "text-ink" : "text-ink")}>{format(day, 'd')}</span>
                    {today && <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-subway-red animate-pulse" title="Current Station" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scrollable Time Grid */}
          <div ref={gridRef} className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
            <div className="flex relative pb-20">
              
              {/* Time Labels Rail */}
              <div 
                className="w-10 md:w-12 shrink-0 border-r-[4px] border-ink bg-paper sticky left-0 z-20"
                style={{ height: `${totalGridHeight}px` }}
              >
                {hours.map(hour => (
                  <div 
                    key={hour} 
                    className="border-b-2 border-dashed border-ink/20 flex justify-center relative bg-paper"
                    style={{ height: `${hourHeights[hour]}px` }}
                  >
                    <span className={cn(
                      "absolute top-1 font-mono text-[8.5px] md:text-[10px] font-black uppercase tracking-tighter bg-paper px-1 z-10 leading-none transition-all",
                      hourHeights[hour] === 30 ? "text-ink/30 scale-[0.8] origin-top" : "text-ink/70"
                    )}>
                      {format(toIST(new Date()).setHours(hour, 0, 0, 0), 'ha')}
                    </span>
                  </div>
                ))}
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
                      className="border-b-2 border-dashed border-ink/20 w-full shrink-0" 
                      style={{ height: `${hourHeights[hour]}px` }}
                    />
                  ))}
                </div>

                {weekDays.map((day, dayIndex) => {
                  const dayTasks = expandedTasksForWeek.filter(t => t.deadline && isSameDay(new Date(t.deadline), day));
                  const dayLayouts = getEventLayouts(dayTasks, hourTops, hourHeights);
                  
                  return (
                    <div key={day.toISOString()} className={cn("relative border-r-[4px] border-ink/40 group/col", dayIndex === 6 ? "border-r-0" : "")}>
                      {/* Interactive Hour slots background for clicking to add task */}
                      <div className="absolute inset-0 flex flex-col pointer-events-auto">
                        {hours.map(hour => (
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

                        return (
                          <div 
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                            }}
                            className={cn(
                              "absolute z-10 border-[3px] p-1.5 overflow-hidden shadow-[2px_2px_0px_#1A1A1B] cursor-pointer hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#1A1A1B] transition-all select-none",
                              getEventColor(task)
                            )}
                            style={style}
                          >
                          {/* Priority Indicator Line on Left Side */}
                          <div className={cn(
                            "absolute left-0 top-0 bottom-0 w-1",
                            task.priority === 'urgent' ? "bg-subway-red" : task.priority === 'medium' ? "bg-taxi" : "bg-ink/30"
                          )} />

                          <div className="flex flex-col h-full justify-between pl-1 pb-0.5">
                            {/* Card Tag & Priority Header */}
                            <div className="flex items-center justify-between gap-1 select-none">
                              <span className={cn(
                                "font-mono text-[6px] md:text-[7.5px] font-extrabold uppercase px-1 border border-ink/20 scale-90 origin-left shrink-0",
                                task.priority === 'urgent' && "bg-subway-red/10 text-subway-red border-subway-red/30"
                              )}>
                                {task.priority === 'urgent' ? 'P1 Urgent' : task.priority === 'medium' ? 'P2 Med' : 'P3 Low'}
                              </span>
                              {task.tags && task.tags.length > 0 && (
                                <span className="hidden sm:inline font-mono text-[6px] md:text-[7.5px] font-semibold uppercase text-ink/60 bg-paper-dark border border-ink/20 px-0.5 truncate scale-90 origin-right">
                                  {task.tags[0]}
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <div className={cn(
                              "font-sans font-black uppercase text-[9px] md:text-[11px] leading-tight line-clamp-2 mt-0.5 tracking-tight",
                              task.status === 'done' ? "line-through opacity-50 text-ink/70" : "text-ink"
                            )}>
                              {task.status === 'in-progress' && <span className="text-subway-blue mr-0.5 animate-pulse inline-block">⚡</span>}
                              {task.title}
                            </div>

                            {/* Time & Checklist stamp */}
                            <div className="font-mono text-[7px] md:text-[8px] font-bold opacity-80 mt-0.5 flex items-center justify-between">
                              <span className="flex items-center gap-0.5">
                                <Clock size={8} className="shrink-0" />
                                {task.deadline ? (
                                  task.endTime ? (
                                    `${format(new Date(task.deadline), 'H:mm')} - ${format(new Date(task.endTime), 'H:mm')}`
                                  ) : (
                                    format(new Date(task.deadline), 'h:mm a')
                                  )
                                ) : 'ANY'}
                              </span>
                              <div className="flex items-center gap-1 shrink-0 select-none">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTask(task);
                                    setIsDrawerOpen(true);
                                  }}
                                  className="text-ink hover:bg-taxi border border-ink p-0.5 rounded-xs transition-all bg-paper shadow-[0.5px_0.5px_0px_#1A1A1B] active:shadow-none active:translate-x-[0.5px] active:translate-y-[0.5px] cursor-pointer flex items-center justify-center font-black leading-none"
                                  title="Edit dispatch parameters"
                                >
                                  <Edit size={7} strokeWidth={3} className="text-ink" />
                                </button>
                                {task.status === 'done' && (
                                  <span className="text-green-700 font-extrabold text-[8px] md:text-[10px] leading-none">✓</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );})}
                    </div>
                  );
                })}
              </div>
              
            </div>
          </div>
        </div>
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
                onClick={() => {
                  setEditingTask(selectedTask);
                  setSelectedTask(null);
                  setIsDrawerOpen(true);
                }} 
                className="bg-taxi hover:bg-taxi-hover text-ink border-[3px] border-ink px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider shadow-[3.5px_3.5px_0px_#1A1A1B] active:shadow-none active:translate-y-[1.5px] active:translate-x-[1.5px] transition-all flex items-center gap-1.5 cursor-pointer max-h-[30px]"
              >
                <Edit size={11} strokeWidth={3} /> Edit Event
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
                <h4 className="font-sans font-black text-2xl uppercase tracking-tight text-ink leading-tight">
                  {selectedTask.title}
                </h4>
              </div>

              {/* Deadline & Time */}
              <div className="grid grid-cols-2 gap-4 border-b-2 border-dashed border-ink/40 pb-4">
                <div>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60 block">Boarding Date</span>
                  <span className="font-sans font-bold text-sm uppercase text-ink">
                    {selectedTask.deadline ? format(new Date(selectedTask.deadline), 'dd MMM yyyy') : 'No Date'}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60 block">Transit Windows</span>
                  <div className="font-sans font-bold text-[12px] md:text-sm uppercase text-ink flex flex-col gap-1 mt-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[8px] bg-ink text-paper px-1 py-0.5 rounded-xs font-black">DEP</span>
                      {selectedTask.deadline ? format(new Date(selectedTask.deadline), 'hh:mm a') : 'Anytime'}
                    </span>
                    {selectedTask.endTime && (
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-[8px] bg-ink text-paper px-1 py-0.5 rounded-xs font-black animate-pulse">ARR</span>
                        {format(new Date(selectedTask.endTime), 'hh:mm a')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description / Notes */}
              <div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60 block mb-1">Dossier Notes</span>
                <p className="bg-[#eeeadf] border-2 border-ink p-3 font-mono text-xs font-bold uppercase leading-relaxed text-ink/80 min-h-[60px] whitespace-pre-line">
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
              <div className="pt-2 flex justify-between gap-4">
                <button
                  onClick={() => {
                    deleteTask(selectedTask.id);
                    setSelectedTask(null);
                  }}
                  className="flex-1 bg-[#EF4444] text-white border-[3px] border-ink py-2.5 font-mono text-[10px] font-black uppercase shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all"
                >
                  Annihilate Dispatch
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 bg-paper border-[3px] border-ink py-2.5 font-mono text-[10px] font-black uppercase hover:bg-ink hover:text-paper shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-y-[2px] active:translate-x-[2px] transition-all"
                >
                  Close Dossier
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
  updateTask?: (id: string, updatedFields: Partial<Omit<Task, 'id'>> & { updateAllOccurrences?: boolean }) => void;
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
  const [updateAllOccurrences, setUpdateAllOccurrences] = useState(false);

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
        updateAllOccurrences,
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
          <div className="flex flex-col sm:flex-row gap-3 pt-2 mt-2 border-t border-ink/15">
            <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase font-bold text-ink/85">
              <input 
                type="radio" 
                name="updateAllOccurrences"
                checked={!updateAllOccurrences} 
                onChange={() => setUpdateAllOccurrences(false)} 
                className="accent-ink scale-110"
              />
              Only this instance
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase font-bold text-ink/85">
              <input 
                type="radio" 
                name="updateAllOccurrences"
                checked={updateAllOccurrences} 
                onChange={() => setUpdateAllOccurrences(true)} 
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
          className="w-full bg-paper-dark border-[4px] border-ink p-3 font-sans font-black uppercase text-xl focus:outline-none focus:border-taxi focus:bg-paper transition-colors"
          placeholder="E.G. BOARD MEETING..."
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
          className="w-full bg-paper-dark border-[4px] border-ink p-3 font-mono text-sm font-bold uppercase focus:outline-none focus:border-taxi focus:bg-paper min-h-[120px]"
          placeholder="ADDITIONAL INTELLIGENCE..."
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
        title="BOARDING DEP DIAL"
      />

      <AnalogClockPicker
        isOpen={isEndPickerOpen}
        onClose={() => setIsEndPickerOpen(false)}
        value={endTime}
        onChange={(newValue) => setEndTime(newValue)}
        title="TRANSIT ARRIVAL DIAL"
      />

    </form>
  )
}
