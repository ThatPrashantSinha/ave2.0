import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Birthday } from '../types';
import { X, Plus, Minus, Trash2, Gift, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

const DAYS_IN_MONTH: Record<string, number> = {
  '01': 31, // January
  '02': 29, // February (Leap year safe)
  '03': 31, // March
  '04': 30, // April
  '05': 31, // May
  '06': 30, // June
  '07': 31, // July
  '08': 31, // August
  '09': 30, // September
  '10': 31, // October
  '11': 30, // November
  '12': 31, // December
};

// Define elegant, vintage transit/dispatch-deck color definitions for each of the 12 months
export const MONTH_COLORS: Record<string, { bg: string; border: string; labelBg: string; text: string; hoverBorder: string; hoverBg: string; color: string }> = {
  '01': { bg: 'bg-[#F1F5F9]', border: 'border-[#4F6D7A]/50', labelBg: 'bg-[#4F6D7A]', text: 'text-[#2C3E50]', hoverBorder: 'hover:border-[#4F6D7A]', hoverBg: 'hover:bg-[#E2E8F0]', color: '#4F6D7A' }, // Steel Blue Line
  '02': { bg: 'bg-[#FAF1F6]', border: 'border-[#94618E]/50', labelBg: 'bg-[#94618E]', text: 'text-[#5C2E50]', hoverBorder: 'hover:border-[#94618E]', hoverBg: 'hover:bg-[#F3E1EC]', color: '#94618E' }, // Dusk Plum Line
  '03': { bg: 'bg-[#F5F8F2]', border: 'border-[#6F8A50]/50', labelBg: 'bg-[#6F8A50]', text: 'text-[#32451F]', hoverBorder: 'hover:border-[#6F8A50]', hoverBg: 'hover:bg-[#E9F0E1]', color: '#6F8A50' }, // Sage Line
  '04': { bg: 'bg-[#EDF8F2]', border: 'border-[#3C8260]/50', labelBg: 'bg-[#3C8260]', text: 'text-[#1A4530]', hoverBorder: 'hover:border-[#3C8260]', hoverBg: 'hover:bg-[#DBF0E3]', color: '#3C8260' }, // Jade Emerald Line
  '05': { bg: 'bg-[#FAF6EB]', border: 'border-[#D9A13C]/50', labelBg: 'bg-[#D9A13C]', text: 'text-[#593E10]', hoverBorder: 'hover:border-[#D9A13C]', hoverBg: 'hover:bg-[#FAF0D1]', color: '#D9A13C' }, // Amber Sands Line
  '06': { bg: 'bg-[#FAF2EB]', border: 'border-[#CD7A57]/50', labelBg: 'bg-[#CD7A57]', text: 'text-[#5E2B0F]', hoverBorder: 'hover:border-[#CD7A57]', hoverBg: 'hover:bg-[#F6DFD1]', color: '#CD7A57' }, // Terracotta Line
  '07': { bg: 'bg-[#FAF0F0]', border: 'border-[#B23B3B]/50', labelBg: 'bg-[#B23B3B]', text: 'text-[#591515]', hoverBorder: 'hover:border-[#B23B3B]', hoverBg: 'hover:bg-[#F6D0D0]', color: '#B23B3B' }, // Poppy Line
  '08': { bg: 'bg-[#EFF8F6]', border: 'border-[#2D6A61]/50', labelBg: 'bg-[#2D6A61]', text: 'text-[#123E37]', hoverBorder: 'hover:border-[#2D6A61]', hoverBg: 'hover:bg-[#D5EDE9]', color: '#2D6A61' }, // Deep Teal Line
  '09': { bg: 'bg-[#F1F4FA]', border: 'border-[#3B5B8C]/50', labelBg: 'bg-[#3B5B8C]', text: 'text-[#1B3050]', hoverBorder: 'hover:border-[#3B5B8C]', hoverBg: 'hover:bg-[#DCE4F3]', color: '#3B5B8C' }, // Cobalt Blue Line
  '10': { bg: 'bg-[#FAF3EF]', border: 'border-[#BD5B24]/50', labelBg: 'bg-[#BD5B24]', text: 'text-[#54250B]', hoverBorder: 'hover:border-[#BD5B24]', hoverBg: 'hover:bg-[#F9DEC9]', color: '#BD5B24' }, // Rust Line
  '11': { bg: 'bg-[#F2F6FA]', border: 'border-[#3D6DA3]/50', labelBg: 'bg-[#3D6DA3]', text: 'text-[#123050]', hoverBorder: 'hover:border-[#3D6DA3]', hoverBg: 'hover:bg-[#DEE9F5]', color: '#3D6DA3' }, // Spruce Blue Line
  '12': { bg: 'bg-[#FAF1F3]', border: 'border-[#942F4B]/50', labelBg: 'bg-[#942F4B]', text: 'text-[#501323]', hoverBorder: 'hover:border-[#942F4B]', hoverBg: 'hover:bg-[#F6D1DB]', color: '#942F4B' }, // Carmine Red Line
};

interface BirthdaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdays: Birthday[];
  addBirthday: (name: string, date: string) => void;
  deleteBirthday: (id: string) => void;
}

export function BirthdaysModal({
  isOpen,
  onClose,
  birthdays,
  addBirthday,
  deleteBirthday
}: BirthdaysModalProps) {
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedDay, setSelectedDay] = useState('01');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Persistent minimized state for "Add Person" card
  const [isFormMinimized, setIsFormMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('daily_docket_birthday_form_minimized') === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('daily_docket_birthday_form_minimized', String(isFormMinimized));
    } catch (_) {}
  }, [isFormMinimized]);

  if (!isOpen) return null;

  const handleMonthChange = (monthVal: string) => {
    setSelectedMonth(monthVal);
    const maxDays = DAYS_IN_MONTH[monthVal] || 31;
    if (parseInt(selectedDay, 10) > maxDays) {
      setSelectedDay(String(maxDays).padStart(2, '0'));
    }
  };

  const maxDaysForMonth = DAYS_IN_MONTH[selectedMonth] || 31;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center font-sans p-4">
      <div 
        className="absolute inset-0 bg-ink/65 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-sm sm:max-w-lg bg-paper border-[4px] border-ink shadow-[5px_5px_0px_#1A1A1B] flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-ink text-paper p-3 flex justify-between items-center border-b-[4px] border-taxi shrink-0">
          <div>
            <h3 className="font-sans font-black text-lg uppercase tracking-tight flex items-center gap-2 leading-none">
              <Gift size={16} className="text-taxi" strokeWidth={2.5} /> Birthday Registry
            </h3>
            <p className="font-mono text-[8.5px] uppercase tracking-widest font-bold opacity-80 text-taxi mt-1">
              Save birth dates of people for highlight.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-paper hover:text-taxi transition-colors cursor-pointer"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
         <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Add New Birthday Form */}
          <div className="bg-paper-dark border-2 border-ink p-3 shadow-[2px_2px_0px_#1A1A1B] transition-all duration-300">
            <div className={cn("flex justify-between items-center border-b-2 border-ink pb-2", !isFormMinimized && "mb-3")}>
              <h4 className="font-sans font-bold text-xs uppercase tracking-tight text-ink flex items-center gap-1.5 leading-none">
                <Plus size={12} strokeWidth={3} /> Add Person
              </h4>
              <button
                type="button"
                onClick={() => setIsFormMinimized(!isFormMinimized)}
                className="font-mono text-[8px] font-black uppercase text-ink/70 hover:text-ink hover:bg-ink/5 border border-ink py-0.5 px-1.5 flex items-center gap-1 cursor-pointer transition-all bg-paper shadow-[1px_1px_0px_#1A1A1B] active:translate-y-[0.5px] active:shadow-none"
              >
                {isFormMinimized ? (
                  <>
                    <ChevronDown size={10} strokeWidth={3} />
                    <span>EXPAND</span>
                  </>
                ) : (
                  <>
                    <ChevronUp size={10} strokeWidth={3} />
                    <span>MINIMIZE</span>
                  </>
                )}
              </button>
            </div>

            {/* Conditionally rendered form elements based on minimized state */}
            {!isFormMinimized ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const nameInput = form.elements.namedItem('bday_name') as HTMLInputElement;
                  if (nameInput.value.trim() && selectedMonth && selectedDay) {
                    const constructedDate = `2000-${selectedMonth}-${selectedDay}`;
                    addBirthday(nameInput.value.trim(), constructedDate);
                    form.reset();
                    setSelectedMonth('01');
                    setSelectedDay('01');
                  }
                }} 
                className="space-y-3 animate-in fade-in duration-200"
              >
                <div>
                  <label className="block font-mono text-[8px] uppercase font-bold tracking-wider text-ink/75 mb-0.5">Name</label>
                  <input 
                    name="bday_name" 
                    type="text" 
                    required 
                    placeholder="e.g. Alice Cooper" 
                    className="w-full bg-paper border-2 border-ink px-2 py-1 text-xs font-sans font-bold focus:outline-none focus:bg-paper-dark leading-tight" 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[8px] uppercase font-bold tracking-wider text-ink/75 mb-1 flex justify-between items-center">
                      <span>Select Month</span>
                      <span className={cn("text-[8px] font-black uppercase text-white px-1 py-0.2 rounded-3xs shadow-[1px_1px_0px_#1A1A1B]", MONTH_COLORS[selectedMonth].labelBg)}>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(selectedMonth, 10) - 1]}
                      </span>
                    </label>
                    <div className="grid grid-cols-6 gap-0.5 bg-paper border-2 border-ink p-1 shadow-[1px_1px_0px_#1A1A1B]">
                      {[
                        { id: '01', label: 'JAN' },
                        { id: '02', label: 'FEB' },
                        { id: '03', label: 'MAR' },
                        { id: '04', label: 'APR' },
                        { id: '05', label: 'MAY' },
                        { id: '06', label: 'JUN' },
                        { id: '07', label: 'JUL' },
                        { id: '08', label: 'AUG' },
                        { id: '09', label: 'SEP' },
                        { id: '10', label: 'OCT' },
                        { id: '11', label: 'NOV' },
                        { id: '12', label: 'DEC' }
                      ].map((m) => {
                        const isSel = selectedMonth === m.id;
                        const col = MONTH_COLORS[m.id];
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleMonthChange(m.id)}
                            className={cn(
                              "py-0.5 text-[8px] font-mono font-black uppercase text-center border transition-all cursor-pointer",
                              isSel
                                ? `${col.labelBg} text-white border-ink shadow-[1px_1px_0px_#1A1A1B] scale-102`
                                : `bg-transparent border-transparent ${col.hoverBorder} ${col.hoverBg} ${col.text} font-bold opacity-75 hover:opacity-100`
                            )}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[8px] uppercase font-bold tracking-wider text-ink/75 mb-1 flex justify-between items-center">
                      <span>Select Day</span>
                      <span className="text-[8px] font-black uppercase text-taxi bg-ink px-1 py-0.2 rounded-3xs">
                        Day {parseInt(selectedDay, 10)}
                      </span>
                    </label>
                    <div className="grid grid-cols-7 gap-0.5 bg-paper border-2 border-ink p-1 shadow-[1px_1px_0px_#1A1A1B]">
                      {Array.from({ length: maxDaysForMonth }, (_, i) => {
                        const val = String(i + 1).padStart(2, '0');
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setSelectedDay(val)}
                            className={`aspect-square flex items-center justify-center text-[8px] font-mono font-black border transition-all cursor-pointer ${
                              selectedDay === val
                                ? 'bg-taxi text-ink border-ink shadow-[1px_1px_0px_#1A1A1B] scale-102'
                                : 'bg-transparent border-transparent hover:border-ink/30 text-ink hover:text-ink'
                            }`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-1 bg-ink text-paper font-mono text-[9px] uppercase font-black hover:bg-taxi hover:text-ink border-2 border-ink transition-colors cursor-pointer"
                >
                  REGISTER BIRTHDAY
                </button>
              </form>
            ) : null}
          </div>

          {/* List of Registered Birthdays */}
          <div>
            <h4 className="font-sans font-black text-sm uppercase tracking-tight text-ink mb-3 border-b-2 border-ink pb-1 flex justify-between items-center">
              <span>Registered Entries ({birthdays.length})</span>
              {isFormMinimized && (
                <span className="font-mono text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 border border-emerald-500/20 uppercase tracking-widest rounded animate-pulse">
                  VIEWPORT EXPANDED
                </span>
              )}
            </h4>
            {birthdays.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-ink/30 text-ink/60 font-sans text-xs">
                No birthdays saved. Keep track of family & crew here.
              </div>
            ) : (() => {
              // Calculate next occurrence and daysDiff for each birthday
              const processedBirthdays = [...birthdays].map((bday) => {
                let nextOccurTime = Infinity;
                let daysDiff = Infinity;
                let isToday = false;
                let dateFormatted = bday.date;
                let monthPart = '01';

                try {
                  const parts = bday.date.split('-');
                  const y = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10) - 1; // 0-indexed
                  const d = parseInt(parts[2], 10);
                  monthPart = parts[1];

                  const today = new Date();
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  
                  const curYear = today.getFullYear();
                  let occ = new Date(curYear, m, d);
                  
                  if (occ.getTime() < todayStart.getTime()) {
                    occ = new Date(curYear + 1, m, d);
                  }
                  
                  nextOccurTime = occ.getTime();
                  
                  const diffMs = nextOccurTime - todayStart.getTime();
                  daysDiff = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
                  
                  isToday = (today.getMonth() === m && today.getDate() === d);
                  if (isToday) {
                    daysDiff = 0;
                  }

                  const parsedDate = new Date(y, m, d);
                  dateFormatted = format(parsedDate, 'MMMM d');
                } catch (_) {}

                return {
                  ...bday,
                  nextOccurTime,
                  daysDiff,
                  isToday,
                  dateFormatted,
                  monthPart
                };
              });

              // Sort upcoming birthdays first
              processedBirthdays.sort((a, b) => {
                if (a.isToday && !b.isToday) return -1;
                if (!a.isToday && b.isToday) return 1;
                return a.nextOccurTime - b.nextOccurTime;
              });

              // Lowest daysDiff is the next coming birthday
              const minDaysDiff = processedBirthdays.length > 0 ? processedBirthdays[0].daysDiff : Infinity;

              return (
                <div 
                  className={cn(
                    "space-y-2 overflow-y-auto pr-1 transition-all duration-300",
                    isFormMinimized ? "max-h-[480px]" : "max-h-[180px]"
                  )}
                >
                  {processedBirthdays.map((bday) => {
                    const isNextComing = bday.daysDiff === minDaysDiff && bday.daysDiff !== Infinity;
                    const col = MONTH_COLORS[bday.monthPart] || MONTH_COLORS['01'];
                    
                    return (
                      <div 
                        key={bday.id} 
                        className={cn(
                          "relative flex justify-between items-center border-2 border-ink p-2 pl-3 transition-all duration-200 hover:-translate-y-[1px] select-none rounded animate-in fade-in duration-150 shadow-[2px_2px_0px_#1A1A1B]",
                          col.bg,
                          isNextComing ? "ring-1 ring-ink ring-offset-0.5" : ""
                        )}
                        style={{ borderLeftWidth: '5px', borderLeftColor: col.color }}
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-sans font-black text-[13px] text-ink uppercase tracking-tight truncate leading-none">
                              {bday.name}
                            </p>
                            {isNextComing && (
                              <span className="font-mono text-[7px] font-black uppercase text-paper bg-subway-red border border-ink py-0.5 px-1.5 rounded shadow-[1px_1px_0px_#1A1A1B] shrink-0 leading-none">
                                {bday.daysDiff === 0 ? "TODAY! 🥳" : "NEXT! 🎂"}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2.5 mt-1.5">
                            <p className={cn("font-mono text-[9px] uppercase font-black flex items-center gap-1 leading-none tracking-wider", col.text)}>
                              <span className="text-[10px]">★</span> <span>{bday.dateFormatted}</span>
                            </p>
                            {bday.daysDiff !== Infinity && (
                              <span className="font-mono text-[8px] text-ink/70 uppercase font-black tracking-normal leading-none bg-white/60 border border-ink/15 px-1.5 py-0.5 rounded shrink-0">
                                {bday.daysDiff === 0 
                                  ? "today" 
                                  : bday.daysDiff === 1 
                                    ? "tomorrow" 
                                    : `in ${bday.daysDiff} days`
                                }
                              </span>
                            )}
                          </div>
                        </div>
                        {confirmingId === bday.id ? (
                          <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in zoom-in-95 duration-150">
                            <span className="font-mono text-[9px] font-black uppercase text-subway-red mr-1 select-none">SURE?</span>
                            <button 
                              type="button"
                              onClick={() => {
                                deleteBirthday(bday.id);
                                setConfirmingId(null);
                              }}
                              className="px-2 py-1 bg-subway-red text-white border-2 border-ink font-mono text-[9px] font-black uppercase hover:bg-black hover:text-white transition-all cursor-pointer shadow-[1px_1px_0px_#1A1A1B] active:shadow-none active:translate-y-[0.5px]"
                            >
                              YES
                            </button>
                            <button 
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              className="px-2 py-1 bg-paper border-2 border-ink font-mono text-[9px] font-black uppercase hover:bg-ink hover:text-paper transition-all cursor-pointer shadow-[1px_1px_0px_#1A1A1B] active:shadow-none active:translate-y-[0.5px]"
                            >
                              NO
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => setConfirmingId(bday.id)} 
                            className="p-1.5 text-ink hover:text-subway-red border-2 border-transparent hover:border-ink hover:bg-white/40 transition-all rounded animate-none cursor-pointer shrink-0"
                            title="Delete entry"
                          >
                            <Trash2 size={13} strokeWidth={2.5} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
