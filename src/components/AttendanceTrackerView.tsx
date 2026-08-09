import React, { useState, useMemo } from 'react';
import { 
  TimeTableEntry, 
  AttendanceRecord, 
  SemesterConfig, 
  SubjectManualAttendance, 
  AttendanceStatus 
} from '../types';
import { 
  calculateAttendanceStats, 
  getClassesForDate 
} from '../lib/attendanceUtils';
import { 
  Check, 
  X, 
  Ban, 
  CalendarDays, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  RotateCcw, 
  Plus, 
  Minus, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  Sparkles, 
  CheckCircle2,
  Trash2,
  BookOpen,
  Clock,
  MapPin,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  History,
  GraduationCap
} from 'lucide-react';
import { cn, toIST } from '../lib/utils';
import { format, parseISO, addDays, isBefore, isAfter } from 'date-fns';

interface AttendanceTrackerViewProps {
  entries: TimeTableEntry[];
  semesterConfig: SemesterConfig;
  attendanceRecords: AttendanceRecord[];
  subjectManualAttendance: Record<string, SubjectManualAttendance>;
  onUpdateSemesterConfig: (config: Partial<SemesterConfig>) => void;
  onMarkAttendance: (
    date: string, 
    subject: string, 
    status: AttendanceStatus, 
    timeTableEntryId?: string, 
    note?: string,
    code?: string,
    component?: string
  ) => void;
  onMarkDayAll: (date: string, status: AttendanceStatus) => void;
  onQuickAdjust: (subject: string, deltaPresent: number, deltaAbsent: number) => void;
  onDeleteRecord: (id: string) => void;
  onResetToSample?: () => void;
  onClearAll?: () => void;
  initialSelectedDate?: string;
}

export function AttendanceTrackerView({
  entries,
  semesterConfig,
  attendanceRecords,
  subjectManualAttendance,
  onUpdateSemesterConfig,
  onMarkAttendance,
  onMarkDayAll,
  onQuickAdjust,
  onDeleteRecord,
  onResetToSample,
  onClearAll,
  initialSelectedDate
}: AttendanceTrackerViewProps) {
  const todayStr = format(toIST(new Date()), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate || todayStr);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'daily' | 'history'>('overview');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');

  // Calculate live statistics
  const { subjectStats, totalStats } = useMemo(() => {
    return calculateAttendanceStats(
      entries,
      attendanceRecords,
      semesterConfig,
      subjectManualAttendance
    );
  }, [entries, attendanceRecords, semesterConfig, subjectManualAttendance]);

  // Scheduled classes for currently selected date
  const classesForSelectedDate = useMemo(() => {
    return getClassesForDate(selectedDate, entries, attendanceRecords);
  }, [selectedDate, entries, attendanceRecords]);

  // Formatted date header for selected day
  const formattedSelectedDate = useMemo(() => {
    try {
      const d = parseISO(selectedDate);
      return format(d, 'EEEE, dd MMMM yyyy');
    } catch (e) {
      return selectedDate;
    }
  }, [selectedDate]);

  // Filter history records
  const filteredHistoryRecords = useMemo(() => {
    return attendanceRecords
      .filter(r => {
        if (selectedSubjectFilter !== 'ALL' && r.subject !== selectedSubjectFilter) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, selectedSubjectFilter]);

  // Quick step date back or forward
  const stepDate = (deltaDays: number) => {
    try {
      const current = parseISO(selectedDate);
      const nextDate = addDays(current, deltaDays);
      setSelectedDate(format(nextDate, 'yyyy-MM-dd'));
    } catch (e) {
      setSelectedDate(todayStr);
    }
  };

  // 12-hour format helper
  const format12Hour = (time24: string) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const minStr = m.toString().padStart(2, '0');
    return `${hour12}:${minStr} ${period}`;
  };

  return (
    <div className="flex flex-col space-y-4">
      
      {/* ------------------------------------------------------------- */}
      {/* TOP CONFIGURATION & SEMESTER START DATE BAR                   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-paper border-[3px] border-ink p-3 shadow-[4px_4px_0px_#1A1A1B] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-ink text-paper px-2 py-1 rounded-3xs font-mono text-[9px] font-black uppercase">
            <Calendar size={13} className="text-taxi" />
            <span>SEM START:</span>
          </div>

          <input
            type="date"
            value={semesterConfig.startDate}
            onChange={e => {
              if (e.target.value) {
                onUpdateSemesterConfig({ startDate: e.target.value });
              }
            }}
            className="bg-white border-2 border-ink px-2 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0px_#1A1A1B] focus:outline-none focus:ring-2 focus:ring-taxi cursor-pointer"
            title="Set official first day of semester"
          />

          <div className="hidden sm:flex items-center gap-1 bg-paper-dark border border-ink/40 px-2 py-1 font-mono text-[8.5px] font-bold text-ink/80">
            <span>WEEK {totalStats.weeksCompleted}</span>
            <span className="text-ink/30">•</span>
            <span>DAY {totalStats.daysCompleted} ELAPSED</span>
          </div>

          <div className="flex items-center gap-1 bg-taxi/20 border border-ink/40 px-2 py-1 font-mono text-[8.5px] font-black text-ink">
            <span>TARGET: {semesterConfig.minAttendancePercent}% MIN</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={cn(
              "px-2.5 py-1 font-mono text-[9px] uppercase font-black border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer",
              isConfigOpen ? "bg-taxi text-ink" : "bg-paper hover:bg-stone-100 text-ink"
            )}
          >
            <SlidersHorizontal size={11} />
            <span>{isConfigOpen ? 'CLOSE SETTINGS' : 'SEMESTER SETTINGS'}</span>
          </button>
        </div>
      </div>

      {/* EXPANDABLE SETTINGS PANEL */}
      {isConfigOpen && (
        <div className="bg-paper-dark border-[3px] border-ink p-4 shadow-[4px_4px_0px_#1A1A1B] space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-ink/20 pb-2">
            <h4 className="font-sans font-black text-xs uppercase tracking-tight text-ink flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-subway-red" />
              <span>SEMESTER ATTENDANCE CRITERIA CONFIGURATION</span>
            </h4>
            <span className="font-mono text-[8px] font-bold text-ink/60 uppercase">
              CUSTOMIZE ACADEMIC THRESHOLDS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Semester Start Date */}
            <div className="space-y-1">
              <label className="block font-mono text-[8.5px] font-black uppercase text-ink/70">
                SEMESTER START DATE:
              </label>
              <input
                type="date"
                value={semesterConfig.startDate}
                onChange={e => e.target.value && onUpdateSemesterConfig({ startDate: e.target.value })}
                className="w-full bg-paper border-2 border-ink px-2.5 py-1.5 font-mono text-xs font-bold uppercase focus:outline-none focus:bg-white"
              />
              <div className="flex gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => onUpdateSemesterConfig({ startDate: format(addDays(toIST(new Date()), -30), 'yyyy-MM-dd') })}
                  className="px-1.5 py-0.5 bg-paper border border-ink/40 font-mono text-[7.5px] uppercase font-bold hover:bg-taxi"
                >
                  1 Mo Ago
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSemesterConfig({ startDate: format(addDays(toIST(new Date()), -60), 'yyyy-MM-dd') })}
                  className="px-1.5 py-0.5 bg-paper border border-ink/40 font-mono text-[7.5px] uppercase font-bold hover:bg-taxi"
                >
                  2 Mo Ago
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSemesterConfig({ startDate: todayStr })}
                  className="px-1.5 py-0.5 bg-paper border border-ink/40 font-mono text-[7.5px] uppercase font-bold hover:bg-taxi"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Minimum Required Attendance % */}
            <div className="space-y-1">
              <label className="block font-mono text-[8.5px] font-black uppercase text-ink/70">
                REQUIRED MINIMUM ATTENDANCE %:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={semesterConfig.minAttendancePercent}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 10 && val <= 100) {
                      onUpdateSemesterConfig({ minAttendancePercent: val });
                    }
                  }}
                  className="w-24 bg-paper border-2 border-ink px-2.5 py-1.5 font-mono text-xs font-black focus:outline-none focus:bg-white"
                />
                <span className="font-mono text-xs font-black text-ink">%</span>
              </div>
              <div className="flex gap-1 pt-1">
                {[70, 75, 80, 85].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onUpdateSemesterConfig({ minAttendancePercent: pct })}
                    className={cn(
                      "px-2 py-0.5 border font-mono text-[8px] uppercase font-black transition-colors",
                      semesterConfig.minAttendancePercent === pct
                        ? "bg-ink text-paper border-ink"
                        : "bg-paper text-ink border-ink/40 hover:border-ink"
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Semester Name / Label */}
            <div className="space-y-1">
              <label className="block font-mono text-[8.5px] font-black uppercase text-ink/70">
                SEMESTER LABEL:
              </label>
              <input
                type="text"
                value={semesterConfig.name || ''}
                placeholder="e.g. 5th Semester B.Tech"
                onChange={e => onUpdateSemesterConfig({ name: e.target.value })}
                className="w-full bg-paper border-2 border-ink px-2.5 py-1.5 font-mono text-xs font-bold uppercase focus:outline-none focus:bg-white"
              />
              <p className="font-mono text-[7.5px] text-ink/50 uppercase font-bold pt-1">
                Used in attendance reports & statistics
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* OVERALL ATTENDANCE SUMMARY HERO CARD (TOTAL TILL DATE)       */}
      {/* ------------------------------------------------------------- */}
      <div className={cn(
        "p-4 sm:p-5 border-[4px] border-ink shadow-[6px_6px_0px_#1A1A1B] text-ink transition-colors",
        totalStats.isEligible ? "bg-emerald-50/70" : "bg-red-50/70"
      )}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Left Column: Big Percentage & Status Badge */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[9px] font-black uppercase px-2 py-0.5 bg-ink text-paper rounded-3xs">
                TOTAL ATTENDANCE TILL DATE
              </span>
              {totalStats.isEligible ? (
                <span className="flex items-center gap-1 font-mono text-[9px] font-black uppercase bg-emerald-200 text-emerald-950 border border-emerald-700 px-2 py-0.5 rounded-3xs">
                  <ShieldCheck size={12} className="text-emerald-800" />
                  <span>ON TRACK (ELIGIBLE FOR EXAMS &gt;= {totalStats.minPercent}%)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-[9px] font-black uppercase bg-subway-red text-white border border-ink px-2 py-0.5 rounded-3xs animate-pulse">
                  <ShieldAlert size={12} className="text-white" />
                  <span>ATTENDANCE SHORTAGE RISK (&lt; {totalStats.minPercent}%)</span>
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className={cn(
                "font-sans font-black text-4xl sm:text-5xl uppercase tracking-tighter leading-none",
                totalStats.isEligible ? "text-emerald-900" : "text-subway-red"
              )}>
                {totalStats.percentage}%
              </h2>
              <div className="font-mono text-xs sm:text-sm font-black text-ink uppercase tracking-tight">
                {totalStats.present} / {totalStats.totalConducted} <span className="text-ink/60 font-bold text-[11px]">CLASSES ATTENDED</span>
              </div>
            </div>

            {/* Smart Bunk Allowance / Required Classes Note */}
            <div className="font-mono text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 pt-0.5">
              {totalStats.isEligible ? (
                <div className="text-emerald-950 bg-emerald-200/70 border border-emerald-600 px-2 py-0.5 rounded-3xs flex items-center gap-1">
                  <TrendingUp size={13} className="text-emerald-800" />
                  <span>
                    🎉 YOU CAN SAFELY BUNK UP TO <strong className="font-black underline">{totalStats.safeBunks} CLASSES</strong> OVERALL &amp; REMAIN ABOVE {totalStats.minPercent}%
                  </span>
                </div>
              ) : (
                <div className="text-white bg-subway-red border border-ink px-2 py-0.5 rounded-3xs flex items-center gap-1">
                  <AlertTriangle size={13} className="text-taxi" />
                  <span>
                    ⚠️ ATTEND NEXT <strong className="font-black underline">{totalStats.classesNeeded} CONSECUTIVE CLASSES</strong> TO REACH {totalStats.minPercent}% CRITERIA
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Breakdown Chips & Quick Log Shortcut */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 w-full lg:w-auto">
            <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
              <div className="bg-paper border-2 border-ink p-2 text-center shadow-[2px_2px_0px_#1A1A1B]">
                <div className="font-mono text-[7.5px] uppercase font-bold text-ink/60">PRESENT</div>
                <div className="font-sans font-black text-base text-emerald-700">{totalStats.present}</div>
              </div>
              <div className="bg-paper border-2 border-ink p-2 text-center shadow-[2px_2px_0px_#1A1A1B]">
                <div className="font-mono text-[7.5px] uppercase font-bold text-ink/60">ABSENT</div>
                <div className="font-sans font-black text-base text-subway-red">{totalStats.absent}</div>
              </div>
              <div className="bg-paper border-2 border-ink p-2 text-center shadow-[2px_2px_0px_#1A1A1B]">
                <div className="font-mono text-[7.5px] uppercase font-bold text-ink/60">OFF/CANCELLED</div>
                <div className="font-sans font-black text-base text-stone-600">{totalStats.cancelled}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 w-full justify-between lg:justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setActiveSubTab('daily');
                }}
                className="px-3 py-1.5 bg-taxi text-ink font-mono text-[9px] font-black uppercase border-2 border-ink shadow-[2.5px_2.5px_0px_#1A1A1B] hover:bg-white active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarDays size={12} strokeWidth={2.5} />
                <span>MARK TODAY'S ATTENDANCE ({todayStr})</span>
              </button>
            </div>
          </div>

        </div>

        {/* Global Visual Progress Bar with 75% target pin */}
        <div className="mt-4 pt-3 border-t border-ink/20 space-y-1">
          <div className="flex justify-between font-mono text-[8px] font-black uppercase text-ink/60">
            <span>0%</span>
            <span className="text-subway-red font-black">CRITERIA: {totalStats.minPercent}%</span>
            <span>100%</span>
          </div>
          <div className="relative w-full h-3.5 bg-paper border-2 border-ink shadow-inner overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                totalStats.percentage >= totalStats.minPercent ? "bg-emerald-500" : "bg-subway-red"
              )}
              style={{ width: `${Math.min(100, Math.max(0, totalStats.percentage))}%` }}
            />
            {/* Target 75% indicator line */}
            <div
              className="absolute top-0 bottom-0 w-[3px] bg-ink z-10"
              style={{ left: `${totalStats.minPercent}%` }}
              title={`Minimum Required Threshold: ${totalStats.minPercent}%`}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB NAVIGATOR (OVERVIEW vs DAILY LOGGER vs HISTORY)       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b-2 border-ink gap-2 flex-wrap pt-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={cn(
              "px-3.5 py-1.5 font-mono text-[9.5px] uppercase font-black border-2 border-b-0 border-ink transition-all cursor-pointer",
              activeSubTab === 'overview'
                ? "bg-paper text-ink shadow-[2px_-2px_0px_#1A1A1B] translate-y-[2px]"
                : "bg-paper-dark/60 text-ink/60 hover:text-ink"
            )}
          >
            📊 SUBJECT MATRIX ({subjectStats.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('daily')}
            className={cn(
              "px-3.5 py-1.5 font-mono text-[9.5px] uppercase font-black border-2 border-b-0 border-ink transition-all cursor-pointer flex items-center gap-1",
              activeSubTab === 'daily'
                ? "bg-taxi text-ink shadow-[2px_-2px_0px_#1A1A1B] translate-y-[2px]"
                : "bg-paper-dark/60 text-ink/60 hover:text-ink"
            )}
          >
            <CalendarDays size={12} strokeWidth={2.5} />
            <span>DAILY ATTENDANCE LOG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={cn(
              "px-3.5 py-1.5 font-mono text-[9.5px] uppercase font-black border-2 border-b-0 border-ink transition-all cursor-pointer flex items-center gap-1",
              activeSubTab === 'history'
                ? "bg-paper text-ink shadow-[2px_-2px_0px_#1A1A1B] translate-y-[2px]"
                : "bg-paper-dark/60 text-ink/60 hover:text-ink"
            )}
          >
            <History size={12} />
            <span>HISTORY LOGS ({attendanceRecords.length})</span>
          </button>
        </div>

        <div className="font-mono text-[8px] font-bold text-ink/60 uppercase pb-1">
          LIVE TILL: {todayStr}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: SUBJECT-BY-SUBJECT BREAKDOWN MATRIX                     */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'overview' && (
        <div className="space-y-3">
          {subjectStats.length === 0 ? (
            <div className="p-8 text-center bg-paper border-2 border-ink space-y-2">
              <GraduationCap size={32} className="mx-auto text-ink/40" />
              <div className="font-sans font-black text-base uppercase text-ink">NO SUBJECTS REGISTERED</div>
              <p className="font-mono text-[9.5px] text-ink/60 uppercase">
                Add slots in the Schedule Matrix tab or import from Excel to track subject-wise attendance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subjectStats.map(stat => {
                const isShortage = stat.percentage < totalStats.minPercent && stat.totalConducted > 0;
                
                return (
                  <div
                    key={stat.subject}
                    className={cn(
                      "bg-paper border-[3px] border-ink p-3.5 shadow-[4px_4px_0px_#1A1A1B] flex flex-col justify-between space-y-3 relative overflow-hidden",
                      isShortage && "bg-red-50/40"
                    )}
                    style={{ borderLeftColor: stat.color, borderLeftWidth: '7px' }}
                  >
                    {/* Top Row: Subject Name & Badges */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {stat.code && (
                            <span className="font-mono text-[8px] font-black uppercase bg-ink text-paper px-1.5 py-0.2 rounded-3xs">
                              {stat.code}
                            </span>
                          )}
                          {stat.component && (
                            <span 
                              className="font-mono text-[8px] font-black uppercase text-white px-1.5 py-0.2 rounded-3xs shadow-3xs"
                              style={{ backgroundColor: stat.color }}
                            >
                              {stat.component}
                            </span>
                          )}
                          <span className="font-mono text-[7.5px] font-bold text-ink/50 uppercase">
                            {stat.scheduledWeeklyCount} slots/wk
                          </span>
                        </div>

                        {/* Status Chip */}
                        {stat.totalConducted === 0 ? (
                          <span className="font-mono text-[7.5px] font-bold uppercase bg-stone-100 text-stone-600 px-1.5 py-0.2 border border-ink/20">
                            UNTRACKED
                          </span>
                        ) : isShortage ? (
                          <span className="font-mono text-[7.5px] font-black uppercase bg-subway-red text-white px-1.5 py-0.2 border border-ink flex items-center gap-0.5">
                            <AlertTriangle size={9} />
                            <span>SHORTAGE ({stat.classesNeeded} NEEDED)</span>
                          </span>
                        ) : (
                          <span className="font-mono text-[7.5px] font-black uppercase bg-emerald-100 text-emerald-950 px-1.5 py-0.2 border border-emerald-600 flex items-center gap-0.5">
                            <Check size={9} />
                            <span>SAFE ({stat.safeBunks} CAN BUNK)</span>
                          </span>
                        )}
                      </div>

                      {/* Subject Name */}
                      <h4 className="font-sans font-black text-sm uppercase tracking-tight text-ink leading-snug">
                        {stat.subject}
                      </h4>

                      {stat.venue && (
                        <div className="font-mono text-[7.5px] font-bold text-ink/60 uppercase flex items-center gap-1">
                          <MapPin size={9} className="text-subway-red" />
                          <span className="truncate">{stat.venue}</span>
                        </div>
                      )}
                    </div>

                    {/* Middle: Attendance Numbers & Progress Bar */}
                    <div className="space-y-1.5 pt-1 border-t border-ink/10">
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-baseline gap-1.5">
                          <span className={cn(
                            "font-sans font-black text-2xl uppercase leading-none",
                            isShortage ? "text-subway-red" : "text-emerald-800"
                          )}>
                            {stat.percentage}%
                          </span>
                          <span className="font-mono text-[9px] font-black text-ink uppercase">
                            ({stat.present}/{stat.totalConducted} classes)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[8px] font-bold text-ink/60">
                          <span className="text-emerald-700 font-black">{stat.present}P</span>
                          <span>/</span>
                          <span className="text-subway-red font-black">{stat.absent}A</span>
                          {stat.cancelled > 0 && (
                            <>
                              <span>/</span>
                              <span className="text-stone-500">{stat.cancelled}Off</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative w-full h-2.5 bg-paper-dark border border-ink/40 overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-200",
                            stat.percentage >= totalStats.minPercent ? "bg-emerald-500" : "bg-subway-red"
                          )}
                          style={{ width: `${Math.min(100, Math.max(0, stat.percentage))}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-ink/70"
                          style={{ left: `${totalStats.minPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom: Quick Adjustment Buttons (+Present / +Absent) */}
                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-ink/20 gap-2">
                      <div className="font-mono text-[7.5px] font-black text-ink/50 uppercase">
                        QUICK ADJUST:
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onQuickAdjust(stat.subject, 1, 0)}
                          className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-700 font-mono text-[8px] font-black uppercase rounded-3xs shadow-2xs active:translate-y-0.5 cursor-pointer flex items-center gap-0.5"
                          title="Add 1 Present to total"
                        >
                          <Plus size={9} />
                          <span>1 PRESENT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onQuickAdjust(stat.subject, 0, 1)}
                          className="px-2 py-1 bg-red-100 hover:bg-red-200 text-subway-red border border-red-700 font-mono text-[8px] font-black uppercase rounded-3xs shadow-2xs active:translate-y-0.5 cursor-pointer flex items-center gap-0.5"
                          title="Add 1 Absent to total"
                        >
                          <Plus size={9} />
                          <span>1 ABSENT</span>
                        </button>

                        {(subjectManualAttendance[stat.subject]?.extraPresent > 0 || subjectManualAttendance[stat.subject]?.extraAbsent > 0) && (
                          <button
                            type="button"
                            onClick={() => onQuickAdjust(stat.subject, -1, 0)}
                            className="px-1.5 py-1 bg-stone-100 text-ink/70 hover:text-ink border border-ink/30 font-mono text-[7.5px] font-bold uppercase rounded-3xs"
                            title="Undo extra adjustment"
                          >
                            <RotateCcw size={9} />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DAILY ATTENDANCE MARKER                                */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'daily' && (
        <div className="bg-paper border-[3px] border-ink p-4 shadow-[5px_5px_0px_#1A1A1B] space-y-4">
          
          {/* Date Selector Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-paper-dark p-3 border-2 border-ink">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => stepDate(-1)}
                className="p-1.5 bg-paper hover:bg-taxi text-ink border-2 border-ink shadow-[1.5px_1.5px_0px_#1A1A1B] active:translate-y-0.5 cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>

              <div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-subway-red" />
                  <span className="font-sans font-black text-sm uppercase tracking-tight text-ink">
                    {formattedSelectedDate}
                  </span>
                  {selectedDate === todayStr && (
                    <span className="px-1.5 py-0.2 bg-taxi text-ink font-mono text-[7.5px] font-black uppercase border border-ink rounded-3xs">
                      TODAY
                    </span>
                  )}
                </div>
                <div className="font-mono text-[8px] font-bold text-ink/60 uppercase">
                  SCHEDULED CLASSES: {classesForSelectedDate.length} SLOTS REGISTERED
                </div>
              </div>

              <button
                type="button"
                onClick={() => stepDate(1)}
                className="p-1.5 bg-paper hover:bg-taxi text-ink border-2 border-ink shadow-[1.5px_1.5px_0px_#1A1A1B] active:translate-y-0.5 cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Pick Date & Bulk Mark Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={selectedDate}
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                className="bg-white border-2 border-ink px-2 py-1 font-mono text-xs font-bold uppercase cursor-pointer"
              />

              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={cn(
                  "px-2 py-1 font-mono text-[8.5px] font-black uppercase border-2 border-ink transition-colors cursor-pointer",
                  selectedDate === todayStr ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-taxi"
                )}
              >
                TODAY
              </button>

              {classesForSelectedDate.length > 0 && (
                <div className="flex items-center gap-1 pl-2 border-l border-ink/30">
                  <button
                    type="button"
                    onClick={() => onMarkDayAll(selectedDate, 'present')}
                    className="px-2.5 py-1 bg-emerald-400 hover:bg-emerald-300 text-ink font-mono text-[8.5px] font-black uppercase border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] active:translate-y-0.5 cursor-pointer flex items-center gap-1"
                  >
                    <Check size={11} strokeWidth={3} />
                    <span>MARK ALL PRESENT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onMarkDayAll(selectedDate, 'absent')}
                    className="px-2.5 py-1 bg-rose-400 hover:bg-rose-300 text-ink font-mono text-[8.5px] font-black uppercase border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] active:translate-y-0.5 cursor-pointer flex items-center gap-1"
                  >
                    <X size={11} strokeWidth={3} />
                    <span>MARK ALL ABSENT</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Classes Scheduled for Selected Date */}
          {classesForSelectedDate.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-ink/30 space-y-2 bg-paper">
              <Calendar size={28} className="mx-auto text-ink/30" />
              <div className="font-sans font-black text-sm uppercase text-ink/70">
                NO CLASSES SCHEDULED FOR THIS DAY OF THE WEEK
              </div>
              <p className="font-mono text-[8.5px] font-bold text-ink/50 uppercase">
                Choose a different weekday or register class slots for this day in the Schedule Matrix tab.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {classesForSelectedDate.map(({ entry, record, status }) => {
                return (
                  <div
                    key={entry.id}
                    className="bg-paper border-2 border-ink p-3 shadow-[3px_3px_0px_#1A1A1B] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors"
                    style={{ borderLeftColor: entry.color, borderLeftWidth: '6px' }}
                  >
                    {/* Left: Class Time & Info */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[8px] font-black uppercase bg-ink text-paper px-1.5 py-0.2 rounded-3xs">
                          {format12Hour(entry.startTime)} – {format12Hour(entry.endTime)}
                        </span>
                        {entry.code && (
                          <span className="font-mono text-[8px] font-black uppercase bg-stone-100 text-ink/80 px-1.5 py-0.2 border border-ink/20 rounded-3xs">
                            {entry.code}
                          </span>
                        )}
                        <span 
                          className="font-mono text-[7.5px] font-black uppercase text-white px-1.5 py-0.2 rounded-3xs shadow-3xs"
                          style={{ backgroundColor: entry.color }}
                        >
                          {entry.component || entry.type || 'Lecture'}
                        </span>
                      </div>

                      <h4 className="font-sans font-black text-sm uppercase text-ink">
                        {entry.subject}
                      </h4>

                      <div className="flex items-center gap-3 font-mono text-[8px] font-bold text-ink/60 uppercase">
                        <span className="flex items-center gap-1">
                          <MapPin size={9} className="text-subway-red" />
                          <span>{entry.venue}</span>
                        </span>
                        {entry.instructor && (
                          <span>• Prof. {entry.instructor}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Interactive 3-Way Attendance Selector */}
                    <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                      
                      {/* Present Button */}
                      <button
                        type="button"
                        onClick={() => onMarkAttendance(selectedDate, entry.subject, 'present', entry.id, undefined, entry.code, entry.component)}
                        className={cn(
                          "px-3 py-1.5 font-mono text-[9px] font-black uppercase border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer",
                          status === 'present'
                            ? "bg-emerald-500 text-white ring-2 ring-ink"
                            : "bg-paper hover:bg-emerald-100 text-emerald-950"
                        )}
                      >
                        <Check size={12} strokeWidth={3} />
                        <span>PRESENT</span>
                      </button>

                      {/* Absent Button */}
                      <button
                        type="button"
                        onClick={() => onMarkAttendance(selectedDate, entry.subject, 'absent', entry.id, undefined, entry.code, entry.component)}
                        className={cn(
                          "px-3 py-1.5 font-mono text-[9px] font-black uppercase border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer",
                          status === 'absent'
                            ? "bg-subway-red text-white ring-2 ring-ink"
                            : "bg-paper hover:bg-rose-100 text-rose-950"
                        )}
                      >
                        <X size={12} strokeWidth={3} />
                        <span>ABSENT</span>
                      </button>

                      {/* Cancelled / Off Button */}
                      <button
                        type="button"
                        onClick={() => onMarkAttendance(selectedDate, entry.subject, 'cancelled', entry.id, undefined, entry.code, entry.component)}
                        className={cn(
                          "px-2 py-1.5 font-mono text-[8.5px] font-bold uppercase border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] active:translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer",
                          status === 'cancelled'
                            ? "bg-stone-700 text-white ring-2 ring-ink"
                            : "bg-paper hover:bg-stone-200 text-ink/60"
                        )}
                        title="Class was cancelled by professor or holiday (does not count against percentage)"
                      >
                        <Ban size={10} />
                        <span>CANCELLED</span>
                      </button>

                      {status !== 'unmarked' && record && (
                        <button
                          type="button"
                          onClick={() => onDeleteRecord(record.id)}
                          className="p-1 text-ink/30 hover:text-subway-red cursor-pointer"
                          title="Remove logged status"
                        >
                          <RotateCcw size={11} />
                        </button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: ATTENDANCE HISTORY LOGS                                */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'history' && (
        <div className="bg-paper border-[3px] border-ink p-4 shadow-[5px_5px_0px_#1A1A1B] space-y-3">
          
          {/* Header with subject filter */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-ink/20 pb-2">
            <div>
              <h4 className="font-sans font-black text-xs uppercase tracking-tight text-ink">
                ATTENDANCE LOG HISTORY
              </h4>
              <p className="font-mono text-[8px] font-bold text-ink/60 uppercase">
                {filteredHistoryRecords.length} LOGGED SESSIONS FROM SEMESTER START ({semesterConfig.startDate})
              </p>
            </div>

            {/* Subject Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[8px] font-black uppercase text-ink/60">FILTER:</span>
              <select
                value={selectedSubjectFilter}
                onChange={e => setSelectedSubjectFilter(e.target.value)}
                className="bg-paper border-2 border-ink px-2 py-1 font-mono text-[9px] font-black uppercase cursor-pointer"
              >
                <option value="ALL">ALL SUBJECTS</option>
                {subjectStats.map(s => (
                  <option key={s.subject} value={s.subject}>{s.subject}</option>
                ))}
              </select>
            </div>
          </div>

          {/* History Records List */}
          {filteredHistoryRecords.length === 0 ? (
            <div className="p-6 text-center text-ink/40 font-mono text-[9px] uppercase font-bold">
              NO ATTENDANCE RECORDS LOGGED YET
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
              {filteredHistoryRecords.map(rec => (
                <div
                  key={rec.id}
                  className="bg-paper-dark border border-ink/30 p-2.5 flex justify-between items-center gap-2 text-xs hover:border-ink transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[8.5px] font-black uppercase bg-ink text-paper px-1.5 py-0.2 rounded-3xs">
                      {rec.date}
                    </span>

                    <span className="font-sans font-black text-xs uppercase text-ink">
                      {rec.subject}
                    </span>

                    {rec.code && (
                      <span className="font-mono text-[7.5px] font-bold text-ink/60 uppercase">
                        ({rec.code})
                      </span>
                    )}

                    {rec.note && (
                      <span className="font-mono text-[8px] text-ink/70 italic">
                        "{rec.note}"
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 font-mono text-[8px] font-black uppercase rounded-3xs border",
                      rec.status === 'present' && "bg-emerald-100 text-emerald-950 border-emerald-600",
                      rec.status === 'absent' && "bg-rose-100 text-subway-red border-red-600",
                      rec.status === 'cancelled' && "bg-stone-200 text-stone-700 border-stone-400"
                    )}>
                      {rec.status.toUpperCase()}
                    </span>

                    <button
                      type="button"
                      onClick={() => onDeleteRecord(rec.id)}
                      className="p-1 text-ink/40 hover:text-subway-red cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
