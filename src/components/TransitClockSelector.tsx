import React, { useMemo } from 'react';
import { Clock, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface TransitClockSelectorProps {
  hour: number; // 24-hour style (0-23)
  minute: number; // 0-59
  color: string; // Dynamic habit route color
  onChange: (hour: number, minute: number) => void;
}

export function TransitClockSelector({ hour, minute, color, onChange }: TransitClockSelectorProps) {
  // Derive 12H hour and AM/PM from 24H hour prop
  const hour12 = useMemo(() => {
    const h12 = hour % 12;
    return h12 === 0 ? 12 : h12;
  }, [hour]);

  const ampm = useMemo<'AM' | 'PM'>(() => {
    return hour >= 12 ? 'PM' : 'AM';
  }, [hour]);

  // Combined 24-hour update helper
  const updateTime = (h12: number, m: number, p: 'AM' | 'PM') => {
    let newHour24 = h12;
    if (p === 'PM') {
      if (h12 < 12) newHour24 += 12;
    } else {
      if (h12 === 12) newHour24 = 0;
    }
    const boundedMin = Math.max(0, Math.min(59, m));
    onChange(newHour24, boundedMin);
  };

  const handleHourStep = (delta: number) => {
    let nextH12 = hour12 + delta;
    if (nextH12 > 12) nextH12 = 1;
    if (nextH12 < 1) nextH12 = 12;
    updateTime(nextH12, minute, ampm);
  };

  const handleMinuteStep = (delta: number) => {
    let nextMin = minute + delta;
    if (nextMin >= 60) nextMin = 0;
    if (nextMin < 0) nextMin = 55;
    updateTime(hour12, nextMin, ampm);
  };

  const setAmpm = (newAmpm: 'AM' | 'PM') => {
    if (newAmpm === ampm) return;
    updateTime(hour12, minute, newAmpm);
  };

  return (
    <div className="border-[3px] border-ink bg-paper p-3 text-ink shadow-[2.5px_2.5px_0px_#1A1A1B] select-none rounded-[2px] relative overflow-hidden">
      {/* Decorative route line marker */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 transition-colors duration-300" 
        style={{ backgroundColor: color || '#EF4444' }} 
      />

      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-ink/65 stroke-[2.5px]" />
          <span className="font-mono text-[8px] font-black tracking-widest text-ink/60 uppercase leading-none">
            DISPATCH TIME INPUT
          </span>
        </div>
        <span 
          className="font-mono text-[7px] font-black px-1 py-0.5 rounded uppercase border border-ink/10 leading-none"
          style={{ color: color || '#EF4444', backgroundColor: `${color || '#EF4444'}10` }}
        >
          Node Time Select
        </span>
      </div>

      {/* Main Digits Panel */}
      <div className="bg-[#FCFAF5] border-2 border-ink p-3 rounded-sm flex items-center justify-center gap-4 relative">
        
        {/* Hour Digital Block */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => handleHourStep(1)}
            className="w-10 h-7 flex items-center justify-center bg-paper hover:bg-stone-50 border-2 border-ink active:translate-y-0.5 transition-transform rounded shadow-[1px_1px_0px_#1A1A1B] active:shadow-none cursor-pointer"
          >
            <ChevronUp size={16} className="stroke-[3px]" />
          </button>
          
          <div className="my-1.5 text-center">
            <span className="font-mono text-xl font-black text-ink bg-white border-2 border-ink px-3 py-1 rounded shadow-inner block min-w-[3.25rem] select-all">
              {String(hour12).padStart(2, '0')}
            </span>
            <span className="font-mono text-[7px] font-black uppercase tracking-wider text-ink/30 block mt-0.5">
              HOUR
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleHourStep(-1)}
            className="w-10 h-7 flex items-center justify-center bg-paper hover:bg-stone-50 border-2 border-ink active:translate-y-[1px] transition-transform rounded shadow-[1px_1px_0px_#1A1A1B] active:shadow-none cursor-pointer"
          >
            <ChevronDown size={16} className="stroke-[3px]" />
          </button>
        </div>

        {/* Pulsing Colon Separator */}
        <div className="font-mono text-2xl font-black text-ink/40 select-none animate-pulse self-center pb-3">
          :
        </div>

        {/* Minute Digital Block */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => handleMinuteStep(5)}
            className="w-10 h-7 flex items-center justify-center bg-paper hover:bg-stone-50 border-2 border-ink active:translate-y-0.5 transition-transform rounded shadow-[1px_1px_0px_#1A1A1B] active:shadow-none cursor-pointer"
            title="Add 5 Minutes"
          >
            <span className="font-mono text-[9px] font-black">+5M</span>
          </button>

          <div className="my-1.5 text-center">
            <span className="font-mono text-xl font-black text-ink bg-white border-2 border-ink px-3 py-1 rounded shadow-inner block min-w-[3.25rem] select-all">
              {String(minute).padStart(2, '0')}
            </span>
            <span className="font-mono text-[7px] font-black uppercase tracking-wider text-ink/30 block mt-0.5">
              MINS
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleMinuteStep(-5)}
            className="w-10 h-7 flex items-center justify-center bg-paper hover:bg-stone-50 border-2 border-ink active:translate-y-[1px] transition-transform rounded shadow-[1px_1px_0px_#1A1A1B] active:shadow-none cursor-pointer"
            title="Subtract 5 Minutes"
          >
            <span className="font-mono text-[9px] font-black">-5M</span>
          </button>
        </div>

        {/* AM / PM Mechanical Switch */}
        <div className="flex flex-col gap-1.5 ml-2.5">
          {(['AM', 'PM'] as const).map((p) => {
            const isSelected = ampm === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setAmpm(p)}
                className={cn(
                  "px-3 py-1.5 font-mono text-[10px] font-black border-2 transition-all cursor-pointer rounded shadow-[1.5px_1.5px_0px_#1A1A1B] active:translate-y-[1px] active:shadow-none",
                  isSelected
                    ? "bg-taxi text-ink border-ink font-black scale-105"
                    : "bg-paper text-ink/40 border-ink/15 hover:text-ink/65"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

      </div>

      {/* Quick Interval Preset Chips */}
      <div className="flex justify-between items-center text-[7.5px] font-mono text-ink/65 uppercase bg-[#FCFAF5] border border-ink/10 px-2 py-1 rounded mt-2 select-none">
        <span className="font-black text-[7px]">Presets:</span>
        <div className="flex gap-1">
          {[
            { label: '08:00', h: 8, m: 0 },
            { label: '12:00', h: 12, m: 0 },
            { label: '18:00', h: 18, m: 0 },
            { label: '22:00', h: 22, m: 0 }
          ].map((preset, i) => {
            const isActive = hour === preset.h && minute === preset.m;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChange(preset.h, preset.m)}
                className={cn(
                  "border px-1.5 py-0.5 rounded text-[7px] font-black transition-colors cursor-pointer",
                  isActive
                    ? "bg-ink text-white border-ink"
                    : "bg-white hover:bg-taxi border-ink/20"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
