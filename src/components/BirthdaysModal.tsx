import React, { useState } from 'react';
import { format } from 'date-fns';
import { Birthday } from '../types';
import { X, Plus, Trash2, Gift, ChevronDown } from 'lucide-react';
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
      
      <div className="relative w-full max-w-md bg-paper border-[6px] border-ink shadow-[8px_8px_0px_#1A1A1B] flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-ink text-paper p-4 flex justify-between items-center border-b-[6px] border-taxi shrink-0">
          <div>
            <h3 className="font-sans font-black text-xl uppercase tracking-tight flex items-center gap-2">
              <Gift size={20} className="text-taxi" strokeWidth={2.5} /> Birthday Registry
            </h3>
            <p className="font-mono text-[9px] uppercase tracking-widest font-bold opacity-80 text-taxi mt-0.5">
              Save birth dates of people for highlight.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-paper hover:text-taxi transition-colors cursor-pointer"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Add New Birthday Form */}
          <div className="bg-paper-dark border-[4px] border-ink p-4 shadow-[4px_4px_0px_#1A1A1B]">
            <h4 className="font-sans font-bold text-sm uppercase tracking-tight text-ink mb-3 border-b-2 border-ink pb-1 flex items-center gap-1.5">
              <Plus size={14} strokeWidth={3} /> Add Person
            </h4>
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
              className="space-y-4"
            >
              <div>
                <label className="block font-mono text-[9px] uppercase font-bold tracking-wider text-ink/75 mb-1">Name</label>
                <input 
                  name="bday_name" 
                  type="text" 
                  required 
                  placeholder="e.g. Alice Cooper" 
                  className="w-full bg-paper border-[3px] border-ink px-2.5 py-1.5 text-xs font-sans font-bold focus:outline-none focus:bg-paper-dark leading-tight" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[9px] uppercase font-bold tracking-wider text-ink/75 mb-1.5 flex justify-between items-center">
                    <span>Select Month</span>
                    <span className="text-[9px] font-black uppercase text-taxi bg-ink px-1.5 py-0.5 rounded-sm">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(selectedMonth, 10) - 1]}
                    </span>
                  </label>
                  <div className="grid grid-cols-4 gap-1 bg-paper border-[3px] border-ink p-1.5 shadow-[2px_2px_0px_#1A1A1B]">
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
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleMonthChange(m.id)}
                        className={`py-1 text-[9px] font-mono font-black uppercase text-center border-2 transition-all cursor-pointer ${
                          selectedMonth === m.id
                            ? 'bg-taxi text-ink border-ink shadow-[2px_2px_0px_#1A1A1B]'
                            : 'bg-transparent border-transparent hover:border-ink/30 text-ink/80'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[9px] uppercase font-bold tracking-wider text-ink/75 mb-1.5 flex justify-between items-center">
                    <span>Select Day</span>
                    <span className="text-[9px] font-black uppercase text-taxi bg-ink px-1.5 py-0.5 rounded-sm">
                      Day {parseInt(selectedDay, 10)}
                    </span>
                  </label>
                  <div className="grid grid-cols-7 gap-1 bg-paper border-[3px] border-ink p-1.5 shadow-[2px_2px_0px_#1A1A1B]">
                    {Array.from({ length: maxDaysForMonth }, (_, i) => {
                      const val = String(i + 1).padStart(2, '0');
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSelectedDay(val)}
                          className={`aspect-square flex items-center justify-center text-[9px] font-mono font-black border-2 transition-all cursor-pointer ${
                            selectedDay === val
                              ? 'bg-taxi text-ink border-ink shadow-[2px_2px_0px_#1A1A1B] scale-105'
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
                className="w-full py-1.5 bg-ink text-paper font-mono text-[10px] uppercase font-black hover:bg-taxi hover:text-ink border-[3px] border-ink transition-colors cursor-pointer"
              >
                REGISTER BIRTHDAY
              </button>
            </form>
          </div>

          {/* List of Registered Birthdays */}
          <div>
            <h4 className="font-sans font-black text-sm uppercase tracking-tight text-ink mb-3 border-b-2 border-ink pb-1">
              Registered Entries ({birthdays.length})
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

                try {
                  const parts = bday.date.split('-');
                  const y = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10) - 1; // 0-indexed
                  const d = parseInt(parts[2], 10);

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
                  dateFormatted
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
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {processedBirthdays.map((bday) => {
                    const isNextComing = bday.daysDiff === minDaysDiff && bday.daysDiff !== Infinity;
                    return (
                      <div 
                        key={bday.id} 
                        className={cn(
                          "flex justify-between items-center border-[3px] border-ink p-2.5 transition-all",
                          isNextComing 
                            ? "bg-[#FEF08A] text-ink shadow-[2.5px_2.5px_0px_#1A1A1B] -translate-y-[1px]" 
                            : "bg-paper hover:bg-paper-dark"
                        )}
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-sans font-black text-xs text-ink uppercase tracking-tight truncate">
                              {bday.name}
                            </p>
                            {isNextComing && (
                              <span className="font-mono text-[7px] font-black uppercase text-paper bg-subway-red border border-ink py-0.5 px-1 rounded-sm shadow-[1px_1px_0px_#1A1A1B] shrink-0 leading-none">
                                {bday.daysDiff === 0 ? "TODAY! 🥳" : "NEXT! 🎂"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="font-mono text-[9px] text-ink/70 uppercase font-bold flex items-center gap-0.5 leading-none">
                              <span>📅</span> <span>{bday.dateFormatted}</span>
                            </p>
                            {bday.daysDiff !== Infinity && (
                              <span className="font-mono text-[8px] text-ink/50 uppercase font-black tracking-normal leading-none bg-ink/5 border border-ink/10 px-1 py-0.5 rounded-sm shrink-0">
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
