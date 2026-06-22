import React, { useState, useMemo } from 'react';
import { Task, Habit } from '../types';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
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
import { 
  Gauge, 
  RotateCcw, 
  TrendingUp, 
  Clock, 
  Layers, 
  CheckSquare, 
  Flame, 
  Zap, 
  Award, 
  Activity, 
  Sliders, 
  Target,
  ArrowUpRight
} from 'lucide-react';

interface FocusLog {
  id: string;
  name: string;
  durationCompleted: number; // in seconds
  durationTarget: number; // in seconds
  timestamp: string; // Humanized datetime
  ambient: string;
  completed: boolean;
}

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

  // Load Focus logs dynamically from localStorage
  const focusLogs: FocusLog[] = useMemo(() => {
    try {
      const stored = localStorage.getItem('daily_docket_focus_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  }, []);

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

  // Aggregate stats: Tasks completed
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

  // Real calculations for Focus Logs
  const totalFocusedMinutes = useMemo(() => {
    const totalSecs = focusLogs.reduce((sum, log) => sum + log.durationCompleted, 0);
    return Math.round(totalSecs / 60);
  }, [focusLogs]);

  const totalCycles = useMemo(() => focusLogs.length, [focusLogs]);
  const completedCycles = useMemo(() => focusLogs.filter(l => l.completed).length, [focusLogs]);
  
  const focusSuccessRate = useMemo(() => {
    if (totalCycles === 0) return 0;
    return Math.round((completedCycles / totalCycles) * 100);
  }, [completedCycles, totalCycles]);

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

  // Current global habit compliance across 30 days
  const overallHabitCompliance = useMemo(() => {
    let totalScheduled = 0;
    let totalCompleted = 0;
    last30DaysInterval.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      habits.forEach(h => {
        if (isHabitScheduledOnDate(h, day)) {
          totalScheduled++;
          if (h.history[dateStr]) {
            totalCompleted++;
          }
        }
      });
    });
    return totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
  }, [last30DaysInterval, habits]);

  // Preferred soundscape
  const favoriteAmbient = useMemo(() => {
    if (focusLogs.length === 0) return 'Silent Focus';
    const counts: Record<string, number> = {};
    focusLogs.forEach(l => {
      const name = l.ambient || '🔕 Silent Focus';
      counts[name] = (counts[name] || 0) + l.durationCompleted;
    });
    let favorite = '🔕 Silent Focus';
    let maxSec = -1;
    Object.entries(counts).forEach(([amb, sec]) => {
      if (sec > maxSec) {
        maxSec = sec;
        favorite = amb;
      }
    });
    // Remove complex emoji prefix for smaller display
    return favorite.replace(/^[^a-zA-Z\s]+/, '').trim();
  }, [focusLogs]);

  // Real 7-day focus distribution for BarChart
  const focusChartData = useMemo(() => {
    return last7DaysInterval.map((dayDate) => {
      const dayName = format(dayDate, 'EEE');
      const dayStr = format(dayDate, 'yyyy-MM-dd');
      
      let minsOnDay = 0;
      focusLogs.forEach(log => {
        try {
          const d = new Date(log.timestamp);
          if (!isNaN(d.getTime())) {
            const dateStr = format(d, 'yyyy-MM-dd');
            if (dateStr === dayStr) {
              minsOnDay += log.durationCompleted / 60;
            }
          }
        } catch (_) {}
      });

      return {
        name: dayName,
        minutes: Math.round(minsOnDay)
      };
    });
  }, [last7DaysInterval, focusLogs]);

  // Task volume calculations
  const totalTasksCount = useMemo(() => tasks.length, [tasks]);
  const taskFulfillmentRatio = useMemo(() => {
    if (totalTasksCount === 0) return 0;
    return Math.round((completedCount / totalTasksCount) * 100);
  }, [completedCount, totalTasksCount]);

  // Real breakdown of task priorities
  const priorityStats = useMemo(() => {
    const stats = {
      low: { total: 0, done: 0 },
      medium: { total: 0, done: 0 },
      urgent: { total: 0, done: 0 }
    };
    tasks.forEach(t => {
      const p = (t.priority || 'medium') as 'low' | 'medium' | 'urgent';
      if (!t.recurring || t.recurring === 'none') {
        stats[p].total++;
        if (t.status === 'done') {
          stats[p].done++;
        }
      } else {
        const doneOccurrences = Object.values(t.occurrenceStatuses || {}).filter(s => s === 'done').length;
        stats[p].done += doneOccurrences;
        stats[p].total += Math.max(doneOccurrences, 1); // approximate total occurrences
      }
    });
    return stats;
  }, [tasks]);

  // Peak activity day text matching
  const peakActivityText = useMemo(() => {
    if (taskChartData.length === 0) return 'NONE DETECTED';
    let maxDone = -1;
    let peakDayName = 'NONE';
    taskChartData.forEach(d => {
      if (d.completed > maxDone) {
        maxDone = d.completed;
        peakDayName = d.name;
      }
    });
    if (maxDone <= 0) return 'COULD NOT EVALUATE';
    const dayMap: Record<string, string> = {
      'Mon': 'MONDAY PEAK',
      'Tue': 'TUESDAY VELOCITY',
      'Wed': 'WEDNESDAY SPIKE',
      'Thu': 'THURSDAY FOCUS',
      'Fri': 'FRIDAY SPRINT',
      'Sat': 'SATURDAY CRUISE',
      'Sun': 'SUNDAY PREPARATION'
    };
    return `${dayMap[peakDayName] || peakDayName} (${maxDone} DISPATCHES)`;
  }, [taskChartData]);

  // Highly dynamic, real data-backed operational infographic percentages
  const clarityScore = useMemo(() => {
    // Cognitive Clarity: Ratio of tasks solved (scaled 60%) + average habit compliance rate (scaled 40%)
    const taskRatio = totalTasksCount > 0 ? (completedCount / totalTasksCount) : 1.0;
    const habitRatio = overallHabitCompliance / 100;
    const score = Math.round((taskRatio * 60) + (habitRatio * 40));
    return Math.min(100, Math.max(30, score || 50));
  }, [totalTasksCount, completedCount, overallHabitCompliance]);

  const staminaScore = useMemo(() => {
    // Operational Stamina: Target 100 focus minutes per week for 100% capacity!
    // We look at focus minutes completed in the last 7 days
    let minsInLast7Days = 0;
    const sevenDaysAgo = subDays(toIST(new Date()), 7);
    focusLogs.forEach(log => {
      try {
        const d = new Date(log.timestamp);
        if (!isNaN(d.getTime()) && d >= sevenDaysAgo) {
          minsInLast7Days += log.durationCompleted / 60;
        }
      } catch (_) {}
    });
    // Fallback if user has historical records but none this week
    if (minsInLast7Days === 0 && totalFocusedMinutes > 0) {
      minsInLast7Days = totalFocusedMinutes;
    }
    const score = Math.round((minsInLast7Days / 100) * 100);
    return Math.min(100, Math.max(25, score || 40));
  }, [focusLogs, totalFocusedMinutes]);

  const routineScore = useMemo(() => {
    // Routine Battery Charge: Active habit streak multiplier + general habit fulfillment
    const base = overallHabitCompliance;
    const streakBonus = Math.min(40, bestStreak * 4); // up to 40% bonus from streaks
    return Math.min(100, Math.max(20, base + streakBonus));
  }, [overallHabitCompliance, bestStreak]);

  // Selected details for rendering dynamic labels & colors of active habits
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
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Visual Docket Header Banner */}
      <div className="border-[6px] border-ink bg-paper p-6 relative overflow-hidden shadow-[6px_6px_0px_#1A1A1B] select-none">
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-taxi/20 skew-x-12 translate-x-8 pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2 border-b-2 border-dashed border-ink/30 pb-3 mb-2">
          <span className="font-mono text-[9px] font-black text-subway-red tracking-widest uppercase">
            OPERATIONAL LOG // REGISTRY LEDGER
          </span>
          <span className="font-mono text-[8px] text-ink/50 font-bold">
            DOCUMENT ID-3094.STATX
          </span>
        </div>
        <h1 className="font-sans text-3xl font-black text-ink uppercase tracking-tight leading-none">
          SYSTEM DISPATCH METRICS
        </h1>
        <p className="font-mono text-[10px] text-ink/75 uppercase mt-1">
          A granular database audit of task dispatches, structured route schedules, and temporal focus logs.
        </p>
      </div>

      {/* KPI Blocks Row (4 Columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Completed Dispatches */}
        <div className="border-[6px] border-ink bg-paper p-4 relative shadow-[4px_4px_0_0_#1A1A1B] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 border-b border-ink/20 pb-1.5 mb-2">
              <CheckSquare size={12} className="text-subway-red shrink-0" />
              <div className="font-mono text-[9px] font-black uppercase tracking-wider text-ink/60">Dispatches Done</div>
            </div>
            <div className="font-sans text-4xl font-black text-ink">
              {completedCount}
            </div>
          </div>
          <div className="font-mono text-[7.5px] uppercase font-black text-ink/40 mt-3 flex justify-between items-center bg-stone-100 p-1 border border-ink/10 rounded-3xs">
            <span>Volume:</span>
            <span className="font-bold text-ink">{totalTasksCount} Total ({taskFulfillmentRatio}%)</span>
          </div>
        </div>

        {/* Card 2: Actual Focus minutes */}
        <div className="border-[6px] border-ink bg-taxi p-4 relative shadow-[4px_4px_0_0_#1A1A1B] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 border-b border-ink/30 pb-1.5 mb-2">
              <Clock size={12} className="text-ink shrink-0" />
              <div className="font-mono text-[9px] font-black uppercase tracking-wider text-ink/75">Logged Focus</div>
            </div>
            <div className="font-sans text-4xl font-black text-ink">
              {totalFocusedMinutes} <span className="text-xs uppercase font-bold text-ink/75 font-mono">MIN</span>
            </div>
          </div>
          <div className="font-mono text-[7.5px] uppercase font-black text-ink/50 mt-3 flex justify-between items-center bg-[#FFF]' p-1 border border-ink/20 rounded-3xs">
            <span>Frequency:</span>
            <span className="font-bold text-ink">{totalCycles} Real Cycles ({focusSuccessRate}% Done)</span>
          </div>
        </div>

        {/* Card 3: Best Streak */}
        <div className="border-[6px] border-ink bg-paper p-4 relative shadow-[4px_4px_0_0_#1A1A1B] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 border-b border-ink/20 pb-1.5 mb-2">
              <Flame size={12} className="text-subway-red shrink-0 animate-pulse" />
              <div className="font-mono text-[9px] font-black uppercase tracking-wider text-ink/60">Top Streak</div>
            </div>
            <div className="font-sans text-4xl font-black text-ink">
              {bestStreak} <span className="text-xs uppercase font-black font-mono">DAYS</span>
            </div>
          </div>
          <div className="font-mono text-[7.5px] uppercase font-black text-ink/40 mt-3 flex justify-between items-center bg-stone-100 p-1 border border-ink/10 rounded-3xs">
            <span>Status:</span>
            <span className="font-bold text-ink/80">Continuous Streak</span>
          </div>
        </div>

        {/* Card 4: Compliance Index */}
        <div className="border-[6px] border-ink bg-paper-dark text-paper p-4 relative shadow-[4px_4px_0_0_#1A1A1B] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 border-b border-paper/20 pb-1.5 mb-2">
              <Target size={12} className="text-taxi shrink-0" />
              <div className="font-mono text-[9px] font-black uppercase tracking-wider text-paper/70">Routine index</div>
            </div>
            <div className="font-sans text-4xl font-black text-paper">
              {overallHabitCompliance}%
            </div>
          </div>
          <div className="font-mono text-[7.5px] uppercase font-black text-paper/50 mt-3 flex justify-between items-center bg-black/15 p-1 border border-paper/10 rounded-3xs">
            <span>Acoustic:</span>
            <span className="font-bold text-taxi truncate max-w-[80px]" title={favoriteAmbient}>{favoriteAmbient}</span>
          </div>
        </div>

      </div>

      {/* Main Grid: 01 Tasks Audit & 02 Focus Ledger */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* SECTION 01: TRANSIT VELOCITY & TASK DISTRIBUTION */}
        <div className="border-[6px] border-ink p-5 bg-paper relative flex flex-col justify-between shadow-[4px_4px_0_0_#1A1A1B]">
          <div>
            <div className="flex justify-between items-center border-b-2 border-ink pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-subway-red" />
                <h3 className="font-sans font-black uppercase tracking-tight text-md">
                  01 // TRANSIT VELOCITY
                </h3>
              </div>
              <span className="font-mono text-[8.5px] font-black bg-ink text-paper px-1.5 py-0.5 rounded-3xs">
                7-DAY ASSIGNMENT VELOCITY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Chart (Spans 2 columns on tablet+) */}
              <div className="md:col-span-2 space-y-2">
                <p className="font-mono text-[9px] font-black uppercase text-ink/50">
                  Daily Task Shipments Mapped
                </p>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={taskChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e1e1" strokeWidth={1} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={{ stroke: '#1A1A1B', strokeWidth: 2 }}
                        tickLine={false}
                        tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: '#1A1A1B', fontWeight: 'bold' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={{ stroke: '#1A1A1B', strokeWidth: 2 }}
                        tickLine={false}
                        tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: '#1A1A1B' }}
                        allowDecimals={false}
                        dx={-5}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#F4F1EA', 
                          border: '3px solid #1A1A1B', 
                          borderRadius: 0, 
                          fontFamily: 'JetBrains Mono', 
                          fontSize: '11px',
                          fontWeight: 'bold',
                          boxShadow: '2.5px 2.5px 0px #1A1A1B'
                        }}
                        itemStyle={{ color: '#EF4444' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="#EF4444" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCompleted)" 
                        activeDot={{ r: 6, fill: '#F7C331', stroke: '#1A1A1B', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Priority inventory indicators */}
              <div className="flex flex-col justify-between border-l border-ink/20 pl-0 md:pl-6 space-y-4">
                <div>
                  <h4 className="font-mono text-[9px] font-black uppercase text-ink/40 mb-3 block">
                    Fulfillment Inventory
                  </h4>
                  <div className="space-y-3">
                    {/* Urgent */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[8px] font-black uppercase">
                        <span className="text-subway-red">CRITICAL/URGENT</span>
                        <span>{priorityStats.urgent.done} / {priorityStats.urgent.total}</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-200 border border-ink/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-subway-red" 
                          style={{ width: `${priorityStats.urgent.total > 0 ? (priorityStats.urgent.done / priorityStats.urgent.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    {/* Medium */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[8px] font-black uppercase">
                        <span className="text-ink">ROUTINE/MEDIUM</span>
                        <span>{priorityStats.medium.done} / {priorityStats.medium.total}</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-200 border border-ink/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-taxi" 
                          style={{ width: `${priorityStats.medium.total > 0 ? (priorityStats.medium.done / priorityStats.medium.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    {/* Low */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[8px] font-black uppercase">
                        <span className="text-ink/60">STANDBY/LOW</span>
                        <span>{priorityStats.low.done} / {priorityStats.low.total}</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-200 border border-ink/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-stone-500" 
                          style={{ width: `${priorityStats.low.total > 0 ? (priorityStats.low.done / priorityStats.low.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-100 p-2 border border-ink/15 rounded-sm select-none font-mono text-[7px] font-black text-ink/75">
                  <span className="text-stone-400 block mb-0.5">CURRENT SECTOR SUMMARY:</span>
                  <p className="text-xs uppercase font-serif tracking-tight">{peakActivityText}</p>
                </div>

              </div>

            </div>
          </div>
        </div>

        {/* SECTION 02: STATIONS CHRONO FOCUS AUDIT */}
        <div className="border-[6px] border-ink p-5 bg-paper relative flex flex-col justify-between shadow-[4px_4px_0_0_#1A1A1B]">
          <div>
            <div className="flex justify-between items-center border-b-2 border-ink pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-ink" />
                <h3 className="font-sans font-black uppercase tracking-tight text-md">
                  02 // FOCUS CALIBRATION
                </h3>
              </div>
              <span className="font-mono text-[8.5px] font-black bg-taxi text-ink px-1.5 py-0.5 rounded-3xs">
                STATION FOCUS DISTRIBUTION
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Chart */}
              <div className="md:col-span-2 space-y-2">
                <p className="font-mono text-[9px] font-black uppercase text-ink/50">
                  Weekly Focus Allocation (Minutes / Day)
                </p>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={focusChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e1e1" strokeWidth={1} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={{ stroke: '#1A1A1B', strokeWidth: 2 }}
                        tickLine={false}
                        tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: '#1A1A1B', fontWeight: 'bold' }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={{ stroke: '#1A1A1B', strokeWidth: 2 }}
                        tickLine={false}
                        tick={{ fontFamily: 'JetBrains Mono', fontSize: 9, fill: '#1A1A1B' }}
                        allowDecimals={false}
                        dx={-5}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#F4F1EA', 
                          border: '3px solid #1A1A1B', 
                          borderRadius: 0, 
                          fontFamily: 'JetBrains Mono', 
                          fontSize: '11px',
                          fontWeight: 'bold',
                          boxShadow: '2.5px 2.5px 0px #1A1A1B'
                        }}
                        itemStyle={{ color: '#1A1A1B' }}
                        formatter={(value) => [`${value} minutes focused`]}
                      />
                      <Bar 
                        dataKey="minutes" 
                        fill="#F7C331" 
                        stroke="#1A1A1B" 
                        strokeWidth={2}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Focus stats parameters */}
              <div className="flex flex-col justify-between border-l border-ink/20 pl-0 md:pl-6 space-y-4">
                <div>
                  <h4 className="font-mono text-[9px] font-black uppercase text-ink/40 mb-3 block">
                    Calibration Indicators
                  </h4>
                  <ul className="space-y-2 font-mono text-[9px] font-black">
                    <li className="flex justify-between border-b border-dashed border-ink/10 pb-1">
                      <span className="text-stone-500 uppercase">FULFILL RATE</span>
                      <span className="text-ink text-right">{focusSuccessRate}%</span>
                    </li>
                    <li className="flex justify-between border-b border-dashed border-ink/10 pb-1">
                      <span className="text-stone-500 uppercase">RUNS LOGGED</span>
                      <span className="text-ink text-right">{totalCycles} CYCLES</span>
                    </li>
                    <li className="flex justify-between border-b border-dashed border-ink/10 pb-1">
                      <span className="text-stone-500 uppercase">SESSION AVG</span>
                      <span className="text-ink text-right">
                        {totalCycles > 0 ? Math.round(totalFocusedMinutes / totalCycles) : 0} M/RUN
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-stone-500 uppercase">ACOUSTICS</span>
                      <span className="text-subway-red text-right truncate max-w-[80px]" title={favoriteAmbient}>{favoriteAmbient}</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-stone-100 p-2 border border-ink/15 rounded-sm select-none font-mono text-[7px] font-black text-stone-500 leading-normal">
                  <span className="text-ink block font-black mb-0.5">📟 QUALITY RECONCILIATION:</span>
                  Completed <span className="text-subway-red font-black">{completedCycles} sessions</span> out of <span className="text-ink font-black">{totalCycles} initialized</span>. Unfinished dispatches represent partial focus cycles logged early.
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>

      {/* SECTION 03: HABITS 30-DAY INTERACTIVE TRENDS */}
      <div className="space-y-4">
        
        {/* Title */}
        <div className="flex items-baseline gap-2 border-b-4 border-ink pb-2">
          <span className="font-sans text-2xl font-black uppercase tracking-tight">03 // LINE EFFICIENCY MATRIX</span>
          <span className="font-mono text-[9px] font-black opacity-40">30-DAY INTERACTIVE ARCHIVAL RECORD</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left panel: Selected visual trend line chart (Spans 2 columns) */}
          <div className="lg:col-span-2 border-[6px] border-ink p-4 bg-paper relative flex flex-col gap-4 shadow-[4px_4px_0_0_#1A1A1B]">
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b-2 border-ink pb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <Gauge size={14} className="text-subway-red animate-pulse" />
                  <h3 className="font-sans font-black uppercase tracking-tight text-sm">
                    {selectedHabitId === 'all' ? 'All Transit Lines Combined' : `${activeHabit?.name} Route`}
                  </h3>
                </div>
                <p className="font-mono text-[9px] font-black uppercase opacity-60 mt-0.5">
                  Performance audit of route compliance
                </p>
              </div>

              {/* Metric Type buttons */}
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setMetricType('rolling')}
                  className={`font-mono text-[8.5px] font-black border-2 py-0.5 px-2 uppercase rounded-sm cursor-pointer transition-all ${
                    metricType === 'rolling'
                      ? 'bg-ink text-white border-ink shadow-xs'
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
                      ? 'bg-ink text-white border-ink shadow-xs'
                      : 'bg-white text-ink/70 border-ink/15 hover:border-ink/50'
                  }`}
                  title="Exact daily execution score (0% or 100%)"
                >
                  Daily Status
                </button>
              </div>
            </div>

            {/* Recharts Canvas */}
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
                    axisLine={{ stroke: '#1A1A1B', strokeWidth: 2 }}
                    tickLine={false}
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 8, fill: '#1A1A1B', fontWeight: 'bold' }}
                    dy={10}
                    interval={5} // Skip some values to fit 30 nicely
                  />
                  <YAxis 
                    domain={[0, 100]}
                    axisLine={{ stroke: '#1A1A1B', strokeWidth: 2 }}
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                    tick={{ fontFamily: 'JetBrains Mono', fontSize: 8, fill: '#1A1A1B', fontWeight: 'bold' }}
                    dx={-5}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#F4F1EA', 
                      border: '3px solid #1A1A1B', 
                      borderRadius: 0, 
                      fontFamily: 'JetBrains Mono', 
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '2.5px 2.5px 0px #1A1A1B'
                    }}
                    formatter={(value: any) => [`${value}% Efficiency`, activeLabel]}
                    labelStyle={{ color: '#1A1A1B', borderBottom: '1px border-dashed #1a1a1b', paddingBottom: '4px', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={activeDataKey} 
                    stroke={activeColor} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorHabit)" 
                    activeDot={{ r: 6, fill: '#F7C331', stroke: '#1A1A1B', strokeWidth: 2.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

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

          {/* Right panel: Static system ledger details & instructions */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="border-[6px] border-ink bg-paper p-5 relative shadow-[4px_4px_0_0_#1A1A1B] h-full flex flex-col justify-between">
              <div>
                <span className="font-mono text-[8.5px] font-black uppercase text-subway-red block mb-1">
                  LINE STATISTICS CONTROL
                </span>
                <h4 className="font-sans font-black text-xl text-ink uppercase tracking-tight block">
                  30D COMPLIANCE TRACKS
                </h4>
                <p className="font-mono text-[9px] text-ink/70 uppercase leading-relaxed mt-2 pb-3 border-b border-dashed border-ink/20">
                  Select any active Route below. The efficiency matrix measures the compliance rate of the specific line across all days it was actively scheduled in the last 30-day registry.
                </p>

                <div className="space-y-3 py-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9px] font-bold text-ink/60">ACTIVE TRACKED LINES:</span>
                    <span className="font-mono text-[10px] font-black text-ink">{habits.length} ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9px] font-bold text-ink/60">ALL-TIME REGISTRY LOGS:</span>
                    <span className="font-mono text-[10px] font-black text-subway-red">
                      {habits.reduce((acc, h) => acc + Object.values(h.history || {}).filter(Boolean).length, 0)} COMMITS
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[9px] font-bold text-ink/60">SYSTEM FLEET INTEGRITY:</span>
                    <span className="font-mono text-[10px] font-black text-taxi bg-ink px-1.5 py-0.2 rounded-3xs">
                      {overallHabitCompliance}% EFFICIENCY
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50 border border-ink/15 p-2 rounded-xs select-none font-mono text-[7px] font-bold text-ink/70 leading-normal">
                ⭐ <strong className="font-black text-ink">DISCIPLINE BONUS:</strong> Maintaining streaks above 4 days awards a compounding charge multiplier to the overall routine integrity score.
              </div>
            </div>
          </div>

        </div>

        {/* Depot Grid - Habit Selection Cards */}
        <div className="space-y-2">
          <p className="font-mono text-[8px] uppercase font-black text-ink/50 text-center tracking-widest">
            🚂 CLICK ANY ACTIVE TRACK OR ROUTE BELOW TO ENGAGE HISTORICAL AUDIT:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            
            {/* Unified aggregate fleet button */}
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
                    Unified Fleet Load
                  </span>
                </div>
              </div>

              <div className="w-full border-t border-dashed border-ink/10 pt-1.5 mt-2 flex justify-between items-center text-right font-mono text-[7.5px] font-black">
                <span className="text-ink/40 uppercase">Consolidated:</span>
                <span className="bg-taxi text-ink px-1 rounded-3xs border border-ink/10">30D CORE</span>
              </div>
            </button>

            {/* Individual active habit items from datastore */}
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
                      <span className="text-ink/75 font-bold">
                        {efficiency}% EFF
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
          
          {habits.length === 0 && (
             <div className="text-center py-8 font-serif italic text-ink/35 border-2 border-dashed border-ink/15 rounded-sm bg-stone-50 select-none">
               No established lines in dispatch depot database yet. Create route disciplines in your dashboard or planner to activate visualizer trackers!
             </div>
          )}
        </div>
      </div>

      {/* SECTION 04: BIOLOGICAL OPERATIONS INFOGRAPHIC */}
      <div className="bg-ink text-paper p-6 relative overflow-hidden shadow-[6px_6px_0_0_#F7C331] border-[6px] border-ink select-none">
        <div className="absolute -right-4 -top-4 w-16 h-16 border-[6px] border-taxi rounded-full opacity-25 pointer-events-none" />
        <div className="flex items-center gap-2 mb-2">
          <Activity size={18} className="text-taxi text-bold animate-pulse" />
          <h3 className="font-sans text-xl font-black uppercase tracking-tight leading-none text-taxi">
            04 // REAL-TIME COGNITIVE & PRODUCTIVITY BIO-METRICS
          </h3>
        </div>
        <p className="font-mono text-[9px] text-paper/75 uppercase block border-b border-paper/15 pb-2.5 mb-4">
          A dynamic algorithmic assessment of your operational states derived directly from real datastore performance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Bar 1: Mental Clarity */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] uppercase">
              <span className="font-black text-paper">Cognitive Clarity</span>
              <span className="font-black text-taxi">{clarityScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-ink-light border border-paper/10 overflow-hidden">
              <div 
                className="h-full bg-paper transition-all duration-700 ease-out" 
                style={{ width: `${clarityScore}%` }}
              />
            </div>
            <p className="font-mono text-[7px] text-paper/40 uppercase leading-snug">
              Weighted index matching task fulfillment ratio (60%) combined with historical habit commitments balance (40%). High completion density clears cerebral overhead.
            </p>
          </div>

          {/* Bar 2: Deep Focus */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] uppercase">
              <span className="font-black text-paper">Operational Stamina</span>
              <span className="font-black text-subway-red">{staminaScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-ink-light border border-paper/10 overflow-hidden">
              <div 
                className="h-full bg-taxi transition-all duration-700 ease-out" 
                style={{ width: `${staminaScore}%` }}
              />
            </div>
            <p className="font-mono text-[7px] text-paper/40 uppercase leading-snug">
              Pro-rata focus duration coefficient targeting 100 actual logged focus minutes per week. Derived dynamically from absolute recorded stopwatch runs.
            </p>
          </div>

          {/* Bar 3: Social Battery / Charge */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] uppercase">
              <span className="font-black text-paper">Routine Integrity</span>
              <span className="font-black text-emerald-400">{routineScore}%</span>
            </div>
            <div className="w-full h-2.5 bg-ink-light border border-paper/10 overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-700 ease-out" 
                style={{ width: `${routineScore}%` }}
              />
            </div>
            <p className="font-mono text-[7px] text-paper/40 uppercase leading-snug">
              Habit track stability index. Amplified compounding multiplier awarded based on consecutive streaks. Resets dynamically under scheduled misses.
            </p>
          </div>

        </div>

        <div className="mt-4 pt-3 border-t border-paper/10 text-center">
          <span className="font-mono text-[7px] text-paper/30 tracking-widest uppercase">
            ⚡ DATABASE LOGS AUTOMATICALLY RECONCILE UPON INCOMING TELEMETRICS ⚡
          </span>
        </div>
      </div>

    </div>
  );
}
