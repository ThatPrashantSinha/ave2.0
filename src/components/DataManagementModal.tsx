import React, { useState, useEffect, useRef } from 'react';
import { Task, Habit, Birthday, NotePage, TimeTableEntry } from '../types';
import { 
  X, Database, AlertTriangle, RefreshCw, 
  Download, Upload, Check, Server, Sparkles, FileText, ShieldAlert, 
  ClipboardCopy, Info, Calendar, BookOpen, Clock, Heart, CheckCircle2, FileDown, FileUp
} from 'lucide-react';
import { 
  clearAllStoreData, 
  seedDBIfEmpty 
} from '../lib/db';
import { 
  generateBackupString, 
  generateBackupJson,
  restoreBackupString,
  inspectBackupString,
  BackupCounts,
  BackupInspectionResult
} from '../lib/backup';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  habits: Habit[];
  onRefresh: () => void;
}

export function DataManagementModal({ isOpen, onClose, tasks, habits, onRefresh }: DataManagementModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // For Global Master Erase
  const [masterEraseInput, setMasterEraseInput] = useState('');

  // Backup & Recovery States
  const [backupToken, setBackupToken] = useState('');
  const [backupStats, setBackupStats] = useState<{ 
    count: number; 
    rawSize: number; 
    counts: BackupCounts;
    timestamp: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [restoreInputToken, setRestoreInputToken] = useState('');
  const [inspectionResult, setInspectionResult] = useState<BackupInspectionResult | null>(null);

  // Local state replicas of storage components to show count metrics
  const [localBirthdays, setLocalBirthdays] = useState<Birthday[]>([]);
  const [localTimetable, setLocalTimetable] = useState<TimeTableEntry[]>([]);
  const [localNotes, setLocalNotes] = useState<NotePage[]>([]);
  const [localPins, setLocalPins] = useState<any[]>([]);
  const [localSessions, setLocalSessions] = useState<any[]>([]);
  const [localLogs, setLocalLogs] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload count indicators
  const reloadLocalStates = () => {
    try {
      const b = localStorage.getItem('daily_docket_birthdays');
      setLocalBirthdays(b ? JSON.parse(b) : []);
    } catch (_) { setLocalBirthdays([]); }

    try {
      const tt = localStorage.getItem('daily_docket_timetable');
      setLocalTimetable(tt ? JSON.parse(tt) : []);
    } catch (_) { setLocalTimetable([]); }

    try {
      const n = localStorage.getItem('daily_docket_notes_pages');
      setLocalNotes(n ? JSON.parse(n) : []);
    } catch (_) { setLocalNotes([]); }

    try {
      const p = localStorage.getItem('daily_docket_time_pins2');
      setLocalPins(p ? JSON.parse(p) : []);
    } catch (_) { setLocalPins([]); }

    try {
      const s = localStorage.getItem('daily_docket_custom_sessions');
      setLocalSessions(s ? JSON.parse(s) : []);
    } catch (_) { setLocalSessions([]); }

    try {
      const l = localStorage.getItem('daily_docket_focus_logs');
      setLocalLogs(l ? JSON.parse(l) : []);
    } catch (_) { setLocalLogs([]); }
  };

  // 3. BACKUP COMPILING (Lossless v3)
  const handleGenerateBackup = async (showNotification = true) => {
    try {
      const res = await generateBackupString();
      setBackupToken(res.token);
      setBackupStats({
        count: res.count,
        rawSize: res.rawSize,
        counts: res.counts,
        timestamp: res.timestamp
      });
      if (showNotification) {
        setSuccessMessage('LOSSLESS BACKUP GENERATED: 100% of tasks, habits, timetable slots, notes, and records packed.');
        setErrorMessage(null);
      }
    } catch (err: any) {
      if (showNotification) {
        setErrorMessage(err.message || 'Failed compile operation.');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadLocalStates();
      setErrorMessage(null);
      setSuccessMessage(null);
      setBackupToken('');
      setBackupStats(null);
      setMasterEraseInput('');
      setRestoreInputToken('');
      setInspectionResult(null);
      
      // Auto-compile lossless backup string immediately on mount
      handleGenerateBackup(false);
    }
  }, [isOpen, tasks, habits]);

  // Live Inspection effect whenever restoreInputToken changes
  useEffect(() => {
    if (!restoreInputToken.trim()) {
      setInspectionResult(null);
      return;
    }
    const result = inspectBackupString(restoreInputToken);
    setInspectionResult(result);
  }, [restoreInputToken]);

  if (!isOpen) return null;

  // 1. MASTER WIPE OPERATION
  const handleMasterWipeAll = async () => {
    if (masterEraseInput !== 'CONFIRM') {
      setErrorMessage('Verification key mismatch. Please enter CONFIRM exactly.');
      return;
    }

    try {
      // Clear IndexedDB tasks and habits
      await clearAllStoreData();

      // Clear all relevant local storage keys
      localStorage.removeItem('daily_docket_timetable');
      localStorage.removeItem('daily_docket_birthdays');
      localStorage.removeItem('daily_docket_notes_pages');
      localStorage.removeItem('daily_docket_time_pins2');
      localStorage.removeItem('daily_docket_custom_sessions');
      localStorage.removeItem('daily_docket_focus_logs');

      setMasterEraseInput('');
      onRefresh();
      reloadLocalStates();
      
      setErrorMessage(null);
      setSuccessMessage('MASTER RESET COMPLETED: System successfully re-initialized to clean state.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Severe error during database expunge.');
    }
  };

  const handleCopyBackup = () => {
    if (!backupToken) return;
    navigator.clipboard.writeText(backupToken);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2200);
  };

  // Download raw JSON / .docket file
  const handleDownloadFile = async (format: 'docket' | 'json') => {
    try {
      let content = '';
      let filename = '';
      const dateStr = new Date().toISOString().slice(0, 10);
      
      if (format === 'json') {
        content = await generateBackupJson();
        filename = `daily-docket-backup-${dateStr}.json`;
      } else {
        content = backupToken;
        filename = `daily-docket-archive-${dateStr}.docket`;
      }

      const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage(`FILE SAVED: ${filename} downloaded to your device.`);
    } catch (e: any) {
      setErrorMessage(e?.message || 'Download failed.');
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRestoreInputToken(text.trim());
        setSuccessMessage(`File "${file.name}" loaded for injection inspection.`);
        setErrorMessage(null);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read selected file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 4. RESTORE STRING INJECTION
  const handleRestoreBackup = async () => {
    if (!restoreInputToken.trim()) {
      setErrorMessage('Please paste or upload a valid backup string token before initiating injection.');
      return;
    }

    try {
      const res = await restoreBackupString(restoreInputToken);
      
      // Notify components and reload UI
      onRefresh();
      reloadLocalStates();
      
      setRestoreInputToken('');
      setInspectionResult(null);
      setErrorMessage(null);
      
      const parts = res.restoredCounts;
      setSuccessMessage(
        `RESTORE SUCCESSFUL! Injected: ${parts.tasks} tasks, ${parts.habits} habits, ${parts.timetable} timetable slots, ${parts.notes} notes, ${parts.birthdays} birthdays, ${parts.sessions} focus presets, ${parts.logs} logs, ${parts.pins} scheduling pins.`
      );
    } catch (err: any) {
      setErrorMessage('Backup token parsing failed. The key is corrupted or incomplete.');
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6 font-sans">
      {/* Dimmer backdrop overlay */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-ink/80 backdrop-blur-[2px] transition-opacity"
      ></div>

      {/* Main Newspaper-styled Container */}
      <div className="relative w-full max-w-4xl bg-paper border-[6px] border-ink shadow-[12px_12px_0px_#1E1E1F] flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Block Section */}
        <div className="bg-ink text-paper p-4 md:p-5 flex justify-between items-center border-b-4 border-ink">
          <div className="flex items-center gap-3">
            <div className="bg-taxi text-ink p-2 border-2 border-paper rotate-[-2deg] flex-shrink-0 shadow-[2px_2px_0px_#1A1A1B]">
              <Database size={20} strokeWidth={3} />
            </div>
            <div>
              <h2 className="font-sans font-black text-xl md:text-2xl uppercase tracking-tighter leading-none">DATABANK CORE CABINET</h2>
              <p className="font-mono text-[9px] md:text-[10px] uppercase tracking-wider font-extrabold text-taxi mt-1">
                LOSSLESS BACKUPS, TIMETABLE ARCHIVES & SYSTEM RESTORATION
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-paper hover:text-taxi hover:rotate-90 transition-all duration-200 p-1 flex items-center justify-center cursor-pointer"
            aria-label="Close cabinet drawer"
          >
            <X size={26} strokeWidth={3} />
          </button>
        </div>

        {/* Dynamic Static Header Subbar */}
        <div className="flex border-b-2 border-ink font-mono text-[10px] md:text-xs font-black bg-taxi text-ink uppercase tracking-wider py-2.5 px-4 items-center justify-between select-none shrink-0 shadow-inner">
          <span className="flex items-center gap-2">
            <Server size={14} strokeWidth={3} className="animate-pulse" /> COMMAND ARCHIVAL & DATA MANAGEMENT
          </span>
          <span className="hidden sm:inline-block text-[9px] bg-ink text-paper px-2 py-0.5 rounded uppercase font-bold">
            ZERO DATA LOSS • HIGH INTEGRITY
          </span>
        </div>

        {/* Message Strip Alerts */}
        {errorMessage && (
          <div className="bg-subway-red text-white font-mono text-[11px] p-3 font-semibold uppercase tracking-wide border-b-2 border-ink text-center flex items-center justify-center gap-2 animate-in slide-in-from-top duration-150">
            <AlertTriangle size={15} strokeWidth={2.5} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-700 text-white font-mono text-[11px] p-3 font-semibold uppercase tracking-wide border-b-2 border-ink text-center flex items-center justify-center gap-2 animate-in slide-in-from-top duration-150">
            <Sparkles size={15} className="shrink-0 text-taxi" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Outer Content Scroll Chamber */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-[#FAF8F5] space-y-6">
          
          <div className="space-y-6">
            
            {/* Live Database Inventory Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border-2 border-ink p-3 shadow-[3px_3px_0px_#1A1A1B] relative overflow-hidden">
                <span className="font-mono text-[9px] uppercase font-bold text-ink/50 leading-none block border-b border-dashed border-ink/20 pb-1 mb-1">TASKS</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="font-sans font-black text-2xl text-ink leading-none">{tasks.length}</p>
                  <span className="font-mono text-[8.5px] text-ink/40 font-bold uppercase">items</span>
                </div>
              </div>

              <div className="bg-white border-2 border-ink p-3 shadow-[3px_3px_0px_#1A1A1B] relative overflow-hidden">
                <span className="font-mono text-[9px] uppercase font-bold text-ink/50 leading-none block border-b border-dashed border-ink/20 pb-1 mb-1">HABITS</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="font-sans font-black text-2xl text-ink leading-none">{habits.length}</p>
                  <span className="font-mono text-[8.5px] text-ink/40 font-bold uppercase">routines</span>
                </div>
              </div>

              <div className="bg-white border-2 border-ink p-3 shadow-[3px_3px_0px_#1A1A1B] relative overflow-hidden">
                <span className="font-mono text-[9px] uppercase font-bold text-ink/50 leading-none block border-b border-dashed border-ink/20 pb-1 mb-1">TIMETABLE</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="font-sans font-black text-2xl text-ink leading-none">{localTimetable.length}</p>
                  <span className="font-mono text-[8.5px] text-ink/40 font-bold uppercase">classes</span>
                </div>
              </div>

              <div className="bg-white border-2 border-ink p-3 shadow-[3px_3px_0px_#1A1A1B] relative overflow-hidden">
                <span className="font-mono text-[9px] uppercase font-bold text-ink/50 leading-none block border-b border-dashed border-ink/20 pb-1 mb-1">LOGS & NOTES</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="font-sans font-black text-2xl text-ink leading-none">{localNotes.length + localBirthdays.length + localLogs.length + localSessions.length + localPins.length}</p>
                  <span className="font-mono text-[8.5px] text-ink/40 font-bold uppercase">records</span>
                </div>
              </div>
            </div>

            {/* Explanatory banner block detailing safe database operations */}
            <div className="bg-amber-50 border-2 border-ink p-3 flex gap-2.5 items-start">
              <Info size={16} strokeWidth={2.5} className="text-subway-yellow mt-0.5 shrink-0" />
              <p className="font-mono text-[10px] text-ink/80 leading-relaxed uppercase">
                <strong className="text-ink font-black">ZERO DATA LOSS ARCHIVE:</strong> The backup string compresses your complete workspace — including tasks, habit completion histories, college timetable slots, notebook pages, birthdays, focus logs, and time pins. You can copy the code or save as a file.
              </p>
            </div>

            {/* Split Data Export / Data Import Panel Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Export / Compress Crate */}
              <div className="border-[3px] border-ink p-5 bg-white shadow-[6px_6px_0px_#1A1A1B] flex flex-col justify-between rounded group hover:shadow-[8px_8px_0px_#1A1A1B] transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-ink pb-2.5">
                    <div className="flex items-center gap-2">
                      <Download size={18} className="text-ink" strokeWidth={2.5} />
                      <h4 className="font-sans font-black text-xs uppercase tracking-tight text-ink">GENERATE & PACK BACKUP</h4>
                    </div>
                    <span className="font-mono text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-300 font-black px-1.5 py-0.5 rounded uppercase">
                      COMPACT v3
                    </span>
                  </div>
                  
                  <p className="font-serif text-[12px] text-ink/75 leading-relaxed">
                    Instantly packs all databanks using lossless compression into an ultra-resilient portable token or downloadable file.
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block font-mono text-[10px] text-ink font-black uppercase">PORTABLE BACKUP STRING:</label>
                      <span className="font-mono text-[8.5px] text-emerald-700 font-extrabold uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                        <Check size={10} strokeWidth={3} /> ALL SECTORS INCLUDED
                      </span>
                    </div>
                    
                    <div className="relative">
                      <textarea
                        readOnly
                        value={backupToken || 'COMPILING LOSSLESS BACKUP STRING...'}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        className="w-full h-24 font-mono text-[9px] border-2 border-ink p-2 px-2.5 bg-ink text-paper leading-normal tracking-wide resize-none rounded opacity-95 focus:opacity-100 transition-opacity select-all shadow-inner uppercase font-black"
                        placeholder="Loading and compiling backup..."
                      />
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-taxi text-ink text-[8px] font-mono uppercase font-black tracking-wide border border-ink rounded select-none pointer-events-none">
                        CLICK TO SELECT ALL
                      </div>
                    </div>
                    
                    {/* Backup Stats info bar */}
                    {backupStats ? (
                      <div className="bg-[#FCFAF6] border border-ink/30 p-2.5 rounded font-mono text-[9px] space-y-1">
                        <div className="flex justify-between font-black text-ink">
                          <span>COMPRESSION EFFICIENCY:</span>
                          <span className="text-emerald-700">
                            {Math.round(backupStats.rawSize / 1024 * 10) / 10} KB ➔ {Math.round(backupStats.count / 1024 * 10) / 10} KB ({Math.round((1 - backupStats.count / backupStats.rawSize) * 100)}% smaller)
                          </span>
                        </div>
                        <div className="text-[8px] text-ink/60 flex flex-wrap gap-x-2 pt-0.5">
                          <span>Tasks: <strong>{backupStats.counts.tasks}</strong></span>
                          <span>Habits: <strong>{backupStats.counts.habits}</strong></span>
                          <span>Timetable: <strong>{backupStats.counts.timetable}</strong></span>
                          <span>Notes: <strong>{backupStats.counts.notes}</strong></span>
                          <span>Logs: <strong>{backupStats.counts.logs}</strong></span>
                          <span>Pins: <strong>{backupStats.counts.pins}</strong></span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleCopyBackup}
                    disabled={!backupToken}
                    className="w-full bg-taxi hover:bg-[#FFE359] text-ink font-mono text-[11px] font-black py-2.5 px-4 uppercase tracking-wider border-2 border-ink shadow-[4px_4px_0px_#1A1A1B] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_#1A1A1B] active:translate-y-[2.5px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} strokeWidth={3} className="text-ink animate-bounce" />
                        <span>COPIED BACKUP STRING TO CLIPBOARD!</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCopy size={14} strokeWidth={2.5} />
                        <span>COPY BACKUP STRING</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadFile('docket')}
                      className="bg-white hover:bg-stone-50 text-ink font-mono text-[9.5px] font-black py-1.5 px-2 uppercase tracking-wide border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] hover:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileDown size={13} strokeWidth={2.5} /> Download .docket
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile('json')}
                      className="bg-white hover:bg-stone-50 text-ink font-mono text-[9.5px] font-black py-1.5 px-2 uppercase tracking-wide border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] hover:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download size={13} strokeWidth={2.5} /> Download .json
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateBackup(true)}
                    className="w-full text-center font-mono text-[9.5px] text-ink/60 hover:text-ink font-black py-1 uppercase tracking-wide hover:underline transition-all flex items-center justify-center gap-1"
                  >
                    <RefreshCw size={11} strokeWidth={2.5} /> Refresh Archival Key
                  </button>
                </div>
              </div>

              {/* Box 2: Feed / Inject Backup Crate */}
              <div className="border-[3px] border-ink p-5 bg-white shadow-[6px_6px_0px_#1A1A1B] flex flex-col justify-between rounded group hover:shadow-[8px_8px_0px_#1A1A1B] transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b-2 border-ink pb-2.5">
                    <div className="flex items-center gap-2">
                      <Upload size={18} className="text-ink" strokeWidth={2.5} />
                      <h4 className="font-sans font-black text-xs uppercase tracking-tight text-ink">INJECT & RESTORE</h4>
                    </div>
                    <span className="font-mono text-[8px] bg-blue-50 text-blue-800 border border-blue-300 font-black px-1.5 py-0.5 rounded uppercase">
                      ALL FORMATS SUPPORTED
                    </span>
                  </div>

                  <p className="font-serif text-[12px] text-ink/75 leading-relaxed">
                    Paste a backup token, raw JSON, or upload a saved <code className="bg-stone-100 px-1 border border-ink/20 font-mono text-[10px]">.docket</code> / <code className="bg-stone-100 px-1 border border-ink/20 font-mono text-[10px]">.json</code> file to restore.
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block font-mono text-[10px] text-ink font-black uppercase">PASTE BACKUP STRING OR FILE:</label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="font-mono text-[8.5px] text-sky-800 hover:text-sky-950 font-extrabold uppercase bg-sky-50 hover:bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <FileUp size={11} strokeWidth={2.5} /> Upload File
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".docket,.json,.txt" 
                        className="hidden" 
                      />
                    </div>

                    <textarea
                      value={restoreInputToken}
                      onChange={(e) => setRestoreInputToken(e.target.value)}
                      placeholder="Paste your backup string (starting with 'DOCKET-v3:' or legacy token / JSON) here..."
                      className="w-full h-24 font-mono text-[9px] border-2 border-ink p-2.5 bg-[#FCFAF7] text-ink placeholder-ink/40 resize-none rounded focus:ring-2 focus:ring-taxi focus:outline-none focus:bg-white tracking-wide transition-all"
                    />

                    {/* Live Inspection / Validation Badge */}
                    {inspectionResult ? (
                      <div className={`p-2.5 border-2 rounded font-mono text-[9px] ${
                        inspectionResult.isValid 
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950' 
                          : 'bg-rose-50 border-subway-red text-subway-red'
                      }`}>
                        {inspectionResult.isValid ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-black uppercase">
                              <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                              <span>VALID ARCHIVE DETECTED (Format: {inspectionResult.sourceType})</span>
                            </div>
                            <div className="text-[8px] text-emerald-900 flex flex-wrap gap-x-2">
                              <span>Tasks: <strong>{inspectionResult.counts.tasks}</strong></span>
                              <span>Habits: <strong>{inspectionResult.counts.habits}</strong></span>
                              <span>Timetable: <strong>{inspectionResult.counts.timetable}</strong></span>
                              <span>Notes: <strong>{inspectionResult.counts.notes}</strong></span>
                              <span>Birthdays: <strong>{inspectionResult.counts.birthdays}</strong></span>
                              <span>Logs: <strong>{inspectionResult.counts.logs}</strong></span>
                              <span>Pins: <strong>{inspectionResult.counts.pins}</strong></span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold uppercase">
                            <AlertTriangle size={13} className="shrink-0" />
                            <span>{inspectionResult.errorMessage || 'Invalid backup string syntax'}</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleRestoreBackup}
                    disabled={!inspectionResult?.isValid}
                    className={`w-full font-mono text-[10.5px] font-black py-3 px-4 uppercase tracking-wider border-2 border-ink transition-all flex items-center justify-center gap-2 ${
                      inspectionResult?.isValid
                        ? 'bg-[#3D6DA3] hover:bg-[#315783] text-white cursor-pointer shadow-[4px_4px_0px_#1A1A1B] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_#1A1A1B] active:translate-y-[2px] active:shadow-none'
                        : 'bg-stone-200 text-stone-500 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <Upload size={14} strokeWidth={2.5} /> 
                    {inspectionResult?.isValid 
                      ? `RESTORE ${inspectionResult.totalEntities} ENTITIES & SYNC` 
                      : 'PASTE VALID TOKEN TO RESTORE'
                    }
                  </button>
                </div>
              </div>

            </div>

            {/* Master Global Erase Section */}
            <div className="border-[4px] border-ink p-4 md:p-5 bg-[#FAF8F5] space-y-3.5 shadow-[6px_6px_0px_#1A1A1B] rounded relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1 bg-[#DE3C3C] w-full"></div>
              
              <div className="flex items-center gap-2 border-b-2 border-ink pb-2">
                <ShieldAlert size={18} className="text-subway-red animate-pulse" strokeWidth={2.5} />
                <h4 className="font-sans font-black text-xs md:text-sm uppercase text-ink tracking-tight">MASTER SYSTEM RESET</h4>
              </div>

              <p className="font-serif text-xs text-ink/80 leading-relaxed">
                Clears all IndexedDB tasks, habit streak histories, college timetable slots, focus notebooks, and timer preferences.
                <strong className="text-subway-red font-sans font-extrabold uppercase"> Make sure to copy your backup string before resetting.</strong>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch border-2 border-ink p-3.5 bg-white rounded shadow-inner">
                <div className="md:col-span-8 space-y-1 flex flex-col justify-center">
                  <label className="block font-mono text-[9px] text-subway-red font-black uppercase leading-none">
                    TYPE "CONFIRM" IN UPPERCASE TO RESET:
                  </label>
                  <input
                    type="text"
                    value={masterEraseInput}
                    onChange={(e) => setMasterEraseInput(e.target.value)}
                    placeholder="Enter CONFIRM here..."
                    className="w-full font-mono text-xs border-2 border-ink px-3 py-1.5 bg-[#FCFBF9] text-ink uppercase tracking-widest font-black focus:bg-stone-50 outline-none rounded"
                  />
                </div>
                <div className="md:col-span-4 flex items-end">
                  <button
                    type="button"
                    onClick={handleMasterWipeAll}
                    disabled={masterEraseInput !== 'CONFIRM'}
                    className={`w-full font-mono text-[10px] md:text-[10.5px] font-black h-9 uppercase tracking-widest border-2 border-ink transition-all rounded ${
                      masterEraseInput === 'CONFIRM' 
                        ? 'bg-subway-red hover:bg-rose-900 text-white cursor-pointer shadow-[3px_3px_0px_#1A1A1B] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#1A1A1B] active:translate-y-[2px] active:shadow-none' 
                        : 'bg-ink/10 text-ink/40 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Format Databanks
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Footer info stamp */}
        <div className="border-t-4 border-ink p-3 bg-ink text-[#CCCCCC] font-mono text-[9px] uppercase tracking-widest flex flex-col md:flex-row justify-between items-center select-none gap-2 shrink-0">
          <span>DAILY DOCKET ARCHIVAL CRYPTER v3.0 (LOSSLESS)</span>
          <span className="text-taxi font-bold">100% FIDELITY PRESERVATION • DISK CABINET OK</span>
        </div>

      </div>
    </div>
  );
}
