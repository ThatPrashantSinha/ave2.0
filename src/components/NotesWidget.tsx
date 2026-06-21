import React, { useState, useEffect, useRef } from 'react';
import { NotePage } from '../types';
import { Plus, Trash2, Copy, Search, FileText, Check, ChevronRight, BookOpen, Clock, StickyNote, Eye, EyeOff, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

const NOTE_COLORS = [
  { name: 'Cream Layout', hex: '#FCFAF5', text: 'text-ink' },
  { name: 'Legal Yellow', hex: '#FEF9C3', text: 'text-ink' },
  { name: 'Mint Sage', hex: '#E2F0D9', text: 'text-emerald-950' },
  { name: 'Retro Sky', hex: '#E0F2FE', text: 'text-sky-950' },
  { name: 'Rose Petal', hex: '#FCE7F3', text: 'text-pink-950' },
  { name: 'Terminal Gray', hex: '#E5E7EB', text: 'text-gray-900' },
  { name: 'Warm Peach', hex: '#FFEDD5', text: 'text-orange-950' },
  { name: 'Vintage Lavender', hex: '#F3E8FF', text: 'text-purple-950' },
  { name: 'Pistachio Moss', hex: '#ECFDF5', text: 'text-emerald-900' },
  { name: 'Cadet Ice', hex: '#ECFEFF', text: 'text-cyan-950' },
  { name: 'Ochre Sand', hex: '#FEF3C7', text: 'text-amber-950' },
  { name: 'Desert Sun', hex: '#FFF7ED', text: 'text-orange-900' }
];

const SEED_NOTES: NotePage[] = [
  {
    id: 'soho-loft',
    title: 'THE SOHO LOFT PROJECT',
    content: 'DISCUSSED THE NEW GALLERY SPACE WITH MARTHA. THE NEIGHBORHOOD IS CHANGING INDEED. WE NEED MORE SHELVING IN THE SOUTHERN ALCOVE BY NOVEMBER.',
    color: '#FCFAF5',
    updatedAt: '1974-10-12T10:30:00.000Z'
  },
  {
    id: 'rainy-morning',
    title: 'RAINY MORNING NOTES',
    content: 'WATCHING THE YELLOW CABS SPLASH THROUGH PUDDLES FROM THE FIRE ESCAPE. STACK OF DRIZZLE REPORTS IS PILING UP AT THE DISPATCH CONSOLE.',
    color: '#FEF9C3',
    updatedAt: '1974-10-11T08:15:00.000Z'
  }
];

export function NotesWidget() {
  const [notes, setNotes] = useState<NotePage[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shredConfirmId, setShredConfirmId] = useState<string | null>(null);
  const [isConfirmingShred, setIsConfirmingShred] = useState(false);
  const [isBlurred, setIsBlurred] = useState<boolean>(() => {
    try {
      return localStorage.getItem('daily_docket_notes_blurred') === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('daily_docket_notes_blurred', String(isBlurred));
    } catch (_) {}
  }, [isBlurred]);
  const [pressProgress, setPressProgress] = useState(0);
  const [showBlurHint, setShowBlurHint] = useState(false);

  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressActiveRef = useRef(false);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStartPress = (e: React.MouseEvent | React.TouchEvent) => {
    longPressActiveRef.current = false;
    setPressProgress(0);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);

    const start = Date.now();
    const duration = 750; // hold for 750ms to toggle

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setPressProgress(pct);
    }, 25);

    pressTimerRef.current = setTimeout(() => {
      setIsBlurred(prev => !prev);
      longPressActiveRef.current = true;
      setPressProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      try {
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } catch (err) {}
    }, duration);
  };

  const handleEndPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setPressProgress(0);

    // If it wasn't held long enough to trigger, show the instructional toast
    if (!longPressActiveRef.current) {
      setShowBlurHint(true);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => {
        setShowBlurHint(false);
      }, 3500);
    }
  };

  const handleCancelPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setPressProgress(0);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  const saveTimeoutRef = useRef<number | null>(null);

  // Reset confirmation state when selected note changes
  useEffect(() => {
    setIsConfirmingShred(false);
    setShredConfirmId(null);
  }, [selectedId]);

  // Initialize and load from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem('daily_docket_notes_pages');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as NotePage[];
        if (parsed.length > 0) {
          setNotes(parsed);
          setSelectedId(parsed[0].id);
        } else {
          setNotes(SEED_NOTES);
          setSelectedId(SEED_NOTES[0].id);
          localStorage.setItem('daily_docket_notes_pages', JSON.stringify(SEED_NOTES));
        }
      } catch (e) {
        console.error('Failed to parse notes:', e);
        setNotes(SEED_NOTES);
        setSelectedId(SEED_NOTES[0].id);
      }
    } else {
      setNotes(SEED_NOTES);
      setSelectedId(SEED_NOTES[0].id);
      localStorage.setItem('daily_docket_notes_pages', JSON.stringify(SEED_NOTES));
    }
  }, []);

  // Sync back to local storage
  const syncToStorage = (updatedNotes: NotePage[]) => {
    localStorage.setItem('daily_docket_notes_pages', JSON.stringify(updatedNotes));
    setIsSaving(true);
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  const selectedNote = notes.find(n => n.id === selectedId) || notes[0];

  const handleCreatePage = () => {
    const newId = Math.random().toString(36).substring(7);
    const randomColor = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)].hex;
    const newPage: NotePage = {
      id: newId,
      title: 'UNTITLED STATEMENT',
      content: '',
      color: randomColor,
      updatedAt: new Date().toISOString()
    };
    const updated = [newPage, ...notes];
    setNotes(updated);
    setSelectedId(newId);
    syncToStorage(updated);
  };

  const handleUpdateNote = (field: 'title' | 'content' | 'color', value: string) => {
    if (!selectedNote) return;
    const updated = notes.map(n => {
      if (n.id === selectedNote.id) {
        return {
          ...n,
          [field]: value,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });
    setNotes(updated);
    syncToStorage(updated);
  };

  const handleDeletePage = (idToDelete: string) => {
    const remaining = notes.filter(n => n.id !== idToDelete);
    if (remaining.length === 0) {
      // Re-seed if completely empty to preserve gorgeous look
      const reset = [
        {
          id: Math.random().toString(36).substring(7),
          title: 'NEW LEDGER ENTRY',
          content: '',
          color: '#FCFAF5',
          updatedAt: new Date().toISOString()
        }
      ];
      setNotes(reset);
      setSelectedId(reset[0].id);
      syncToStorage(reset);
    } else {
      setNotes(remaining);
      if (selectedId === idToDelete) {
        setSelectedId(remaining[0].id);
      }
      syncToStorage(remaining);
    }
  };

  const handleCopyToClipboard = () => {
    if (!selectedNote) return;
    navigator.clipboard.writeText(`${selectedNote.title}\n\n${selectedNote.content}`);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const wordCount = selectedNote?.content 
    ? selectedNote.content.trim().split(/\s+/).filter(Boolean).length 
    : 0;
  const charCount = selectedNote?.content?.length || 0;

  // Format date display nicely in typewriter/retro style
  const formatNoteDate = (isoString?: string) => {
    try {
      if (!isoString) return '';
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      // Elegant classic 1974 ticker format
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="border-[6px] border-ink bg-paper rounded-sm shadow-[4px_4px_0px_#1A1A1B] flex flex-col overflow-hidden transition-all duration-300">
      {/* Widget Header Strip */}
      <div className="bg-ink text-[#F4F1EA] p-3 flex justify-between items-center select-none font-sans">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-taxi" />
          <h3 className="font-heading font-black text-xs uppercase tracking-wider leading-none">
            PERSONAL LEDGER & NOTEBOOK
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Long-press Privacy Blur Shield Button */}
          <button
            onMouseDown={handleStartPress}
            onMouseUp={handleEndPress}
            onMouseLeave={handleCancelPress}
            onTouchStart={handleStartPress}
            onTouchEnd={handleEndPress}
            onTouchCancel={handleCancelPress}
            title="Press and hold 1 sec to Toggle Confidential Obfuscating Shield"
            className={cn(
              "relative select-none text-[8.5px] font-black uppercase rounded border transition-all cursor-pointer flex items-center gap-1 font-mono py-1 px-2.5 overflow-hidden active:translate-y-[0.5px] h-6 hover:scale-103",
              isBlurred 
                ? "bg-[#22C55E]/15 border-[#22C55E] text-[#22C55E] font-black" 
                : "bg-white/10 hover:bg-white/20 border-white/20 text-white/80"
            )}
          >
            {isBlurred ? (
              <>
                <EyeOff size={10} className="text-[#22C55E] animate-pulse shrink-0" strokeWidth={3} />
                <span>COVERED</span>
              </>
            ) : (
              <>
                <Eye size={10} className="text-white/60 shrink-0" strokeWidth={3} />
                <span>SHIELD</span>
              </>
            )}
            
            {/* Simulated visual progress bar indicating long press hold */}
            {pressProgress > 0 && (
              <div 
                className="absolute bottom-0 left-0 h-[2.5px] bg-[#22C55E] transition-all duration-75"
                style={{ width: `${pressProgress}%` }}
              />
            )}
          </button>

          {isSaving ? (
            <span className="font-mono text-[7.5px] font-black text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
              ● SYNCING
            </span>
          ) : (
            <span className="font-mono text-[7.5px] font-black text-white/50 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">
              STANDBY
            </span>
          )}
        </div>
      </div>

      {/* Container wrapper for blur content and lock overlay */}
      <div className={cn(
        "relative flex flex-col transition-all duration-500 ease-in-out overflow-hidden origin-top",
        isBlurred ? "min-h-[85px] max-h-[85px] flex-grow-0" : "min-h-[350px] flex-grow"
      )}>
        {/* Main interactive content body with conditional blur styling */}
        <div className={cn(
          "transition-all duration-500 ease-in-out flex flex-col flex-grow",
          isBlurred ? "blur-[12px] select-none pointer-events-none scale-[1.01] opacity-75" : ""
        )}>

      {/* Mini-search & Add controls */}
      <div className={cn(
        "p-2.5 border-b-2 border-ink bg-[#F4F1EA] flex gap-2 items-center transition-all duration-300",
        isBlurred ? "hidden opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <div className="relative flex-1">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-light opacity-50" strokeWidth={3} />
          <input
            type="text"
            placeholder="SEARCH LEDGER PAGES..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-paper border border-ink/30 focus:border-ink rounded-sm pl-7 pr-2.5 py-1 text-[9px] font-mono font-black uppercase text-ink placeholder-ink/40 outline-none uppercase tracking-wider transition-colors shadow-inner"
          />
        </div>
        <button
          onClick={handleCreatePage}
          title="Create New Sheet"
          className="bg-taxi hover:bg-taxi/95 text-ink border-2 border-ink py-1 px-2.5 text-[8.5px] font-mono font-black uppercase rounded shadow-[1.5px_1.5px_0px_#1A1A1B] active:translate-y-[1px] active:shadow-none hover:-translate-y-[0.5px] transition-all cursor-pointer flex items-center gap-1 shrink-0 select-none"
        >
          <Plus size={10} strokeWidth={3} /> NEW PAGE
        </button>
      </div>

      {/* Tabs list (overlapping Folder Index style) */}
      <div className={cn(
        "bg-[#1A1A1B] px-2 pt-2 flex gap-1.5 overflow-x-auto scrollbar-none border-b-2 border-ink select-none relative transition-all duration-300",
        isBlurred ? "hidden opacity-0 pointer-events-none" : "h-9 opacity-100"
      )}>
        {filteredNotes.length === 0 ? (
          <div className="text-[8px] font-mono text-white/40 uppercase font-black tracking-widest pl-2 py-1">
            (No ledger records found matching query)
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isActive = note.id === selectedId;
            return (
              <div
                key={note.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(note.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedId(note.id);
                  }
                }}
                className={cn(
                  "px-3.5 pt-1.5 pb-1 text-[8.5px] font-mono font-black uppercase rounded-t-sm border-t-2 border-x-2 border-ink flex items-center gap-1.5 max-w-[120px] transition-all cursor-pointer truncate shrink-0 select-none relative focus:outline-none",
                  isActive
                    ? "text-ink z-20 font-black -translate-y-[1px] h-7"
                    : "text-white/65 hover:text-white bg-ink-light/20 border-ink/40 h-6 mt-1"
                )}
                style={isActive ? { backgroundColor: note.color || '#FCFAF5' } : undefined}
              >
                <StickyNote size={8} className={isActive ? "text-ink-light shrink-0" : "text-white/40 shrink-0"} />
                <span className="truncate">{note.title || 'UNTITLED REPORT'}</span>
                
                {isActive && notes.length > 1 && (
                  shredConfirmId === note.id ? (
                    <span className="flex items-center gap-1.5 shrink-0 ml-1.5 font-bold">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(note.id);
                          setShredConfirmId(null);
                        }}
                        className="text-subway-red hover:text-red-700 bg-red-100 dark:bg-red-950/45 px-1 py-0.5 rounded-xs cursor-pointer font-black text-[8px]"
                        title="Yes, delete"
                      >
                        ✓
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShredConfirmId(null);
                        }}
                        className="text-ink-light hover:text-ink bg-black/5 px-1 py-0.5 rounded-xs cursor-pointer font-black text-[8px]"
                        title="Cancel"
                      >
                        ×
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShredConfirmId(note.id);
                      }}
                      className="ml-1 text-ink-light hover:text-subway-red opacity-50 hover:opacity-100 transition-colors cursor-pointer p-0.5 font-black text-[9px] leading-none"
                      title="Shred this entry"
                    >
                      ×
                    </button>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Page Body Details */}
      {selectedNote ? (
        <div 
          className="flex-1 p-4 md:p-5 flex flex-col relative transition-colors duration-300 min-h-[220px]"
          style={{ backgroundColor: selectedNote.color || '#FCFAF5' }}
        >
          {/* Vertical binder red line left accent mimicking real legal/ledger card */}
          <div className="absolute left-10 md:left-12 top-0 bottom-0 w-[1px] bg-red-400 opacity-25 pointer-events-none" />

          {/* Note Metadata Strip */}
          <div className="flex justify-between items-center mb-3 pr-1 pl-1 font-mono text-[8.5px] font-black text-ink-light/80 select-none border-b border-ink/10 pb-2">
            <span className="uppercase flex items-center gap-1">
              <Clock size={10} className="opacity-70" />
              RECORD DATE: {formatNoteDate(selectedNote.updatedAt)}
            </span>
            <span className="uppercase tracking-widest text-[7.5px] bg-ink/10 px-1.5 py-0.5 rounded font-black">
              PAGE_ID: {selectedNote.id.toUpperCase()}
            </span>
          </div>

          {/* Note Content and Title wrap */}
          <div className="flex-grow flex flex-col justify-stretch transition-all duration-300">
            {/* Interactive Title Input */}
            <div className="mb-4 group">
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => handleUpdateNote('title', e.target.value.toUpperCase())}
                placeholder="TITLE OF STATEMENT..."
                className="w-full bg-transparent border-b-2 border-transparent hover:border-ink/20 focus:border-ink/80 text-sm font-sans font-black uppercase text-ink outline-none placeholder-ink/30 pb-0.5 transition-all"
              />
            </div>

            {/* Note Content ruled/lined sheet */}
            <div className="relative flex-1 flex flex-col min-h-[140px]">
              {/* Custom notebook line grid overlay */}
              <textarea
                value={selectedNote.content}
                onChange={(e) => handleUpdateNote('content', e.target.value)}
                placeholder="Start drafting dispatch telemetry, meeting reports, or personal logs here..."
                style={{
                  backgroundAttachment: 'local',
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(26,26,27,0.06) 23px, rgba(26,26,27,0.06) 24px)',
                  lineHeight: '24px',
                }}
                className="w-full flex-grow bg-transparent border-none outline-none resize-none font-mono text-[10.5px] font-bold text-ink placeholder-ink/30 py-1 pl-1 pr-1 focus:ring-0 selection:bg-taxi/30 overflow-y-auto leading-[24px]"
              />
            </div>
          </div>

          {/* Toast alert banner alerting user about long-press gesture */}
          {showBlurHint && (
            <div className="absolute bottom-16 right-5 left-5 z-40 bg-ink text-[#F4F1EA] text-[8px] font-mono font-black py-2.5 px-3.5 rounded border border-white/10 shadow-[2px_2px_0px_rgba(0,0,0,0.15)] uppercase select-none animate-bounce flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield size={11} className="text-taxi animate-pulse shrink-0" />
                PRESS & HOLD SHIELD BUTTON IN HEADER TO REVEAL OR HIDE RECORDS!
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowBlurHint(false); }} 
                className="text-white/50 hover:text-white font-bold ml-1.5 p-0.5"
              >
                ×
              </button>
            </div>
          )}

          {/* Bottom Toolbar & Theme Selection */}
          <div className="mt-5 pt-3 border-t border-ink/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-mono">
            {/* Color Swatch Picker */}
            <div className="flex flex-col gap-1 select-none">
              <span className="text-[7.5px] font-black uppercase text-ink-light">BOARD ACCENT STATIONERY:</span>
              <div className="flex items-center gap-1.5 flex-wrap max-w-[280px] sm:max-w-xs mt-1">
                {NOTE_COLORS.map(colorObj => (
                  <button
                    key={colorObj.hex}
                    onClick={() => handleUpdateNote('color', colorObj.hex)}
                    title={colorObj.name}
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border border-ink/40 transition-all cursor-pointer hover:scale-115 active:scale-95 flex items-center justify-center shadow-2xs",
                      selectedNote.color === colorObj.hex ? "scale-115 ring-2 ring-ink/65 border-white" : "opacity-85"
                    )}
                    style={{ backgroundColor: colorObj.hex }}
                  >
                    {selectedNote.color === colorObj.hex && (
                      <div className="w-1 h-1 rounded-full bg-ink" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Counters and Quick Copy Operation triggers */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end select-none">
              <span className="text-[7.5px] font-black uppercase text-ink-light tracking-wide">
                WORDS: <strong className="text-ink font-mono">{wordCount}</strong> | CHARS: <strong className="text-ink font-mono">{charCount}</strong>
              </span>

              <button
                onClick={handleCopyToClipboard}
                title="Copy entire sheet"
                className="bg-paper hover:bg-paper-dark text-ink border border-ink/40 hover:border-ink py-1 px-2.5 text-[8.5px] font-black uppercase rounded shadow-2xs active:translate-y-[0.5px] transition-all cursor-pointer flex items-center gap-1 font-mono hover:scale-103"
              >
                {isCopied ? (
                  <>
                    <Check size={10} className="text-emerald-600 animate-bounce" strokeWidth={3} />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy size={9} strokeWidth={3} />
                    <span>COPY</span>
                  </>
                )}
              </button>

              {isConfirmingShred ? (
                <div className="flex items-center gap-1.5 animate-pulse bg-red-50 dark:bg-red-950/20 border border-subway-red/40 rounded px-2 py-0.5">
                  <span className="text-[7.5px] font-black text-subway-red select-none mr-1">
                    SURE?
                  </span>
                  <button
                    onClick={() => {
                      handleDeletePage(selectedNote.id);
                      setIsConfirmingShred(false);
                    }}
                    className="bg-subway-red hover:bg-red-700 text-white border-none py-0.5 px-2 text-[8px] font-black uppercase rounded cursor-pointer transition-all active:translate-y-[0.5px]"
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setIsConfirmingShred(false)}
                    className="bg-paper hover:bg-[#EAE6D9] text-ink border border-ink/30 py-0.5 px-2 text-[8px] font-black uppercase rounded cursor-pointer transition-all active:translate-y-[0.5px]"
                  >
                    NO
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingShred(true)}
                  title="Secure Shred/Delete"
                  className="bg-subway-red/10 text-subway-red hover:bg-subway-red hover:text-white border border-subway-red/35 py-1 px-2.5 text-[8.5px] font-black uppercase rounded active:translate-y-[0.5px] hover:shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={9} strokeWidth={3} />
                  <span>SHRED</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#F4F1EA] flex-1">
          <BookOpen className="mx-auto text-ink/30 mb-2 animate-bounce" size={24} />
          <p className="font-serif italic text-xs text-ink/50">Select a folder index card or tap 'NEW PAGE' to build lists.</p>
        </div>
      )}
        </div>

        {/* Clear, elegant overlay on top representing the confidential shield */}
        {isBlurred && (
          <div className="absolute inset-0 z-40 bg-white/5 backdrop-blur-[1px] flex flex-col items-center justify-center animate-fade-in select-none cursor-not-allowed overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-80 pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
}
