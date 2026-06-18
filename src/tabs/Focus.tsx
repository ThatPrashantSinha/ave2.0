import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface FocusPreset {
  name: string;
  duration: number; // in seconds
  ambient: string;
  code: string; // e.g. "STA-25", "REP-50"
  description: string;
}

const FOCUS_PRESETS: FocusPreset[] = [
  {
    name: "Midnight Jazz Session",
    duration: 25 * 60,
    ambient: "Rain on Window & Coltrane",
    code: "JAZZ-25",
    description: "Low-tempo bebop sax coupled with soft urban rain shower."
  },
  {
    name: "Newsroom Telegraph",
    duration: 25 * 60,
    ambient: "Stationery Ticker Pulse",
    code: "TEL-25",
    description: "Rhythmic mechanical click-clack of keys and typewriter tape."
  },
  {
    name: "Deep Docket Archives",
    duration: 50 * 60,
    ambient: "Warm Vinyl Crackle",
    code: "ARC-50",
    description: "Steady high-density vinyl friction noise to anchor deep study."
  },
  {
    name: "Recess Dispatch",
    duration: 5 * 60,
    ambient: "Espresso Steam Humming",
    code: "REC-05",
    description: "A fast, tranquil interlude to refresh the busy coordinator."
  }
];

export function Focus() {
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const currentPreset = FOCUS_PRESETS[activePresetIndex];
  
  const [timeLeft, setTimeLeft] = useState(currentPreset.duration);
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
  const resetTimer = () => { 
    setIsRunning(false); 
    setTimeLeft(currentPreset.duration); 
  };
  
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');

  // Calculate progress
  const totalDuration = currentPreset.duration;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  return (
    <div className="w-full max-w-xl mx-auto px-1 sm:px-4 py-2 sm:py-6">
      <div className="bg-ink text-paper border-[6px] sm:border-[10px] border-taxi p-4 sm:p-8 relative shadow-[8px_8px_0px_#1A1A1B] select-none overflow-hidden rounded-sm">
        
        {/* Vintage Top Utility Line */}
        <div className="flex justify-between items-center font-black font-mono uppercase text-[9px] sm:text-xs border-b-2 border-taxi/40 mb-6 pb-2 text-taxi tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isRunning ? "bg-[#10B981] animate-pulse" : "bg-taxi"
            )}></span>
            CHRONOGRAPH DISPATCH
          </span>
          <span className="bg-taxi/20 text-taxi px-1.5 py-0.5 font-bold">
            SIGNAL: ACTIVE
          </span>
        </div>

        {/* Prescription Header */}
        <div className="mb-6">
          <span className="font-mono text-[10px] text-taxi font-black tracking-widest uppercase opacity-75">
            Station Preset: {currentPreset.code}
          </span>
          <h2 className="font-sans text-2xl sm:text-4xl font-black uppercase tracking-tight text-paper mt-1 leading-tight border-b-2 border-dashed border-taxi/20 pb-4">
            {currentPreset.name}
          </h2>
        </div>

        {/* Primary Chronograph Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 py-6 border-y-4 border-taxi/40 border-dashed">
          
          {/* Chrono Counter & Custom Gauge Progress Bar */}
          <div className="flex-1 w-full flex flex-col items-center">
            <div className="font-mono text-6xl xs:text-7xl sm:text-8xl font-black text-center tracking-tighter text-paper leading-none">
              {m}:{s}
            </div>
            
            {/* Split Digital Gauge */}
            <div className="w-full mt-6">
              <div className="flex justify-between font-mono text-[8px] text-taxi/60 font-black uppercase tracking-wider mb-1.5 px-0.5">
                <span>0% COMMITTED</span>
                <span>50%</span>
                <span>100% DISPATCHED</span>
              </div>
              
              <div className="w-full h-5 bg-[#252526] border-2 border-taxi/60 relative overflow-hidden flex items-center p-[2px]">
                {/* Vintage Gauge Grid ticking stripes in background */}
                <div className="absolute inset-0 flex justify-between px-3 pointer-events-none opacity-20">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-[1.5px] h-full bg-taxi"></div>
                  ))}
                </div>
                
                {/* Active Meter Color */}
                <div 
                  className="h-full bg-taxi transition-all duration-1000 flex items-center justify-end relative shadow-[inset_0px_2px_4px_rgba(0,0,0,0.4)]"
                  style={{ width: `${progressPercent}%` }}
                >
                  {isRunning && progressPercent > 0 && (
                    <div className="w-1.5 h-full bg-paper animate-pulse shrink-0"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Side Chrono Controls */}
          <div className="flex flex-row sm:flex-col justify-center gap-3 w-full sm:w-auto shrink-0">
            <button 
              type="button"
              onClick={toggleTimer}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 border-[4px] py-3.5 px-6 font-mono text-xs sm:text-sm uppercase font-black tracking-wider transition-all duration-150 cursor-pointer min-h-[46px]",
                isRunning 
                  ? "bg-subway-red text-paper border-subway-red shadow-[3px_3px_0px_#1A1A1B] active:shadow-none active:translate-x-[2.5px] active:translate-y-[2.5px]" 
                  : "bg-taxi text-ink border-taxi shadow-[3px_3px_0px_#1A1A1B] hover:bg-[#FFE359] active:shadow-none active:translate-x-[2.5px] active:translate-y-[2.5px]"
              )}
            >
              {isRunning ? 'Pause Chrono' : 'Start Chrono'}
            </button>
            <button 
              type="button"
              onClick={resetTimer}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-transparent text-paper/70 border-[4px] border-paper/30 hover:border-taxi hover:text-taxi py-3.5 px-6 font-mono text-xs sm:text-sm uppercase font-black tracking-wider transition-all duration-150 cursor-pointer shadow-[3px_3px_0px_rgba(0,0,0,0.15)] active:shadow-none active:translate-x-[2.5px] active:translate-y-[2.5px] min-h-[46px]"
              title="Reset timer to preset default"
            >
              <RotateCcw size={12} strokeWidth={3} />
              Reset
            </button>
          </div>
        </div>

        {/* Vintage Receiver Preset Stations Tuner (High UX Value) */}
        <div className="mt-6">
          <span className="font-mono text-[9px] text-taxi font-black uppercase tracking-widest opacity-60 block mb-2.5">
            📶 TUNING TRANSIT FREQUENCY Presets
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {FOCUS_PRESETS.map((p, index) => {
              const isSelected = activePresetIndex === index;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    setActivePresetIndex(index);
                    setTimeLeft(p.duration);
                    setIsRunning(false);
                  }}
                  className={cn(
                    "p-2.5 text-left border-2 font-mono transition-all duration-150 cursor-pointer flex flex-col justify-between h-[54px] rounded-xs",
                    isSelected 
                      ? "bg-taxi/10 border-taxi text-taxi shadow-[2px_2px_0px_#1A1A1B]" 
                      : "bg-transparent border-paper/10 text-paper/40 hover:bg-paper/5 hover:text-paper/70 hover:border-paper/20"
                  )}
                >
                  <div className="flex justify-between items-start w-full gap-1">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight leading-none truncate max-w-[80%]">
                      {p.name.replace(" Session", "").replace(" Archives", "").replace(" Dispatch", "")}
                    </span>
                    <span className={cn(
                      "text-[7px] px-1 py-0.5 font-bold leading-none scale-90",
                      isSelected ? "bg-taxi text-ink" : "bg-paper/10 text-paper/50"
                    )}>
                      {p.code}
                    </span>
                  </div>
                  <span className="text-[7.5px] opacity-80 font-medium truncate w-full block">
                    {p.ambient}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vintage Station Details & Signal Status Footer */}
        <div className="mt-8 pt-4 border-t border-taxi/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-taxi font-mono text-[9px] sm:text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "w-2.5 h-2.5 rounded-full",
              isRunning ? "bg-[#10B981] animate-pulse" : "bg-subway-red"
            )}></span>
            <span className="font-black uppercase tracking-widest">
              {isRunning ? `CHRONO STATE: RUNNING (${currentPreset.code})` : "CHRONO STATE: STANDBY"}
            </span>
          </div>
          <div className="text-left sm:text-right italic opacity-85 uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
            Sound: {currentPreset.ambient}
          </div>
        </div>

      </div>
    </div>
  );
}
