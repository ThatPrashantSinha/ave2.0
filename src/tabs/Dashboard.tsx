import React, { useState, useEffect } from 'react';
import { Task, Habit, Birthday } from '../types';
import { format, isSameDay } from 'date-fns';
import { Play, Square, RotateCcw, Check, ChevronDown, ChevronUp, Gift } from 'lucide-react';
import { cn, toIST } from '../lib/utils';
import { getOccurrencesForDateRange } from '../lib/recurrence';

export function Dashboard({ tasks, habits, toggleTask, birthdays = [] }: { tasks: Task[], habits: Habit[], toggleTask: (id: string) => void, birthdays?: Birthday[] }) {
  const today = toIST(new Date());
  
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
          <span className="bg-ink text-white px-3 py-1 text-xs font-bold uppercase font-mono">{todayTasks.length} Pending</span>
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
        
        <div className="space-y-4">
          {todayTasks.map((task, idx) => (
            <div 
              key={task.id} 
              className={cn(
                "p-4.5 vintage-shadow bg-paper hover:bg-paper-dark border-2 border-ink flex gap-3 cursor-pointer hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_var(--color-ink)] transition-all rounded-sm",
                task.priority === 'urgent' ? "bg-taxi hover:bg-taxi/95" : "bg-paper",
                idx % 2 !== 0 && task.priority !== 'urgent' && "border-dashed"
              )}
              onClick={() => toggleTask(task.id)}
            >
              <div className="mt-1">
                <div className="w-5 h-5 border-2 border-ink flex items-center justify-center bg-paper shadow-[2px_2px_0px_#1A1A1B]">
                  {task.status === 'in-progress' && <div className="w-2.5 h-2.5 bg-ink animate-pulse" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={cn("font-black font-sans leading-tight uppercase text-ink text-sm tracking-tight", task.priority === 'urgent' && "tracking-wide")}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {task.priority === 'urgent' && (
                      <span className="bg-subway-red text-white px-2 py-0.5 text-[9px] font-black uppercase flex-shrink-0 animate-pulse border border-ink shadow-[1.5px_1.5px_0px_#1A1A1B]">
                        Priority
                      </span>
                    )}
                    {task.description && task.description.length > 60 && (
                      <button
                        onClick={(e) => toggleExpandDescription(task.id, e)}
                        className="inline-flex items-center justify-center border-2 border-ink bg-paper hover:bg-paper-dark text-ink p-1 shadow-[1.5px_1.5px_0px_#1A1A1B] active:shadow-none transition-all rounded-xs cursor-pointer"
                        title={expandedDescriptions[task.id] ? "Collapse Description" : "Expand Description"}
                      >
                        {expandedDescriptions[task.id] ? <ChevronUp size={10} strokeWidth={3.5} /> : <ChevronDown size={10} strokeWidth={3.5} />}
                      </button>
                    )}
                  </div>
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
                  <div className="flex items-center gap-1.5 mt-2.5 text-[9px] font-mono font-black text-[#EF4444] uppercase tracking-wider bg-[#EF4444]/10 border border-[#EF4444]/30 px-1.5 py-0.5 rounded-sm w-fit">
                    <span className="text-[8px]">🔁</span>
                    <span>
                      {task.recurring === 'custom' && task.recurrenceRule ? (
                        `custom-interval: ${task.recurrenceRule.frequency} x${task.recurrenceRule.interval}`
                      ) : (
                        `frequency: ${task.recurring}`
                      )}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-3 pt-2.5 border-t-2 border-ink/10">
                  <span className="font-mono text-[10px] font-black flex items-center gap-1 text-ink/80 bg-ink/5 px-2 py-0.5 rounded-xs border border-ink/10">
                    <span className="text-[8px]">⏱</span>
                    {task.deadline ? (
                      <>
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
                      </>
                    ) : (
                      'Anytime'
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {completedTasks.map((task) => (
             <div 
             key={task.id} 
             className="p-3 bg-paper border border-ink/30 flex gap-3 opacity-60 line-through grayscale cursor-pointer hover:bg-paper-dark transition-colors"
             onClick={() => toggleTask(task.id)}
           >
             <div className="mt-1">
               <div className="w-5 h-5 border-2 border-ink/40 flex items-center justify-center font-black text-xs bg-ink/5">
                 ✓
               </div>
             </div>
             <div className="flex-1 min-w-0">
               <div className="flex items-start justify-between gap-2">
                 <h3 className="font-black font-sans leading-tight uppercase text-sm truncate">{task.title}</h3>
                 {task.description && task.description.length > 60 && (
                   <button
                     onClick={(e) => toggleExpandDescription(task.id, e)}
                     className="inline-flex items-center justify-center border border-ink/40 bg-paper/50 hover:bg-paper text-ink p-1 transition-all rounded-xs cursor-pointer flex-shrink-0"
                     title={expandedDescriptions[task.id] ? "Collapse Description" : "Expand Description"}
                   >
                     {expandedDescriptions[task.id] ? <ChevronUp size={10} strokeWidth={3} /> : <ChevronDown size={10} strokeWidth={3} />}
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
                     <p className="text-[10px] font-mono text-ink/50 mt-1 leading-snug break-words">
                       {displayText}
                       {isLong && !isExpanded && (
                         <span 
                           onClick={(e) => toggleExpandDescription(task.id, e)} 
                           className="hidden inline-block"
                         >
                           [more]
                         </span>
                       )}
                     </p>
                   );
                 })()
               )}
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
