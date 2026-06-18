import React from 'react';
import { Task, Habit } from '../types';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { toIST } from '../lib/utils';
import { getOccurrencesForDateRange } from '../lib/recurrence';

export function Progress({ tasks, habits }: { tasks: Task[], habits: Habit[] }) {
  const last7DaysInterval = eachDayOfInterval({ start: subDays(toIST(new Date()), 6), end: toIST(new Date()) });
  
  // Expand repeating tasks for the 7 day charting period
  const occurrencesIn7Days = getOccurrencesForDateRange(tasks, subDays(toIST(new Date()), 6), toIST(new Date()));

  const chartData = last7DaysInterval.map((dayDate) => {
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

  const completedCount = tasks.reduce((acc, t) => {
    if (!t.recurring || t.recurring === 'none') {
      return acc + (t.status === 'done' ? 1 : 0);
    } else {
      const doneOccurrences = Object.values(t.occurrenceStatuses || {}).filter(s => s === 'done').length;
      return acc + doneOccurrences;
    }
  }, 0);
  const focusMins = completedCount * 25; // Dynamic estimation: 25 mins per completed task
  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak), 0) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* Overview Analytics */}
      <div className="space-y-6">
        <h2 className="font-sans text-3xl font-black uppercase tracking-tight border-b-4 border-ink pb-2">The Ledger Details</h2>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="border-[6px] border-ink bg-paper p-4 text-center">
             <div className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1 border-b border-ink/20 pb-1">Tasks Done</div>
             <div className="font-sans text-4xl font-black">{completedCount}</div>
          </div>
          <div className="border-[6px] border-ink bg-taxi p-4 text-center shadow-[4px_4px_0_0_#1A1A1B]">
             <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink mb-1 border-b border-ink/30 pb-1">Focus Mins</div>
             <div className="font-sans text-4xl font-black">{focusMins}</div>
          </div>
          <div className="border-[6px] border-ink bg-paper-dark p-4 text-center">
             <div className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1 border-b border-ink/20 pb-1">Best Streak</div>
             <div className="font-sans text-4xl font-black border border-ink px-1 inline-block bg-paper">{bestStreak}</div>
          </div>
        </div>

        {/* Productivity Transit Line (Chart) */}
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
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
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

      {/* Habits & Streaks */}
      <div className="space-y-6">
        <h2 className="font-sans text-3xl font-black uppercase tracking-tight border-b-4 border-ink pb-2">Daily Disciplines</h2>
        
        <div className="space-y-4">
          {habits.map((habit) => (
            <div key={habit.id} className="border-[6px] border-ink bg-paper p-4">
              <div className="flex justify-between items-center border-b border-ink/30 pb-2 mb-3">
                <h3 className="font-sans font-black uppercase tracking-tight">{habit.name}</h3>
                <div className="font-mono text-xs font-bold uppercase"><span className="text-subway-red">{habit.streak}</span> / Day Streak</div>
              </div>
              
              <div className="flex justify-between gap-1">
                {/* Last 7 days boxes */}
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = format(subDays(toIST(new Date()), 6 - i), 'yyyy-MM-dd');
                  const isCompleted = habit.history[date];
                  const isToday = i === 6;
                  
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 w-full relative">
                      <div className="font-mono text-[8px] uppercase">{format(new Date(date), 'EE')}</div>
                      <div 
                        className={`w-full aspect-square border-2 border-ink transition-colors flex items-center justify-center ${
                          isCompleted ? 'bg-ink' : isToday ? 'bg-taxi bg-opacity-20 border-dashed hover:bg-taxi cursor-pointer' : 'bg-transparent'
                        }`}
                      >
                         {/* Optional tiny checkmark or X if we want */}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {habits.length === 0 && (
             <div className="text-center py-8 font-serif italic text-ink-light border border-dashed border-ink">
               No disciplines established yet.
             </div>
          )}
        </div>

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
