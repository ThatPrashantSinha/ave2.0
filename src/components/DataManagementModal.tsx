import React, { useState } from 'react';
import { Task, Habit } from '../types';
import { X, Trash2, Database, AlertTriangle, RefreshCw, FileText, Award } from 'lucide-react';
import { 
  deleteTaskFromDB, 
  deleteHabitFromDB, 
  clearAllStoreData, 
  clearTasksStoreData, 
  clearHabitsStoreData, 
  seedDBIfEmpty 
} from '../lib/db';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  habits: Habit[];
  onRefresh: () => void;
}

export function DataManagementModal({ isOpen, onClose, tasks, habits, onRefresh }: DataManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'habits'>('overview');
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleWipeAll = async () => {
    try {
      await clearAllStoreData();
      onRefresh();
      setShowConfirmAll(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to wipe data.');
    }
  };

  const handleWipeTasks = async () => {
    if (confirm('Are you absolutely certain you want to erase all tasks?')) {
      try {
        await clearTasksStoreData();
        onRefresh();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to wipe tasks.');
      }
    }
  };

  const handleWipeHabits = async () => {
    if (confirm('Are you absolutely certain you want to close and erase all daily disciplines?')) {
      try {
        await clearHabitsStoreData();
        onRefresh();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to wipe habits.');
      }
    }
  };

  const handleSeedDefaults = async () => {
    try {
      // Clear first then seed
      await clearAllStoreData();
      await seedDBIfEmpty();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore default records.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTaskFromDB(id);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete task.');
    }
  };

  const handleDeleteHabit = async (id: string) => {
    try {
      await deleteHabitFromDB(id);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete habit.');
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6 font-sans">
      {/* Background dimmer */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm transition-opacity"
      ></div>

      {/* Main Newspaper-styled Container */}
      <div className="relative w-full max-w-2xl bg-paper border-[6px] border-ink shadow-[10px_10px_0px_#1A1A1B] flex flex-col max-h-[85vh] md:max-h-[80vh] overflow-hidden transform transition-all">
        
        {/* Header Ribbon */}
        <div className="bg-ink text-paper p-4 flex justify-between items-center border-b-4 border-ink">
          <div className="flex items-center gap-2">
            <div className="bg-taxi text-ink p-1 border-2 border-paper">
              <Database size={16} strokeWidth={3} />
            </div>
            <div>
              <h2 className="font-sans font-black text-xl md:text-2xl uppercase tracking-tighter">DATA COMMAND DOSSIER</h2>
              <p className="font-mono text-[9px] uppercase tracking-widest font-black opacity-80 text-taxi">INDEXED DB ARCHIVE STATUS & PURGE CONTROLS</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-paper hover:text-taxi transition-colors p-1"
            aria-label="Close controller"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b-4 border-ink font-mono text-xs font-bold bg-[#FAF8F5]">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 text-center uppercase tracking-wider border-r-2 border-ink transition-colors cursor-pointer ${
              activeTab === 'overview' ? 'bg-taxi text-ink font-black' : 'hover:bg-paper-dark text-ink-light'
            }`}
          >
            OVERVIEW
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 py-3 text-center uppercase tracking-wider border-r-2 border-ink transition-colors cursor-pointer ${
              activeTab === 'tasks' ? 'bg-taxi text-ink font-black' : 'hover:bg-paper-dark text-ink-light'
            }`}
          >
            TASKS ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('habits')}
            className={`flex-1 py-3 text-center uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'habits' ? 'bg-taxi text-ink font-black' : 'hover:bg-paper-dark text-ink-light'
            }`}
          >
            DISCIPLINES ({habits.length})
          </button>
        </div>

        {/* Error strip */}
        {errorMessage && (
          <div className="bg-subway-red text-white font-mono text-xs p-2.5 font-bold uppercase tracking-wide border-b-4 border-ink text-center">
            {errorMessage}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-paper">
          
          {/* Tab 1: Overview and Wipes */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Informative vintage warning */}
              <div className="border-4 border-ink p-4 bg-[#FFFEEF] border-dashed flex gap-4 items-start">
                <AlertTriangle size={36} className="text-subway-red flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-sans font-black text-sm uppercase text-ink">Attention Editor to Chief Clerk</h4>
                  <p className="font-serif text-xs text-ink-light italic leading-relaxed">
                    This control panel directly addresses the high-speed local <b>IndexedDB archive</b> instance loaded on this container. Records deleted here are expunged permanently from client storage and cannot be easily retrieved.
                  </p>
                </div>
              </div>

              {/* Status grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border-4 border-ink p-4 bg-paper shadow-[4px_4px_0px_#1A1A1B] text-center">
                  <span className="font-mono text-xs font-black text-ink-light uppercase tracking-wider">Active Dispatches</span>
                  <div className="font-sans font-black text-4xl mt-1 text-ink">{tasks.length}</div>
                  <p className="font-mono text-[9px] uppercase font-bold text-ink-light mt-1">Stored Objectives</p>
                </div>
                <div className="border-4 border-ink p-4 bg-paper shadow-[4px_4px_0px_#1A1A1B] text-center">
                  <span className="font-mono text-xs font-black text-ink-light uppercase tracking-wider">Active Disciplines</span>
                  <div className="font-sans font-black text-4xl mt-1 text-ink">{habits.length}</div>
                  <p className="font-mono text-[9px] uppercase font-bold text-ink-light mt-1">Streak Monitors</p>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="border-4 border-ink p-5 space-y-4 bg-[#FAF8F5]">
                <h3 className="font-sans font-black uppercase text-sm tracking-tight border-b-2 border-ink pb-2">EXPUNGE & RE-SEED UTILITIES</h3>
                
                {showConfirmAll ? (
                  <div className="p-4 border-2 border-subway-red bg-white space-y-3">
                    <p className="font-mono text-xs font-bold text-subway-red uppercase tracking-wider">⚠️ DANGER: EXPUNGE ENTIRE LOCAL ENGINE DATA?</p>
                    <p className="font-serif text-xs italic text-ink-light">This will completely restore the system state to empty, purging tasks and everyday disciplines.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleWipeAll}
                        className="bg-subway-red hover:bg-red-700 text-white font-mono text-xs font-black px-4 py-2 uppercase border-2 border-ink cursor-pointer"
                      >
                        CONFIRM SOLID WIPE
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmAll(false)}
                        className="bg-paper hover:bg-paper-dark text-ink font-mono text-xs font-bold px-4 py-2 uppercase border-2 border-ink cursor-pointer"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConfirmAll(true)}
                      className="bg-subway-red hover:bg-red-700 text-white font-mono text-xs font-black p-3 uppercase border-2 border-ink shadow-[3px_3px_0px_#1A1A1B] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 size={13} /> EXPUNGE ALL ARCHIVES
                    </button>
                    <button
                      type="button"
                      onClick={handleSeedDefaults}
                      className="bg-taxi hover:bg-taxi-hover text-ink font-mono text-xs font-black p-3 uppercase border-2 border-ink shadow-[3px_3px_0px_#1A1A1B] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#1A1A1B] active:shadow-none active:translate-y-[3px] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={13} /> SEED DEFAULT INTEL
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-ink/20 pt-4">
                  <button
                    type="button"
                    onClick={handleWipeTasks}
                    className="border-2 border-ink hover:bg-paper-dark text-ink font-mono text-xs font-bold p-2.5 uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Clear All Tasks
                  </button>
                  <button
                    type="button"
                    onClick={handleWipeHabits}
                    className="border-2 border-ink hover:bg-paper-dark text-ink font-mono text-xs font-bold p-2.5 uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Clear All Habits
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Specific Tasks management */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <h3 className="font-sans font-black uppercase text-sm tracking-tight border-b-2 border-ink pb-2">SPECIFIC TASK LEDGER</h3>
              {tasks.length === 0 ? (
                <p className="text-center py-6 font-serif italic text-ink-light">Zero dispatches archived in Database stack.</p>
              ) : (
                <div className="space-y-2.5">
                  {tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="border-2 border-ink p-3 bg-white flex justify-between items-start gap-4 hover:shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-shadow"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase select-none px-1.5 py-0.5 border ${
                            task.priority === 'urgent' ? 'bg-subway-red text-white' : 'bg-taxi text-ink'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="font-mono text-[9.5px] font-bold text-ink-light">
                            ID: {task.id}
                          </span>
                        </div>
                        <h4 className="font-sans font-extrabold uppercase text-sm leading-tight text-ink">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="font-serif text-xs italic text-ink-light leading-snug line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-ink-light hover:text-subway-red p-1.5 border border-transparent hover:border-ink/20 rounded transition-all cursor-pointer"
                        title="Delete Specific Record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Specific Habits management */}
          {activeTab === 'habits' && (
            <div className="space-y-4">
              <h3 className="font-sans font-black uppercase text-sm tracking-tight border-b-2 border-ink pb-2">DAILY DISCIPLINES & STREAKS</h3>
              {habits.length === 0 ? (
                <p className="text-center py-6 font-serif italic text-ink-light">Zero habits monitored in Database stack.</p>
              ) : (
                <div className="space-y-2.5">
                  {habits.map((habit) => (
                    <div 
                      key={habit.id} 
                      className="border-2 border-ink p-3 bg-white flex justify-between items-center gap-4 hover:shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-shadow"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#FAF8F5] text-ink border border-ink text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase flex items-center gap-1">
                            <Award size={10} /> Streak: {habit.streak}
                          </span>
                          <span className="font-mono text-[9.5px] font-bold text-ink-light">
                            ID: {habit.id}
                          </span>
                        </div>
                        <h4 className="font-sans font-extrabold uppercase text-sm leading-tight text-ink">
                          {habit.name}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="text-ink-light hover:text-subway-red p-1.5 border border-transparent hover:border-ink/20 rounded transition-all cursor-pointer"
                        title="Delete Specific Discipline"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info stamp */}
        <div className="border-t-4 border-ink p-3 bg-ink text-[#CCCCCC] font-mono text-[9px] uppercase tracking-wider flex justify-between items-center select-none">
          <span>Daily Docket Engine: V1.0.0</span>
          <span className="text-taxi">STABLE INTEGRAL PERSISTENCE LAYER</span>
        </div>

      </div>
    </div>
  );
}
