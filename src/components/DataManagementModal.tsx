import React, { useState, useEffect } from 'react';
import { Task, Habit, Birthday, NotePage } from '../types';
import { 
  X, Database, AlertTriangle, RefreshCw, 
  Download, Upload, Copy, Check, Server, Sparkles, FileText, ShieldAlert, ArrowRight, ClipboardCopy, Info
} from 'lucide-react';
import { 
  clearAllStoreData, 
  seedDBIfEmpty 
} from '../lib/db';
import { 
  generateBackupString, 
  restoreBackupString 
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
  const [backupStats, setBackupStats] = useState<{ count: number; rawSize: number; isOptimized: boolean } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [restoreInputToken, setRestoreInputToken] = useState('');

  // Local state replicas of storage components to show count metrics
  const [localBirthdays, setLocalBirthdays] = useState<Birthday[]>([]);
  const [localNotes, setLocalNotes] = useState<NotePage[]>([]);
  const [localPins, setLocalPins] = useState<any[]>([]);
  const [localSessions, setLocalSessions] = useState<any[]>([]);
  const [localLogs, setLocalLogs] = useState<any[]>([]);

  // Reload count indicators
  const reloadLocalStates = () => {
    try {
      const b = localStorage.getItem('daily_docket_birthdays');
      setLocalBirthdays(b ? JSON.parse(b) : []);
    } catch (_) { setLocalBirthdays([]); }

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

  // 3. BACKUP COMPILING
  const handleGenerateBackup = async (showNotification = true) => {
    try {
      const res = await generateBackupString();
      setBackupToken(res.token);
      setBackupStats({
        count: res.count,
        rawSize: res.rawSize,
        isOptimized: res.isOptimized
      });
      if (showNotification) {
        setSuccessMessage('BACKUP ARCHIVE GENERATED: System parameters indexed and compressed.');
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
      
      // Auto-compile silently immediately on mount
      handleGenerateBackup(false);
    }
  }, [isOpen, tasks, habits]);

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

      // Clear relevant local storage keys
      localStorage.removeItem('daily_docket_birthdays');
      localStorage.removeItem('daily_docket_notes_pages');
      localStorage.removeItem('daily_docket_time_pins2');
      localStorage.removeItem('daily_docket_custom_sessions');
      localStorage.removeItem('daily_docket_focus_logs');

      setMasterEraseInput('');
      onRefresh();
      reloadLocalStates();
      
      setErrorMessage(null);
      setSuccessMessage('MASTER RESET COMPLETED: System successfully re-initialized to initial state.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Severe error during database expunge.');
    }
  };

  // 2. SEED DEFAULT DATASET
  const handleSeedDefaults = async () => {
    try {
      await clearAllStoreData();
      await seedDBIfEmpty();
      onRefresh();
      reloadLocalStates();
      setErrorMessage(null);
      setSuccessMessage('INTEL ACQUISITION SUCCESSFUL: Default disciplines and starter tasks restored.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failure writing seed records.');
    }
  };

  const handleCopyBackup = () => {
    if (!backupToken) return;
    navigator.clipboard.writeText(backupToken);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 4. RESTORE STRING INJECTION
  const handleRestoreBackup = async () => {
    if (!restoreInputToken.trim()) {
      setErrorMessage('Please paste or enter a valid backup string token before initiating injection.');
      return;
    }

    try {
      const res = await restoreBackupString(restoreInputToken);
      
      // Notify components and reload UI
      onRefresh();
      reloadLocalStates();
      
      setRestoreInputToken('');
      setErrorMessage(null);
      
      const parts = res.restoredCounts;
      setSuccessMessage(
        `RESTORE COMPLETED SUCCESSFULLY! Injected: ${parts.tasks} tasks, ${parts.habits} habits, ${parts.notes} notebook chapters, ${parts.birthdays} birthdates, ${parts.sessions} focus settings, ${parts.logs} logs, ${parts.pins} scheduling pins.`
      );
    } catch (err: any) {
      setErrorMessage('Backup token parsing failed. The token is corrupted or incomplete.');
    }
  };

  const charPercentage = backupStats ? Math.min(100, (backupStats.count / 20000) * 100) : 0;
  const isCloseToMax = charPercentage > 85;

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
              <p className="font-mono text-[9px] md:text-[10px] uppercase tracking-wider font-extrabold text-taxi mt-1">SECURE PORTABLE BACKUPS, COMPACTIONS & SYSTEM FLASH CODES</p>
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
        <div className="flex border-b-2 border-ink font-mono text-[10px] md:text-xs font-black bg-taxi text-ink uppercase tracking-wider py-3 px-4 items-center justify-between select-none shrink-0 shadow-inner">
          <span className="flex items-center gap-2">
            <Server size={14} strokeWidth={3} className="animate-pulse" /> COMMAND ARCHIVAL BACKUPS PANEL
          </span>
          <span className="hidden sm:inline-block text-[9px] bg-ink text-paper px-2 py-0.5 rounded uppercase font-bold">
            STATUS: SECURE DISK SYNCHRONIZED
          </span>
        </div>

        {/* Message Strip Alerts with transition animations */}
        {errorMessage && (
          <div className="bg-subway-red text-white font-mono text-[11px] p-3.5 font-semibold uppercase tracking-wide border-b-2 border-ink text-center flex items-center justify-center gap-2 animate-in slide-in-from-top duration-150">
            <AlertTriangle size={15} strokeWidth={2.5} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-700 text-white font-mono text-[11px] p-3.5 font-semibold uppercase tracking-wide border-b-2 border-ink text-center flex items-center justify-center gap-2 animate-in slide-in-from-top duration-150">
            <Sparkles size={15} className="shrink-0 text-taxi" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Outer Content Scroll Chamber */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-[#FAF8F5] space-y-6">
          
          <div className="space-y-6">
            
            {/* Retro Ticket Hand-Printed Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border-2 border-ink p-3.5 shadow-[4px_4px_0px_#1A1A1B] hover:translate-y-[-1px] transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-10 w-10 bg-paint-yellow/10 rounded-bl-full flex items-center justify-center font-mono text-[9px] font-bold text-ink/30 uppercase tracking-tighter">
                  01
                </div>
                <span className="font-mono text-[9px] uppercase font-bold text-ink/50 leading-none block border-b border-dashed border-ink/20 pb-1 mb-1">TASKS STACK</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="font-sans font-black text-2xl text-ink leading-none">{tasks.length}</p>
                  <span className="font-mono text-[9px] text-ink/40 font-bold uppercase">entities</span>
                </div>
              </div>

              <div className="bg-white border-2 border-ink p-3.5 shadow-[4px_4px_0px_#1A1A1B] hover:translate-y-[-1px] transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-10 w-10 bg-paint-yellow/10 rounded-bl-full flex items-center justify-center font-mono text-[9px] font-bold text-ink/30 uppercase tracking-tighter">
                  02
                </div>
                <span className="font-mono text-[9px] uppercase font-bold text-ink/50 leading-none block border-b border-dashed border-ink/20 pb-1 mb-1">HABITS TRACK</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="font-sans font-black text-2xl text-ink leading-none">{habits.length}</p>
                  <span className="font-mono text-[9px] text-ink/40 font-bold uppercase">disciplines</span>
                </div>
              </div>

              <div className="bg-white border-2 border-ink p-3.5 shadow-[4px_4px_0px_#1A1A1B] hover:translate-y-[-1px] transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-10 w-10 bg-paint-yellow/10 rounded-bl-full flex items-center justify-center font-mono text-[9px] font-bold text-ink/30 uppercase tracking-tighter">
                  03
                </div>
                <span className="font-mono text-[9px] uppercase font-bold text-ink/50 leading-none block border-b border-dashed border-ink/20 pb-1 mb-1">FOCUS SECTOR</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="font-sans font-black text-2xl text-ink leading-none">{localSessions.length + localLogs.length}</p>
                  <span className="font-mono text-[9px] text-ink/40 font-bold uppercase">runs & presets</span>
                </div>
              </div>

              <div className="bg-white border-2 border-ink p-3.5 shadow-[4px_4px_0px_#1A1A1B] hover:translate-y-[-1px] transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-10 w-10 bg-paint-yellow/10 rounded-bl-full flex items-center justify-center font-mono text-[9px] font-bold text-ink/30 uppercase tracking-tighter">
                  04
                </div>
                <span className="font-mono text-[9px] uppercase font-bold text-ink/50 leading-none block border-b border-dashed border-ink/20 pb-1 mb-1">RECORDS PACK</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="font-sans font-black text-2xl text-ink leading-none">{localNotes.length + localBirthdays.length + localPins.length}</p>
                  <span className="font-mono text-[9px] text-ink/40 font-bold uppercase">anniversaries / tabs</span>
                </div>
              </div>
            </div>

            {/* Explanatory banner block detailing safe database operations */}
            <div className="bg-amber-50 border-2 border-ink p-3 flex gap-2.5 items-start">
              <Info size={16} strokeWidth={2.5} className="text-subway-yellow mt-0.5 shrink-0" />
              <p className="font-mono text-[10px] text-ink/80 leading-relaxed uppercase">
                <strong className="text-ink font-black">HOW IT WORKS:</strong> Compiling yields a unified textual key encoding all client-side data (including tasks, habits, and focus logs). Injecting any key decodes it to instantly override active stores. Keep a copy in a custom text file to back up your productivity routine locally!
              </p>
            </div>

            {/* Split Data Export / Data Import Panel Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Export / Compress Crate */}
              <div className="border-[3px] border-ink p-5 bg-white shadow-[6px_6px_0px_#1A1A1B] flex flex-col justify-between rounded group hover:shadow-[8px_8px_0px_#1A1A1B] transition-all">
                <div>
                  <div className="flex items-center justify-between border-b-2 border-ink pb-2.5 mb-3.5">
                    <div className="flex items-center gap-2">
                      <Download size={18} className="text-ink" strokeWidth={2.5} />
                      <h4 className="font-sans font-black text-xs uppercase tracking-tight text-ink">PACK PORTABLE ARCHIVE</h4>
                    </div>
                    <span className="font-mono text-[8px] bg-emerald-50 text-emerald-800 border border-emerald-300 font-black px-1.5 py-0.5 rounded uppercase">READY TO COPY</span>
                  </div>
                  
                  <p className="font-serif text-[12px] text-ink/75 leading-relaxed mb-4">
                    Harvests all database parameters and packs them automatically with loss-less field optimization suited for immediate local storage or external transfer.
                  </p>

                  <div className="space-y-3.5 font-sans">
                    <div className="flex justify-between items-center">
                      <label className="block font-mono text-[10px] text-ink font-black uppercase">YOUR COMPILATION STRING:</label>
                      <span className="font-mono text-[8.5px] text-emerald-700 font-extrabold uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                        <Check size={10} strokeWidth={3} /> AUTO-GENERATED LOCK
                      </span>
                    </div>
                    
                    <div className="relative">
                      <textarea
                        readOnly
                        value={backupToken || 'COMPILING LATEST REPRODUCTION STRING... Please hold'}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        className="w-full h-28 font-mono text-[9px] border-2 border-ink p-2 px-2.5 bg-ink text-paper leading-normal tracking-wide resize-none rounded opacity-95 focus:opacity-100 transition-opacity select-all shadow-inner uppercase font-black"
                        placeholder="Loading and compiling backup..."
                      />
                      <div className="absolute bottom-2.5 right-2 px-1.5 py-0.5 bg-taxi text-ink text-[8px] font-mono uppercase font-black tracking-wide border border-ink rounded select-none pointer-events-none">
                        SELECT ALL & COPY
                      </div>
                    </div>
                    
                    {/* Character Gauge & Info Bar */}
                    {backupStats ? (
                      <div className="space-y-2 bg-[#FCFAF6] border border-ink/30 p-3 rounded">
                        <div className="flex justify-between font-mono text-[9px] font-black">
                          <span className="uppercase text-ink/70">ARCHIVE FILL RATE:</span>
                          <span className={isCloseToMax ? "text-subway-red" : "text-ink"}>
                            {backupStats.count.toLocaleString()} / 20,000 BYTES ({Math.round(charPercentage)}%)
                          </span>
                        </div>
                        
                        {/* Visual Progress bar inside a subtle styled track */}
                        <div className="w-full bg-ink/10 h-2.5 border border-ink/30 rounded-full overflow-hidden p-[1px]">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              backupStats.count > 18000 ? 'bg-subway-red' : backupStats.count > 10000 ? 'bg-taxi' : 'bg-[#3A7E56]'
                            }`}
                            style={{ width: `${charPercentage}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center font-mono text-[8px] text-ink/50">
                          <span>0 BYTES</span>
                          <span className="font-bold text-ink/70">DISK METRIC: {Math.round(backupStats.rawSize / 1024 * 10) / 10}KB ➔ PACKED: {Math.round(backupStats.count / 1024 * 10) / 10}KB</span>
                          <span>20,000 BYTE LIMIT</span>
                        </div>

                        {backupStats.isOptimized && (
                          <div className="bg-ink text-taxi p-2.5 font-mono text-[9px] font-black tracking-wide leading-relaxed rounded uppercase border border-ink shadow-[2px_2px_0px_#1A1A1B] flex items-center gap-1.5">
                            <Sparkles size={11} className="shrink-0 text-taxi" />
                            <span>FIELD OPTIMIZATION ENGAGED: Standard bounds kept focus timeline logs capped to last 60 entries.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="animate-pulse bg-[#FCFAF6] border border-ink/10 p-3 rounded font-mono text-[9px] text-center text-ink/50">
                        CALCULATING METRICS...
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBackup}
                    disabled={!backupToken}
                    className="w-full bg-taxi hover:bg-[#FFE359] text-ink font-mono text-[11px] font-black py-3 px-4 uppercase tracking-wider border-2 border-ink shadow-[4px_4px_0px_#1A1A1B] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_#1A1A1B] active:translate-y-[2.5px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} strokeWidth={3} className="text-ink animate-bounce" />
                        <span>COPIED ARCHIVAL KEY!</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCopy size={14} strokeWidth={2.5} />
                        <span>COPY BACKUP KEY TO CLIPBOARD</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateBackup(true)}
                    className="w-full text-center font-mono text-[10px] text-ink/60 hover:text-ink font-black py-1.5 uppercase tracking-wide hover:underline transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={11} strokeWidth={2.5} /> Re-compile & Refresh Archival Key
                  </button>
                </div>
              </div>

              {/* Box 2: Feed / Inject Backup Crate */}
              <div className="border-[3px] border-ink p-5 bg-white shadow-[6px_6px_0px_#1A1A1B] flex flex-col justify-between rounded group hover:shadow-[8px_8px_0px_#1A1A1B] transition-all">
                <div>
                  <div className="flex items-center justify-between border-b-2 border-ink pb-2.5 mb-3.5">
                    <div className="flex items-center gap-2">
                      <Upload size={18} className="text-ink" strokeWidth={2.5} />
                      <h4 className="font-sans font-black text-xs uppercase tracking-tight text-ink">INJECT FLASHLINK KEY</h4>
                    </div>
                    <span className="font-mono text-[8px] bg-blue-50 text-blue-800 border border-blue-300 font-black px-1.5 py-0.5 rounded uppercase">OVERWRITE RECOVERY</span>
                  </div>

                  <p className="font-serif text-[12px] text-ink/75 leading-relaxed mb-4">
                    Paste an encrypted system key string generated from this app inside the prompt area below to overwrite and sync your exact routine environment.
                  </p>

                  <div className="space-y-2">
                    <label className="block font-mono text-[10px] text-ink font-black uppercase">PASTE PREV-COMPILED STRING:</label>
                    <textarea
                      value={restoreInputToken}
                      onChange={(e) => setRestoreInputToken(e.target.value)}
                      placeholder="Paste your compiled text starting with 'eyJu...' here"
                      className="w-full h-28 font-mono text-[9px] border-2 border-ink p-3 bg-[#FCFAF7] text-ink placeholder-ink/40 resize-none rounded focus:ring-2 focus:ring-taxi focus:outline-none focus:bg-white tracking-wide transition-all"
                    />
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    onClick={handleRestoreBackup}
                    className="w-full bg-[#3D6DA3] hover:bg-[#315783] text-white font-mono text-[10.5px] font-black py-3 px-4 uppercase tracking-wider border-2 border-ink shadow-[3px_3px_0px_#1A1A1B] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#1A1A1B] active:translate-y-[2.5px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Upload size={14} strokeWidth={2.5} /> Overwrite & Restore From Key
                  </button>
                </div>
              </div>

            </div>

            {/* Master Global Erase and Dataset Seed Options */}
            <div className="border-[4px] border-ink p-5 bg-[#FAF8F5] space-y-4 shadow-[6px_6px_0px_#1A1A1B] rounded relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1 bg-[#DE3C3C] w-full"></div>
              
              <div className="flex items-center gap-2 border-b-2 border-ink pb-2.5">
                <ShieldAlert size={20} className="text-subway-red animate-pulse" strokeWidth={2.5} />
                <h4 className="font-sans font-black text-sm uppercase text-ink tracking-tight">MASTER DISK SECURITY RESTRICTIONS</h4>
              </div>

              <p className="font-serif text-xs text-ink/80 leading-relaxed max-w-3xl">
                Warning! Restoring to standard initial values or triggering a hard clear executes format structures on IndexedDB, cleans active streak trackers, scheduler parameters, focus notebooks, and deletes all customized timer settings.
                <strong className="text-subway-red font-sans font-extrabold uppercase"> This operation cannot be undone.</strong>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch border-2 border-ink p-4 bg-white rounded shadow-inner">
                <div className="md:col-span-8 space-y-1.5 flex flex-col justify-center">
                  <label className="block font-mono text-[9.5px] text-subway-red font-black uppercase leading-none">
                    TO EXPUNGE SYSTEM, TYPE "CONFIRM" EXACTLY:
                  </label>
                  <input
                    type="text"
                    value={masterEraseInput}
                    onChange={(e) => setMasterEraseInput(e.target.value)}
                    placeholder="Enter CONFIRM in uppercase..."
                    className="w-full font-mono text-xs border-2 border-ink px-3 py-2 bg-[#FCFBF9] text-ink uppercase tracking-widest font-black focus:bg-stone-50 outline-none rounded"
                  />
                </div>
                <div className="md:col-span-4 flex items-end">
                  <button
                    type="button"
                    onClick={handleMasterWipeAll}
                    disabled={masterEraseInput !== 'CONFIRM'}
                    className={`w-full font-mono text-[10px] md:text-[10.5px] font-black h-10 uppercase tracking-widest border-2 border-ink transition-all rounded ${
                      masterEraseInput === 'CONFIRM' 
                        ? 'bg-subway-red hover:bg-rose-900 text-white cursor-pointer shadow-[3px_3px_0px_#1A1A1B] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#1A1A1B] active:translate-y-[2.5px] active:shadow-none' 
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
        <div className="border-t-4 border-ink p-3.5 bg-ink text-[#CCCCCC] font-mono text-[9px] uppercase tracking-widest flex flex-col md:flex-row justify-between items-center select-none gap-2 shrink-0">
          <span>DAILY DOCKET ARCHIVAL CRYPTER v2.1.5</span>
          <span className="text-taxi font-bold">STABLE SYNCED INTEGRATION MODULES | DISK CABINET OK</span>
        </div>

      </div>
    </div>
  );
}
