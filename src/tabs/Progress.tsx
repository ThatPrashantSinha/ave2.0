import React, { useState, useMemo } from 'react';
import { Task, Habit } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { toIST } from '../lib/utils';
import { getOccurrencesForDateRange } from '../lib/recurrence';
import { HabitIcon } from '../components/HabitIcon';
import { Gauge, RotateCcw, TrendingUp } from 'lucide-react';

// Helper: Check if a habit is scheduled on a given Date
const isHabitScheduledOnDate = (habit: Habit, date: Date): boolean => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const freq = habit.frequency || 'daily';
  
  if (freq === 'daily') return true;
  if (freq === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (freq === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
  if (freq === 'weekly' || freq === 'custom') {
    if (habit.daysOfWeek && habit.daysOfWeek.length > 0) {
      return habit.daysOfWeek.includes(dayOfWeek);
    }
  }
  return true; // fallback
};

export function Progress({ tasks, habits }: { tasks: Task[], habits: Habit[] }) {
  // Navigation & filtration states
  const [selectedHabitId, setSelectedHabitId] = useState<string | 'all'>('all');
  const [metricType, setMetricType] = useState<'daily' | 'rolling'>('rolling');

  // Interval definitions
  const last7DaysInterval = useMemo(() => {
    return eachDayOfInterval({ start: subDays(toIST(new Date()), 6), end: toIST(new Date()) });
  }, []);

  const last30DaysInterval = useMemo(() => {
    return eachDayOfInterval({ start: subDays(toIST(new Date()), 29), end: toIST(new Date()) });
  }, []);

  // 1. Expand repeating tasks for the 7 day task chart
  const occurrencesIn7Days = useMemo(() => {
    return getOccurrencesForDateRange(tasks, subDays(toIST(new Date()), 6), toIST(new Date()));
  }, [tasks]);

  const taskChartData = useMemo(() => {
    return last7DaysInterval.map((dayDate) => {
      const dayName = format(dayDate, 'EEE');
      const dayStr = format(dayDate, 'yyyy-MM-dd');
      
      const completedOnDay = occurrencesIn7Days.filter(t => {
        if (t.status !== 'done') return false;
        if (!t.deadline) return false;
        const tStr = format(new Date(t.deadline), 'yyyy-MM-dd');
        return tStr === dayStr;
      }).length;

      return {
        name: dayName,
        completed: completedOnDay
      };
    });
  }, [last7DaysInterval, occurrencesIn7Days]);

  const completedCount = useMemo(() => {
    return tasks.reduce((acc, t) => {
      if (!t.recurring || t.recurring === 'none') {
        return acc + (t.status === 'done' ? 1 : 0);
      } else {
        const doneOccurrences = Object.values(t.occurrenceStatuses || {}).filter(s => s === 'done').length;
        return acc + doneOccurrences;
      }
    }, 0);
  }, [tasks]);

  const focusMins = completedCount * 25; // Dynamic estimation: 25 mins per completed task
  const bestStreak = useMemo(() => {
    return habits.length > 0 ? Math.max(...habits.map(h => h.streak), 0) : 0;
  }, [habits]);

  // 2. Generate 30-day habits trend series
  const habitTrendData = useMemo(() => {
    return last30DaysInterval.map((dayDate) => {
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const displayLabel = format(dayDate, 'MMM dd');
      
      // Compute Combined System Metrics
      let totalScheduled = 0;
      let totalCompleted = 0;

      habits.forEach(h => {
        if (isHabitScheduledOnDate(h, dayDate)) {
          totalScheduled++;
          if (h.history[dateStr]) {
            totalCompleted++;
          }
        }
      });

      const dailyOverallRate = totalScheduled > 0 
        ? Math.round((totalCompleted / totalScheduled) * 100) 
        : 0;

      // Compute Rolling 7-day Average overall system metric
      let rollingCombinedCompleted = 0;
      let rollingCombinedScheduled = 0;
      for (let r = 0; r < 7; r++) {
        const histDate = subDays(dayDate, r);
        const histDateStr = format(histDate, 'yyyy-MM-dd');
        habits.forEach(h => {
          if (isHabitScheduledOnDate(h, histDate)) {
            rollingCombinedScheduled++;
            if (h.history[histDateStr]) {
              rollingCombinedCompleted++;
            }
          }
        });
      }
      const rollingOverallRate = rollingCombinedScheduled > 0 
        ? Math.round((rollingCombinedCompleted / rollingCombinedScheduled) * 100) 
        : 0;

      // Compute individual habit stats: direct daily score vs 7-day rolling performance rate
      const individualStats: Record<string, number> = {};
      habits.forEach(h => {
        const done = !!h.history[dateStr];
        const scheduled = isHabitScheduledOnDate(h, dayDate);
        
        // Daily status: 100% completed, 0% missed
        individualStats[`daily_${h.id}`] = scheduled ? (done ? 100 : 0) : 0;

        // Rolling 7-day reliability rate for this specific habit
        let singleCompl = 0;
        let singleSched = 0;
        for (let r = 0; r < 7; r++) {
          const histDate = subDays(dayDate, r);
          const histDateStr = format(histDate, 'yyyy-MM-dd');
          if (isHabitScheduledOnDate(h, histDate)) {
            singleSched++;
            if (h.history[histDateStr]) {
              singleCompl++;
            }
          }
        }
        individualStats[`rolling_${h.id}`] = singleSched > 0 
          ? Math.round((singleCompl / singleSched) * 100) 
          : 0;
      });

      return {
        name: displayLabel,
        dateStr,
        overall_daily: dailyOverallRate,
        overall_rolling: rollingOverallRate,
        ...individualStats
      };
    });
  }, [last30DaysInterval, habits]);

  // Compute 30-Day Efficiency Rate for individual habit cards
  const habitEfficiencies = useMemo(() => {
    const stats: Record<string, number> = {};
    
    habits.forEach(h => {
      let scheduledCount = 0;
      let completedCount = 0;

      last30DaysInterval.forEach(day => {
        const isScheduled = isHabitScheduledOnDate(h, day);
        if (isScheduled) {
          scheduledCount++;
          const dateStr = format(day, 'yyyy-MM-dd');
          if (h.history[dateStr]) {
            completedCount++;
          }
        }
      });

      stats[h.id] = scheduledCount > 0 ? Math.round((completedCount / scheduledCount) * 100) : 0;
    });

    return stats;
  }, [last30DaysInterval, habits]);

  // Selected details for rendering dynamic labels & colors
  const activeHabit = useMemo(() => {
    if (selectedHabitId === 'all') return null;
    return habits.find(h => h.id === selectedHabitId) || null;
  }, [selectedHabitId, habits]);

  const activeColor = useMemo(() => {
    if (selectedHabitId === 'all') return '#EF4444'; // Active Subway Red
    return activeHabit?.color || '#EF4444';
  }, [selectedHabitId, activeHabit]);

  const activeDataKey = useMemo(() => {
    if (selectedHabitId === 'all') {
      return metricType === 'rolling' ? 'overall_rolling' : 'overall_daily';
    }
    return `${metricType}_${selectedHabitId}`;
  }, [selectedHabitId, metricType]);

  const activeLabel = useMemo(() => {
    if (selectedHabitId === 'all') return 'All Rails Consolidated';
    return `${activeHabit?.name || 'Habit Line'} performance`;
  }, [selectedHabitId, activeHabit]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* Overview Analytics (Left Column) */}
      <div className="space-y-6">
        <h2 className="font-sans text-3xl font-black uppercase tracking-tight border-b-4 border-ink pb-2">The Ledger Details</h2>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="border-[6px] border-ink bg-paper p-4 text-center animate-in fade-in duration-500">
             <div className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 border-b border-ink/20 pb-1">Tasks Done</div>
             <div className="font-sans text-4xl font-black">{completedCount}</div>
          </div>
          <div className="border-[6px] border-ink bg-taxi p-4 text-center shadow-[4px_4px_0_0_#1A1A1B] animate-in fade-in duration-500 delay-75">
             <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink mb-1 border-b border-ink/30 pb-1">Focus Mins</div>
             <div className="font-sans text-4xl font-black">{focusMins}</div>
          </div>
          <div className="border-[6px] border-ink bg-paper-dark p-4 text-center animate-in fade-in duration-500 delay-150">
             <div className="font-mono text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1 border-[#1A1A1B]/25 pb-1">Best Streak</div>
             <div className="font-sans text-4xl font-black border border-ink px-1 inline-block bg-paper">{bestStreak}</div>
          </div>
        </div>

        {/* Productivity Transit Line (Chart for Tasks) */}
        <div className="border-[6px] border-ink p-4 bg-paper relative mt-8">
          <div className="absolute top-4 right-4 flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-subway-red"></div>
            <div className="w-2 h-2 rounded-full bg-ink"></div>
            <div className="w-2 h-2 rounded-full bg-taxi"></div>
          </div>
          
          <h3 className="font-sans font-black uppercase tracking-tight text-sm mb-1">Consistency Map</h3>
          <p className="font-mono text-[10px] font-bold uppercase opacity-60 border-b border-ink pb-2 mb-6">Express Route (7 Day Record)</p>
          
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={taskChartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c0392b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#c0392b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={{ stroke: '#1c1c1c', strokeWidth: 2 }}
                  tickLine={false}
                  tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#1c1c1c' }}
                  dy={10}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#f4f1ea', border: '2px solid #1c1c1c', borderRadius: 0, fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                  itemStyle={{ color: '#c0392b', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#c0392b" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                  activeDot={{ r: 6, fill: '#f5b041', stroke: '#1c1c1c', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Habits 30-Day Interactive Trends (Right Column replacing static list) */}
      <div className="space-y-6">
        <h2 className="font-sans text-3xl font-black uppercase tracking-tight border-b-4 border-ink pb-2">Line Efficiency Matrix</h2>

        <div className="border-[6px] border-ink p-4 bg-paper relative flex flex-col gap-4 shadow-[4px_4px_0_0_#1A1A1B]">
          
          {/* Top Info Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b-2 border-ink pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Gauge size={14} className="text-subway-red animate-pulse" />
                <h3 className="font-sans font-black uppercase tracking-tight text-sm">
                  {selectedHabitId === 'all' ? 'All Transit Lines Combined' : `${activeHabit?.name} Route`}
                </h3>
              </div>
              <p className="font-mono text-[9px] font-black uppercase opacity-60 mt-0.5">
                30-Day Completion Trend Audit
              </p>
            </div>

            {/* Metric Mode buttons */}
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setMetricType('rolling')}
                className={`font-mono text-[8.5px] font-black border-2 py-0.5 px-2 uppercase rounded-sm cursor-pointer transition-all ${
                  metricType === 'rolling'
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-ink/70 border-ink/15 hover:border-ink/50'
                }`}
                title="7-day rolling average completion index"
              >
                7D Smoothed
              </button>
              <button
                type="button"
                onClick={() => setMetricType('daily')}
                className={`font-mono text-[8.5px] font-black border-2 py-0.5 px-2 uppercase rounded-sm cursor-pointer transition-all ${
                  metricType === 'daily'
                    ? 'bg-ink text-white border-ink'
                    : 'bg-white text-ink/70 border-ink/15 hover:border-ink/50'
                }`}
                title="Exact daily execution score (0% or 100%)"
              >
                Daily Status
              </button>
            </div>
          </div>

          {/* Actual Recharts Chart Canvas */}
          <div className="h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={habitTrendData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHabit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={activeColor} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e1e1" strokeWidth={1} />
                <XAxis 
                  dataKey="name" 
                  axisLine={{ stroke: '#1c1c1c', strokeWidth: 2 }}
                  tickLine={false}
                  tick={{ fontFamily: 'JetBrains Mono', fontSize: 8, fill: '#1a1a1b', fontWeight: 'bold' }}
                  dy={10}
                  interval={5} // Skip some values to fit 30 nicely
                />
                <YAxis 
                  domain={[0, 100]}
                  axisLine={{ stroke: '#1c1c1c', strokeWidth: 2 }}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fontFamily: 'JetBrains Mono', fontSize: 8, fill: '#1a1a1b', fontWeight: 'bold' }}
                  dx={-5}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#f4f1ea', 
                    border: '3px solid #1c1c1c', 
                    borderRadius: 0, 
                    fontFamily: 'JetBrains Mono', 
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '2.5px 2.5px 0px #1A1A1B'
                  }}
                  formatter={(value: any) => [`${value}% Efficiency`, activeLabel]}
                  labelStyle={{ color: '#1c1c1c', borderBottom: '1px border-dashed #1a1a1b', paddingBottom: '4px', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey={activeDataKey} 
                  stroke={activeColor} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorHabit)" 
                  activeDot={{ r: 6, fill: '#f5b041', stroke: '#1c1c1c', strokeWidth: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Reset button view toggles */}
          {selectedHabitId !== 'all' && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <button
                type="button"
                onClick={() => setSelectedHabitId('all')}
                className="font-mono text-[8.5px] font-black border border-ink/40 hover:bg-stone-50 py-1 px-2.5 uppercase rounded-xs transition-colors flex items-center gap-1 cursor-pointer select-none"
              >
                <RotateCcw size={10} />
                Reset View to Combined Fleet System
              </button>
            </div>
          )}
        </div>

        {/* INSTRUCTIONS */}
        <p className="font-mono text-[8px] uppercase font-black text-ink/50 text-center mt-3 tracking-widest leading-normal">
          🚂 Click any active habit route below to analyze its 30-day scheduled efficiency profile:
        </p>

        {/* Depot Grid - Habit Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Quick select ALL combined button */}
          <button
            type="button"
            onClick={() => setSelectedHabitId('all')}
            className={`border-4 border-ink p-2.5 flex flex-col justify-between transition-all rounded-[2px] cursor-pointer text-left ${
              selectedHabitId === 'all'
                ? 'bg-[#FCFAF5] ring-1 ring-subway-red shadow-[3px_3px_0px_#1A1A1B] translate-y-0.5'
                : 'bg-paper shadow-[2px_2px_0px_#1A1A1B] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1A1A1B]'
            }`}
          >
            <div className="flex items-center gap-1.5 w-full">
              <div className="w-5 h-5 rounded-full border border-ink flex items-center justify-center bg-subway-red text-white text-[10px] shrink-0">
                <TrendingUp size={10} className="stroke-[3px]" />
              </div>
              <div className="min-w-0">
                <span className="font-sans font-black text-[10.5px] text-ink uppercase tracking-tight block">
                  Consolidated Lines
                </span>
                <span className="font-mono text-[6.5px] uppercase text-ink/50 font-bold block">
                  Unified System Load
                </span>
              </div>
            </div>

            <div className="w-full border-t border-dashed border-ink/10 pt-1.5 mt-2 flex justify-between items-center text-right font-mono text-[7.5px] font-black">
              <span className="text-ink/40 uppercase">Consolidated:</span>
              <span className="bg-taxi text-ink px-1 rounded-3xs border border-ink/10">30D CORE</span>
            </div>
          </button>

          {/* List of actual Habits map */}
          {habits
            .sort((a, b) => {
              const aH = a.hour !== undefined ? a.hour : 8;
              const aM = a.minute !== undefined ? a.minute : 0;
              const bH = b.hour !== undefined ? b.hour : 8;
              const bM = b.minute !== undefined ? b.minute : 0;
              return (aH * 60 + aM) - (bH * 60 + bM);
            })
            .map((habit) => {
              const efficiency = habitEfficiencies[habit.id] || 0;
              const isSelected = selectedHabitId === habit.id;

              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => setSelectedHabitId(habit.id)}
                  className={`border-4 border-ink p-2.5 flex flex-col justify-between transition-all rounded-[2px] cursor-pointer text-left relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#FCFAF5] shadow-[3px_3px_0px_#1A1A1B] translate-y-0.5'
                      : 'bg-paper shadow-[2px_2px_0px_#1A1A1B] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1A1A1B]'
                  }`}
                  style={isSelected ? { borderColor: habit.color || '#EF4444' } : undefined}
                >
                  {/* Matching left tiny stripe edge */}
                  <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: habit.color || '#EF4444' }} />

                  <div className="flex items-center gap-1.5 w-full pl-0.5">
                    <div 
                      className="w-5 h-5 rounded-full border border-ink flex items-center justify-center text-[10px] shrink-0 text-white shadow-xs"
                      style={{ backgroundColor: habit.color || '#EF4444' }}
                    >
                      <HabitIcon iconName={habit.icon || '📍'} size={9} className="shrink-0 text-white" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-sans font-black text-[10.5px] text-ink uppercase tracking-tight block truncate">
                        {habit.name}
                      </span>
                      <span className="font-mono text-[6.5px] uppercase text-ink/50 font-bold block">
                        Freq: {habit.frequency || 'daily'}
                      </span>
                    </div>
                  </div>

                  <div className="w-full border-t border-dashed border-ink/10 pt-1.5 mt-2 flex justify-between items-center text-right font-mono text-[7px] font-black">
                    <span 
                      className="text-white px-1 py-0.2 rounded-3xs font-black shadow-3xs"
                      style={{ backgroundColor: habit.color || '#EF4444' }}
                    >
                      🔥 {habit.streak}D STREAK
                    </span>
                    <span className="text-ink/70">
                      {efficiency}% EFFICIENCY
                    </span>
                  </div>
                </button>
              );
            })}
        </div>

        {habits.length === 0 && (
           <div className="text-center py-8 font-serif italic text-ink/35 border-2 border-dashed border-ink/15 rounded-sm bg-paper-dark/5">
             No established lines in dispatch depot database yet. Create route disciplines to activate visualizer trackers!
           </div>
        )}

        {/* Info Column */}
        <div className="bg-ink text-paper p-6 mt-8 relative overflow-hidden shadow-[6px_6px_0_0_#F7C331] border-[6px] border-ink">
           <div className="absolute -right-4 -top-4 w-16 h-16 border-[6px] border-taxi rounded-full opacity-20"></div>
           <h3 className="font-sans text-xl font-black uppercase tracking-tight mb-2">Productivity Infographic</h3>
           <div className="space-y-4 py-4">
              <div className="space-y-1">
                 <div className="flex justify-between font-mono text-[10px] uppercase">
                    <span>Mental Clarity</span>
                    <span>85%</span>
                 </div>
                 <div className="w-full h-2 bg-ink-light">
                    <div className="h-full bg-paper" style={{ width: '85%' }}></div>
                 </div>
              </div>
              <div className="space-y-1">
                 <div className="flex justify-between font-mono text-[10px] uppercase">
                    <span>Deep Focus</span>
                    <span>62%</span>
                 </div>
                 <div className="w-full h-2 bg-ink-light">
                    <div className="h-full bg-taxi" style={{ width: '62%' }}></div>
                 </div>
              </div>
              <div className="space-y-1">
                 <div className="flex justify-between font-mono text-[10px] uppercase">
                    <span>Social Battery</span>
                    <span>21%</span>
                 </div>
                 <div className="w-full h-2 bg-ink-light">
                    <div className="h-full bg-subway-red" style={{ width: '21%' }}></div>
                 </div>
              </div>
           </div>
        </div>

      </div>

    </div>
  );
}
