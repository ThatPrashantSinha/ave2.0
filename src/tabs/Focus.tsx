import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw } from 'lucide-react';

export function Focus() {
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

  // Calculate progress
  const totalDuration = 25 * 60;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-ink text-paper border-[12px] border-taxi p-10 max-w-2xl w-full relative shadow-[12px_12px_0px_#1A1A1B]">
        
        {/* Background decorative element */}
        <div className="absolute top-10 right-10 w-48 h-48 border-[16px] border-[#333] rounded-full opacity-50 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-center font-black font-sans uppercase text-xs border-b-2 border-taxi/50 mb-6 pb-2 text-taxi">
            <span>Current Focus Session</span>
            <span>Deep Work</span>
          </div>
          
          <h2 className="font-sans text-5xl md:text-7xl font-black uppercase tracking-tight mb-8 leading-none">Midnight Jazz Session</h2>
          
          <div className="flex flex-col md:flex-row items-center gap-10 py-10 border-y-[6px] border-taxi border-dashed">
            
            <div className="flex-1 w-full relative">
              <div className="font-mono text-8xl md:text-9xl font-black text-center">{m}:{s}</div>
              
              {/* Progress bar below timer */}
              <div className="w-full h-4 bg-[#333] mt-8 border-2 border-taxi relative overflow-hidden">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-taxi transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex md:flex-col justify-center space-x-4 md:space-x-0 md:space-y-4">
              <button 
                onClick={toggleTimer}
                className="bg-taxi flex items-center justify-center gap-2 text-ink border-4 border-taxi px-8 py-4 font-mono text-lg uppercase font-black active:bg-paper active:text-ink transition-colors shadow-[6px_6px_0px_var(--color-paper)] active:shadow-none"
              >
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button 
                onClick={resetTimer}
                className="bg-transparent text-taxi border-4 border-taxi px-8 py-4 font-mono text-lg uppercase font-black hover:bg-taxi hover:text-ink transition-colors"
                title="Reset"
              >
                Reset
              </button>
            </div>
          </div>
          
          <div className="mt-8 flex justify-between items-center">
            <p className="font-mono text-xs uppercase font-bold tracking-widest opacity-80 text-taxi">
              Ambient: Rain on Window + Coltrane
            </p>
            <div className="w-8 h-8 rounded-full bg-taxi animate-pulse"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
