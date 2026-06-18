import React, { useState, useEffect } from 'react';
import { Task, Habit } from '../types';
import { format } from 'date-fns';
import { Play, Square, RotateCcw, Check } from 'lucide-react';
import { cn, toIST } from '../lib/utils';
import { getOccurrencesForDateRange } from '../lib/recurrence';

export function Dashboard({ tasks, habits, toggleTask }: { tasks: Task[], habits: Habit[], toggleTask: (id: string) => void }) {
  const today = toIST(new Date());
  const todayOccurrences = getOccurrencesForDateRange(tasks, today, today);
  const todayTasks = todayOccurrences.filter(t => t.status !== 'done');
  const completedTasks = todayOccurrences.filter(t => t.status === 'done');
  const totalTasks = todayOccurrences.length || 1;
  const progressPercent = Math.round((completedTasks.length / totalTasks) * 100);

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
          <span className="bg-ink text-white px-3 py-1 text-xs font-bold uppercase font-mono">{todayTasks.length} Pending</span>
        </div>
        
        <div className="space-y-4">
          {todayTasks.map((task, idx) => (
            <div 
              key={task.id} 
              className={cn(
                "p-3 vintage-shadow bg-paper-dark border-2 border-ink flex gap-3 cursor-pointer hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-ink)] transition-all",
                task.priority === 'urgent' && "bg-taxi",
                idx % 2 !== 0 && task.priority !== 'urgent' && "border-dashed"
              )}
              onClick={() => toggleTask(task.id)}
            >
              <div className="mt-1">
                <div className="w-5 h-5 border-2 border-ink flex items-center justify-center bg-paper">
                  {task.status === 'in-progress' && <div className="w-2.5 h-2.5 bg-ink" />}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={cn("font-black font-sans leading-tight uppercase", task.priority === 'urgent' && "tracking-wide text-sm")}>
                    {task.title}
                  </h3>
                   {task.priority === 'urgent' && <span className="bg-subway-red text-white px-2 py-0.5 text-[10px] font-bold uppercase ml-2 flex-shrink-0">Priority</span>}
                </div>
                {task.description && <p className="text-xs font-mono font-bold uppercase opacity-60 mt-1 leading-snug border-b border-dotted border-ink pb-1 inline-block">{task.description}</p>}
                
                <div className="flex justify-between items-center mt-3 pt-2">
                  <span className="font-mono text-xs font-black">
                    {task.deadline ? format(task.deadline, 'HH:mm') : 'Anytime'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {completedTasks.map((task) => (
             <div 
             key={task.id} 
             className="p-3 bg-paper border border-ink/30 flex gap-3 opacity-60 line-through grayscale cursor-pointer"
             onClick={() => toggleTask(task.id)}
           >
             <div className="mt-1">
               <div className="w-5 h-5 border-2 border-ink flex items-center justify-center font-black text-xs">
                 ✓
               </div>
             </div>
             <div className="flex-1">
               <h3 className="font-black font-sans leading-tight uppercase text-sm">{task.title}</h3>
             </div>
           </div>
          ))}

          {todayOccurrences.length === 0 && (
            <div className="text-center py-8 border border-dashed border-ink font-serif italic">
              The agenda is clear. Time for a coffee.
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

        <div className="grid grid-cols-2 gap-4">
          {/* Habit Chain */}
          <div className="border-[6px] border-ink bg-paper p-3 flex flex-col justify-between">
            <h3 className="font-sans font-black uppercase text-xs border-b border-ink pb-1 mb-2">Habit Chain</h3>
            <div className="grid grid-cols-5 gap-1 mb-2">
              {Array.from({length: 10}).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "aspect-square border-2 border-ink",
                    i < 7 ? "bg-ink" : i === 7 ? "bg-taxi" : "bg-transparent"
                  )}
                />
              ))}
            </div>
            <p className="font-mono text-[9px] font-bold uppercase opacity-60 border-t border-ink border-dotted pt-1 mt-1">12 Day Streak: Writing</p>
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
