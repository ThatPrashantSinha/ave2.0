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
import { AttendanceStatusSymbol } from './AttendanceStatusSymbol';
import { 
  CalendarDays, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  MapPin, 
  TrendingUp, 
  Info, 
  Calendar, 
  History, 
  GraduationCap,
  RotateCw,
  Clock,
  BookOpen
} from 'lucide-react';
import { cn, toIST } from '../lib/utils';
import { format, parseISO, addDays } from 'date-fns';

interface AttendanceTrackerViewProps {
  entries: TimeTableEntry[];
  semesterConfig: SemesterConfig;
  attendanceRecords: AttendanceRecord[];
  subjectManualAttendance?: Record<string, SubjectManualAttendance>;
  onUpdateSemesterConfig: (config: Partial<SemesterConfig>) => void;
  onMarkAttendance?: (
    date: string, 
    subject: string, 
    status: AttendanceStatus, 
    timeTableEntryId?: string, 
    note?: string,
    code?: string,
    component?: string
  ) => void;
  onMarkDayAll?: (date: string, status: AttendanceStatus) => void;
  onQuickAdjust?: (subject: string, deltaPresent: number, deltaAbsent: number) => void;
  onDeleteRecord?: (id: string) => void;
  onResetToSample?: () => void;
  onClearAll?: () => void;
  initialSelectedDate?: string;
}

export function AttendanceTrackerView({
  entries,
  semesterConfig,
  attendanceRecords,
  onUpdateSemesterConfig,
  initialSelectedDate
}: AttendanceTrackerViewProps) {
  const todayStr = format(toIST(new Date()), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate || todayStr);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'daily' | 'history'>('overview');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');

  // Calculate live statistics strictly from calendar records
  const { subjectStats, totalStats } = useMemo(() => {
    return calculateAttendanceStats(
      entries,
      attendanceRecords,
      semesterConfig,
      {}
    );
  }, [entries, attendanceRecords, semesterConfig]);

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
    return (attendanceRecords || [])
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
      {/* TOP CONFIGURATION & AUTO-SYNC STATUS BAR                      */}
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

        {/* Action Controls & Sync Status */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-950 border-2 border-emerald-700 px-2.5 py-1 rounded-3xs font-mono text-[8.5px] font-black uppercase shadow-[1.5px_1.5px_0px_#1A1A1B]">
            <RotateCw size={11} className="text-emerald-800" />
            <span>CALENDAR SYNCED (READ ONLY)</span>
          </div>

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

      {/* INFORMATIVE SYNC CALLOUT */}
      <div className="bg-taxi/20 border-2 border-ink p-2.5 shadow-[2px_2px_0px_#1A1A1B] flex items-center gap-2.5">
        <Info size={16} className="text-subway-red shrink-0" />
        <p className="font-mono text-[9px] font-bold text-ink uppercase leading-snug">
          Attendance in this matrix is calculated strictly from classes logged in your <strong>Weekly Calendar</strong>. To record or update attendance, open your calendar and click any class slot directly.
        </p>
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
                  className="px-1.5 py-0.5 bg-paper border border-ink/40 font-mono text-[7.5px] uppercase font-bold hover:bg-taxi cursor-pointer"
                >
                  1 Mo Ago
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSemesterConfig({ startDate: format(addDays(toIST(new Date()), -60), 'yyyy-MM-dd') })}
                  className="px-1.5 py-0.5 bg-paper border border-ink/40 font-mono text-[7.5px] uppercase font-bold hover:bg-taxi cursor-pointer"
                >
                  2 Mo Ago
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSemesterConfig({ startDate: todayStr })}
                  className="px-1.5 py-0.5 bg-paper border border-ink/40 font-mono text-[7.5px] uppercase font-bold hover:bg-taxi cursor-pointer"
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
                      "px-2 py-0.5 border font-mono text-[8px] uppercase font-black transition-colors cursor-pointer",
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

          {/* Right Column: Breakdown Chips */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 w-full lg:w-auto">
            <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto">
              <div className="bg-paper border-2 border-ink p-2 text-center shadow-[2px_2px_0px_#1A1A1B]">
                <div className="font-mono text-[7.5px] uppercase font-bold text-ink/60">PRESENT</div>
                <div className="font-sans font-black text-base text-emerald-700">{totalStats.present}</div>
              </div>
              <div className="bg-paper border-2 border-ink p-2 text-center shadow-[2px_2px_0px_#1A1A1B]">
                <div className="font-mono text-[7.5px] uppercase font-bold text-ink/60">ABSENT</div>
                <div className="font-sans font-black text-base text-subway-red">{totalStats.absent}</div>
              </div>
              <div className="bg-paper border-2 border-ink p-2 text-center shadow-[2px_2px_0px_#1A1A1B]">
                <div className="font-mono text-[7.5px] uppercase font-bold text-ink/60">OFF/CANCEL</div>
                <div className="font-sans font-black text-base text-stone-600">{totalStats.cancelled}</div>
              </div>
              <div className="bg-paper border-2 border-ink p-2 text-center shadow-[2px_2px_0px_#1A1A1B]">
                <div className="font-mono text-[7.5px] uppercase font-bold text-ink/60">TOTAL LOGS</div>
                <div className="font-sans font-black text-base text-ink">{attendanceRecords.length}</div>
              </div>
            </div>
          </div>

        </div>

        {/* Global Visual Progress Bar with target criteria pin */}
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
            {/* Target criteria indicator line */}
            <div
              className="absolute top-0 bottom-0 w-[3px] bg-ink z-10"
              style={{ left: `${totalStats.minPercent}%` }}
              title={`Minimum Required Threshold: ${totalStats.minPercent}%`}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB NAVIGATOR                                             */}
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
            <span>DAY-BY-DAY SCHEDULE &amp; STATUS</span>
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

        <div className="font-mono text-[8px] font-bold text-ink/60 uppercase pb-1 flex items-center gap-1">
          <RotateCw size={10} className="text-emerald-700" />
          <span>AUTO-SYNCED TILL: {todayStr}</span>
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
                Add slots in the Timetable tab or import from Excel to track subject-wise attendance.
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
                          <span className="px-1.5 py-0.2 bg-stone-100 text-ink/60 border border-ink/30 rounded-3xs font-mono text-[7.5px] font-bold uppercase">
                            NO LOGS YET
                          </span>
                        ) : stat.percentage >= totalStats.minPercent ? (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-950 border border-emerald-600 rounded-3xs font-mono text-[7.5px] font-black uppercase flex items-center gap-0.5">
                            <ShieldCheck size={10} className="text-emerald-700" />
                            <span>SAFE ({stat.safeBunks} CAN BUNK)</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-rose-100 text-subway-red border border-red-600 rounded-3xs font-mono text-[7.5px] font-black uppercase flex items-center gap-0.5">
                            <ShieldAlert size={10} className="text-subway-red" />
                            <span>NEED {stat.classesNeeded} CLASSES</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-sans font-black text-base uppercase text-ink tracking-tight leading-snug">
                        {stat.subject}
                      </h3>

                      {stat.venue && (
                        <div className="flex items-center gap-1 font-mono text-[8px] text-ink/60 uppercase font-bold">
                          <MapPin size={10} className="text-subway-red shrink-0" />
                          <span className="truncate">{stat.venue}</span>
                        </div>
                      )}
                    </div>

                    {/* Middle: Live Percentage & Numbers */}
                    <div className="space-y-1.5 bg-paper-dark border border-ink/20 p-2.5 rounded-xs">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <span className={cn(
                            "font-sans font-black text-2xl uppercase",
                            stat.totalConducted === 0 ? "text-ink/60" : stat.percentage >= totalStats.minPercent ? "text-emerald-800" : "text-subway-red"
                          )}>
                            {stat.totalConducted === 0 ? '—' : `${stat.percentage}%`}
                          </span>
                          <span className="font-mono text-[9px] font-bold text-ink/75 uppercase">
                            ({stat.present}/{stat.totalConducted} classes)
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase">
                          <span className="text-emerald-700">{stat.present}P</span>
                          <span className="text-ink/30">•</span>
                          <span className="text-subway-red">{stat.absent}A</span>
                          {stat.cancelled > 0 && (
                            <>
                              <span className="text-ink/30">•</span>
                              <span className="text-stone-500">{stat.cancelled}Off</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="relative w-full h-2 bg-paper border border-ink/30 overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            stat.percentage >= totalStats.minPercent ? "bg-emerald-500" : "bg-subway-red"
                          )}
                          style={{ width: `${Math.min(100, Math.max(0, stat.percentage))}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom: Read-only breakdown note */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-ink/20 font-mono text-[8px] uppercase text-ink/60">
                      <span>{stat.scheduledWeeklyCount} weekly slots</span>
                      <span className="font-bold text-ink/80">{stat.present} attended • {stat.absent} missed</span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DAY-BY-DAY SCHEDULE & STATUS (READ-ONLY)               */}
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

            {/* Quick Pick Date */}
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
                  "px-2.5 py-1 font-mono text-[8.5px] font-black uppercase border-2 border-ink transition-colors cursor-pointer",
                  selectedDate === todayStr ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-taxi"
                )}
              >
                TODAY
              </button>
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
                Choose a different weekday or register class slots for this day in the Timetable Schedule tab.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {classesForSelectedDate.map(({ entry, status }) => {
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

                    {/* Right: Read-Only Synced Status Badge */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                      {status === 'present' && (
                        <div className="flex items-center gap-1.5 bg-emerald-100 border-2 border-emerald-700 text-emerald-950 px-3 py-1.5 rounded-3xs font-mono text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_#1A1A1B]">
                          <AttendanceStatusSymbol status="present" size="sm" />
                          <span>PRESENT</span>
                        </div>
                      )}
                      {status === 'absent' && (
                        <div className="flex items-center gap-1.5 bg-rose-100 border-2 border-rose-700 text-subway-red px-3 py-1.5 rounded-3xs font-mono text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_#1A1A1B]">
                          <AttendanceStatusSymbol status="absent" size="sm" />
                          <span>ABSENT</span>
                        </div>
                      )}
                      {status === 'cancelled' && (
                        <div className="flex items-center gap-1.5 bg-stone-200 border-2 border-stone-600 text-stone-800 px-3 py-1.5 rounded-3xs font-mono text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_#1A1A1B]">
                          <AttendanceStatusSymbol status="cancelled" size="sm" />
                          <span>CANCELLED</span>
                        </div>
                      )}
                      {status === 'unmarked' && (
                        <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-600 text-amber-950 px-3 py-1.5 rounded-3xs font-mono text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_#1A1A1B]">
                          <AttendanceStatusSymbol status="unmarked" size="sm" />
                          <span>NOT LOGGED</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 bg-paper-dark border border-ink/20 rounded-xs flex items-center justify-between gap-2 text-ink/70 font-mono text-[8.5px] uppercase font-bold">
            <span className="flex items-center gap-1">
              <Info size={12} className="text-subway-red" />
              <span>To mark or change attendance for these classes, open the <strong>Weekly Calendar</strong>.</span>
            </span>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: ATTENDANCE HISTORY LOGS (READ-ONLY)                    */}
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
                {filteredHistoryRecords.length} LOGGED SESSIONS SYNCED FROM WEEKLY CALENDAR
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
              NO ATTENDANCE RECORDS LOGGED YET. LOG CLASSES IN THE WEEKLY CALENDAR TO SEE THEM HERE.
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

                  <div className="flex items-center gap-1.5">
                    <AttendanceStatusSymbol status={rec.status} size="xs" />
                    <span className={cn(
                      "px-2 py-0.5 font-mono text-[8px] font-black uppercase rounded-3xs border",
                      rec.status === 'present' && "bg-emerald-100 text-emerald-950 border-emerald-600",
                      rec.status === 'absent' && "bg-rose-100 text-subway-red border-red-600",
                      rec.status === 'cancelled' && "bg-stone-200 text-stone-700 border-stone-400"
                    )}>
                      {rec.status.toUpperCase()}
                    </span>
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
