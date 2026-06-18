import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Clock, Keyboard, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface AnalogClockPickerProps {
  isOpen: boolean;
  onClose: () => void;
  value: string; // "HH:MM" 24h format
  onChange: (newValue: string) => void;
  title: string;
}

export function AnalogClockPicker({ isOpen, onClose, value, onChange, title }: AnalogClockPickerProps) {
  // Parse existing "HH:MM" 24-hour style
  const { initialHour, initialMinute } = useMemo(() => {
    const [hStr, mStr] = (value || '12:00').split(':');
    const h = parseInt(hStr, 10) || 12;
    const m = parseInt(mStr, 10) || 0;
    return { initialHour: h, initialMinute: m };
  }, [value]);

  // UI state derived from 24-hour style
  const [hour12, setHour12] = useState(() => {
    const h12 = initialHour % 12;
    return h12 === 0 ? 12 : h12;
  });
  const [minute, setMinute] = useState(initialMinute);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(initialHour >= 12 ? 'PM' : 'AM');
  
  // Selection modes: 'hours' or 'minutes'
  const [activeMode, setActiveMode] = useState<'hours' | 'minutes'>('hours');
  
  // Interface styles: 'dial' (clock face) or 'keyboard' (manual input form)
  const [pickerType, setPickerType] = useState<'dial' | 'keyboard'>('dial');

  const dialRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Sync internal state when opened or value updates
  useEffect(() => {
    if (isOpen) {
      const [hStr, mStr] = (value || '12:00').split(':');
      const h = parseInt(hStr, 10) || 12;
      const m = parseInt(mStr, 10) || 0;
      const h12 = h % 12;
      setHour12(h12 === 0 ? 12 : h12);
      setMinute(m);
      setAmpm(h >= 12 ? 'PM' : 'AM');
      setActiveMode('hours');
    }
  }, [value, isOpen]);

  if (!isOpen) return null;

  // Build and emit 24-hour string upon confirmation
  const handleConfirm = () => {
    let finalHour = hour12;
    if (ampm === 'PM' && hour12 < 12) finalHour += 12;
    if (ampm === 'AM' && hour12 === 12) finalHour = 0;
    
    const paddedHour = String(finalHour).padStart(2, '0');
    const paddedMinute = String(minute).padStart(2, '0');
    onChange(`${paddedHour}:${paddedMinute}`);
    onClose();
  };

  // Convert coordinate spaces of click/drag events to dials
  const handleDialMath = (clientX: number, clientY: number) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    let angleRad = Math.atan2(dy, dx);
    let angleDeg = angleRad * (180 / Math.PI);
    
    // Normalize to [0...360 degrees] with 12 o'clock positioned straight up (at -90 deg)
    let fromTop = angleDeg + 90;
    if (fromTop < 0) fromTop += 360;

    if (activeMode === 'hours') {
      let selectedH = Math.round(fromTop / 30);
      if (selectedH === 0) selectedH = 12;
      setHour12(selectedH);
    } else {
      let selectedM = Math.round(fromTop / 6);
      if (selectedM === 60) selectedM = 0;
      setMinute(selectedM);
    }
  };

  // Modern pointer drag mechanics with pointer capture (smooth drag lock even beyond window boundaries)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    handleDialMath(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    e.preventDefault();
    handleDialMath(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      // Auto transition to minute selection upon completing hour choice
      if (activeMode === 'hours') {
        const timer = setTimeout(() => {
          setActiveMode('minutes');
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  };

  // Position variables
  const hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // Helper index calculator for mapping dial positions (Radius = 88px)
  const getCoords = (index: number) => {
    const angleRad = (index * 30 - 90) * (Math.PI / 180);
    const radius = 88; // visually perfect margins
    const x = Math.round(radius * Math.cos(angleRad));
    const y = Math.round(radius * Math.sin(angleRad));
    return { x, y };
  };

  // Rotation angles for current pointer needles
  const handAngle = activeMode === 'hours' 
    ? hour12 * 30 
    : minute * 6;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Absolute backdrop blur overlay */}
      <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={onClose} />

      {/* Beautiful light-colored newspaper style watch face box */}
      <div className="relative w-full max-w-[325px] bg-paper border-[6px] border-ink shadow-[8px_8px_0px_var(--color-ink)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans">
        
        {/* Newspaper headline style header block */}
        <div className="bg-ink text-paper px-4 py-3 flex justify-between items-center border-b-[5px] border-taxi">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-taxi animate-pulse" />
            <span className="font-mono text-[10px] font-black uppercase text-taxi tracking-widest">
              {title}
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-paper/60 hover:text-taxi transition-colors p-0.5 cursor-pointer"
            aria-label="Close clock dialer"
          >
            <X size={16} className="stroke-[3px]" />
          </button>
        </div>

        {/* Display Banner / Mode selection blocks */}
        <div className="px-5 py-4 bg-paper-dark border-b-[4px] border-ink flex items-center justify-between">
          
          <div className="flex items-center gap-2">
            {/* Hour Segment */}
            <button
              type="button"
              onClick={() => setActiveMode('hours')}
              className={cn(
                "w-[76px] h-[76px] rounded-lg border-[4px] border-ink font-mono font-bold text-4xl flex items-center justify-center transition-all shadow-[3px_3px_0px_var(--color-ink)] active:shadow-none active:translate-y-[2px] cursor-pointer",
                activeMode === 'hours' 
                  ? "bg-taxi text-ink" 
                  : "bg-paper text-ink hover:bg-paper-dark"
              )}
            >
              {String(hour12).padStart(2, '0')}
            </button>

            {/* Pulsing clock divisor */}
            <span className="font-mono font-black text-3xl text-ink px-1 animate-pulse">:</span>

            {/* Minute Segment */}
            <button
              type="button"
              onClick={() => setActiveMode('minutes')}
              className={cn(
                "w-[76px] h-[76px] rounded-lg border-[4px] border-ink font-mono font-bold text-4xl flex items-center justify-center transition-all shadow-[3px_3px_0px_var(--color-ink)] active:shadow-none active:translate-y-[2px] cursor-pointer",
                activeMode === 'minutes' 
                  ? "bg-taxi text-ink" 
                  : "bg-paper text-ink hover:bg-paper-dark"
              )}
            >
              {String(minute).padStart(2, '0')}
            </button>
          </div>

          {/* AM / PM Period Selection Block */}
          <div className="flex flex-col gap-1.5 shrink-0 justify-center">
            {['AM', 'PM'].map((period) => {
              const isPeriodSelected = ampm === period;
              return (
                <button
                  key={period}
                  type="button"
                  onClick={() => setAmpm(period as any)}
                  className={cn(
                    "px-3 py-1 font-mono text-[9px] font-black uppercase border-[3px] border-ink rounded-md transition-all shadow-[2px_2px_0px_rgba(0,0,0,0.15)] active:shadow-none active:translate-y-[1px] cursor-pointer",
                    isPeriodSelected 
                      ? "bg-ink text-paper border-ink" 
                      : "bg-paper text-ink/60 border-ink hover:text-ink hover:bg-paper-dark"
                  )}
                >
                  {period === 'AM' ? 'a.m.' : 'p.m.'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Circle dial layout face */}
        {pickerType === 'dial' ? (
          <div className="p-5 flex flex-col items-center justify-center relative bg-[#FAF9F6] border-b-[4px] border-ink overflow-hidden select-none">
            {/* Clock Circle Container */}
            <div 
              ref={dialRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-[230px] h-[230px] rounded-full border-[5px] border-ink bg-paper-dark/30 relative flex items-center justify-center cursor-pointer select-none touch-none shadow-inner"
            >
              {/* Dial Pin Centeraxle */}
              <div className="w-3.5 h-3.5 rounded-full bg-taxi border-[3px] border-ink z-10 absolute shadow-md" />

              {/* Dynamic pointer line */}
              <div 
                className="absolute origin-bottom z-10 pointer-events-none"
                style={{
                  transform: `rotate(${handAngle}deg)`,
                  height: '88px', // matches coordinate radius perfectly
                  bottom: '50%',
                  width: '3.5px',
                  backgroundColor: '#1A1A1B', // Rich dark ink line
                }}
              >
                {/* Active Selector Bulb */}
                <div 
                  className="absolute w-8 h-8 rounded-full bg-taxi border-[3px] border-ink -top-4 left-1/2 -translate-x-1/2 flex items-center justify-center shadow-[1px_2.5px_0px_rgba(0,0,0,0.2)]"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-ink" />
                </div>
              </div>

              {/* Render digits dynamically onto coordinate points */}
              {activeMode === 'hours' ? (
                hourNumbers.map((num, i) => {
                  const { x, y } = getCoords(i);
                  const isSelected = hour12 === num;
                  return (
                    <div
                      key={`hour-dial-${num}`}
                      className={cn(
                        "absolute w-[28px] h-[28px] rounded-full flex items-center justify-center font-mono text-xs font-black transition-all duration-100 pointer-events-none z-20",
                        isSelected 
                          ? "text-ink bg-taxi scale-110 font-black border-2 border-ink" 
                          : "text-ink/75"
                      )}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                    >
                      {num}
                    </div>
                  );
                })
              ) : (
                minuteNumbers.map((num, i) => {
                  const { x, y } = getCoords(i);
                  // Snap to closest 5 minutes marker for highlight
                  const isSelected = Math.floor(minute / 5) * 5 === num;
                  return (
                    <div
                      key={`minute-dial-${num}`}
                      className={cn(
                        "absolute w-[28px] h-[28px] rounded-full flex items-center justify-center font-mono text-[10px] font-black transition-all duration-100 pointer-events-none z-20",
                        isSelected 
                          ? "text-ink bg-taxi scale-110 font-black border-2 border-ink" 
                          : "text-ink/60"
                      )}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                    >
                      {String(num).padStart(2, '0')}
                    </div>
                  );
                })
              )}
            </div>

            {/* Help guidelines */}
            <span className="font-mono text-[7.5px] font-bold uppercase tracking-widest text-[#1A1A1B]/40 mt-3.5 flex items-center gap-1 select-none">
              <span>●</span> Hold & Drag Hand Clock Dial Smoothly <span>●</span>
            </span>
          </div>
        ) : (
          /* Keyboard Alternative Form Options */
          <div className="p-5 bg-paper border-b-[4px] border-ink space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 animate-in slide-in-from-bottom duration-300">
                <label className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/65">Hour (HH)</label>
                <select
                  value={hour12}
                  onChange={(e) => setHour12(parseInt(e.target.value, 10))}
                  className="w-full bg-paper-dark border-[3.5px] border-ink p-2 font-mono text-sm font-black text-ink uppercase focus:outline-none focus:border-taxi focus:bg-paper cursor-pointer rounded-md"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 animate-in slide-in-from-bottom duration-300 delay-75">
                <label className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/65">Minute (MM)</label>
                <select
                  value={minute}
                  onChange={(e) => setMinute(parseInt(e.target.value, 10))}
                  className="w-full bg-paper-dark border-[3.5px] border-ink p-2 font-mono text-sm font-black text-ink uppercase focus:outline-none focus:border-taxi focus:bg-paper cursor-pointer rounded-md"
                >
                  {Array.from({ length: 60 }, (_, i) => i).map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="text-center">
              <span className="font-mono text-[8.5px] font-black uppercase tracking-widest text-ink bg-taxi/20 px-2 py-1 border-2 border-ink rounded-md">
                Manual Ledger Inputs Active
              </span>
            </div>
          </div>
        )}

        {/* Command Toolbar Footer */}
        <div className="px-4 py-3 bg-paper-dark flex items-center justify-between shrink-0">
          
          {/* Dialer toggle buttons */}
          <button
            type="button"
            onClick={() => setPickerType(prev => prev === 'dial' ? 'keyboard' : 'dial')}
            className="p-2 border-[3px] border-ink bg-paper text-ink transition-all hover:bg-taxi active:translate-y-[1px] active:shadow-none shadow-[2px_2px_0px_var(--color-ink)] cursor-pointer rounded-md"
            title={pickerType === 'dial' ? 'Switch to list text input' : 'Switch to dial clock panel'}
          >
            {pickerType === 'dial' ? <Keyboard size={15} /> : <Clock size={15} />}
          </button>

          {/* Confirm or Dismiss inputs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase border-[3px] border-ink bg-transparent text-ink hover:bg-paper/80 transition-all cursor-pointer rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-1.5 font-mono text-[10px] font-black uppercase border-[3px] border-ink bg-taxi text-ink shadow-[2.5px_2.5px_0px_var(--color-ink)] hover:translate-y-[-1px] hover:shadow-[3.5px_3.5px_0px_var(--color-ink)] active:shadow-none active:translate-y-[1.5px] transition-all flex items-center gap-1 cursor-pointer rounded-md"
            >
              <Check size={11} className="stroke-[3px]" />
              OK
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
