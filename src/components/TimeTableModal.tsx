import React, { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { 
  TimeTableEntry, 
  ClassType, 
  SemesterConfig, 
  AttendanceRecord, 
  SubjectManualAttendance, 
  AttendanceStatus 
} from '../types';
import { AttendanceTrackerView } from './AttendanceTrackerView';
import { 
  calculateAttendanceStats, 
  DEFAULT_SEMESTER_CONFIG 
} from '../lib/attendanceUtils';
import { 
  GraduationCap, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  MapPin, 
  User, 
  BookOpen, 
  FileText, 
  RotateCcw, 
  Copy, 
  Search, 
  Filter, 
  Check, 
  CalendarDays, 
  Info, 
  ArrowRight,
  FileSpreadsheet,
  Download,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Building,
  Award,
  Layers,
  Hash,
  Compass,
  TrendingUp,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { cn, toIST } from '../lib/utils';
import { 
  parseExcelToTimetable, 
  downloadTimetableTemplate, 
  exportTimetableToExcel, 
  ParseResult, 
  DAY_NAMES, 
  DAY_SHORTS 
} from '../lib/excelTimeTable';

export const TIMETABLE_COLORS = [
  { name: 'Subway Red', hex: '#EF4444', bg: 'bg-red-500', lightBg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700' },
  { name: 'Cobalt Blue', hex: '#2563EB', bg: 'bg-blue-600', lightBg: 'bg-blue-50', border: 'border-blue-600', text: 'text-blue-700' },
  { name: 'Emerald Jade', hex: '#059669', bg: 'bg-emerald-600', lightBg: 'bg-emerald-50', border: 'border-emerald-600', text: 'text-emerald-700' },
  { name: 'Amber Gold', hex: '#D97706', bg: 'bg-amber-600', lightBg: 'bg-amber-50', border: 'border-amber-600', text: 'text-amber-700' },
  { name: 'Violet Purple', hex: '#7C3AED', bg: 'bg-purple-600', lightBg: 'bg-purple-50', border: 'border-purple-600', text: 'text-purple-700' },
  { name: 'Cyan Teal', hex: '#0891B2', bg: 'bg-cyan-600', lightBg: 'bg-cyan-50', border: 'border-cyan-600', text: 'text-cyan-700' },
  { name: 'Rose Crimson', hex: '#E11D48', bg: 'bg-rose-600', lightBg: 'bg-rose-50', border: 'border-rose-600', text: 'text-rose-700' },
  { name: 'Indigo Night', hex: '#4F46E5', bg: 'bg-indigo-600', lightBg: 'bg-indigo-50', border: 'border-indigo-600', text: 'text-indigo-700' },
  { name: 'Forest Green', hex: '#15803D', bg: 'bg-green-700', lightBg: 'bg-green-50', border: 'border-green-700', text: 'text-green-700' },
  { name: 'Burnt Rust', hex: '#C2410C', bg: 'bg-orange-700', lightBg: 'bg-orange-50', border: 'border-orange-700', text: 'text-orange-700' },
  { name: 'Deep Slate', hex: '#475569', bg: 'bg-slate-600', lightBg: 'bg-slate-50', border: 'border-slate-600', text: 'text-slate-700' },
  { name: 'Taxi Mustard', hex: '#CA8A04', bg: 'bg-yellow-600', lightBg: 'bg-yellow-50', border: 'border-yellow-600', text: 'text-yellow-800' },
];

const DAYS = [
  { id: 1, name: 'Monday', short: 'MON', letter: 'M' },
  { id: 2, name: 'Tuesday', short: 'TUE', letter: 'T' },
  { id: 3, name: 'Wednesday', short: 'WED', letter: 'W' },
  { id: 4, name: 'Thursday', short: 'THU', letter: 'T' },
  { id: 5, name: 'Friday', short: 'FRI', letter: 'F' },
  { id: 6, name: 'Saturday', short: 'SAT', letter: 'S' },
  { id: 0, name: 'Sunday', short: 'SUN', letter: 'S' },
];

const CLASS_TYPES: ClassType[] = ['Lecture', 'Lab', 'Tutorial', 'Seminar', 'Workshop', 'Other'];

interface TimeTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: TimeTableEntry[];
  addEntry: (entry: Omit<TimeTableEntry, 'id'>) => void;
  updateEntry: (entry: TimeTableEntry) => void;
  deleteEntry: (id: string) => void;
  resetToSample: () => void;
  importEntries?: (newEntries: TimeTableEntry[], replace: boolean) => void;
  
  // Attendance System Props
  semesterConfig?: SemesterConfig;
  attendanceRecords?: AttendanceRecord[];
  subjectManualAttendance?: Record<string, SubjectManualAttendance>;
  onUpdateSemesterConfig?: (config: Partial<SemesterConfig>) => void;
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
  onDeleteAttendanceRecord?: (id: string) => void;
  onResetAttendanceToSample?: () => void;
  onClearAllAttendance?: () => void;
  initialTab?: 'schedule' | 'attendance';
}

export function TimeTableModal({
  isOpen,
  onClose,
  entries,
  addEntry,
  updateEntry,
  deleteEntry,
  resetToSample,
  importEntries,
  semesterConfig = DEFAULT_SEMESTER_CONFIG,
  attendanceRecords = [],
  subjectManualAttendance = {},
  onUpdateSemesterConfig,
  onMarkAttendance,
  onMarkDayAll,
  onQuickAdjust,
  onDeleteAttendanceRecord,
  onResetAttendanceToSample,
  onClearAllAttendance,
  initialTab = 'schedule'
}: TimeTableModalProps) {
  const [activeMainTab, setActiveMainTab] = useState<'schedule' | 'attendance'>(initialTab);
  const [selectedEntry, setSelectedEntry] = useState<TimeTableEntry | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showWeekend, setShowWeekend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string | null>(null);

  // Live Attendance Calculations
  const { subjectStats, totalStats: totalAttendanceStats } = useMemo(() => {
    return calculateAttendanceStats(
      entries,
      attendanceRecords,
      semesterConfig,
      subjectManualAttendance
    );
  }, [entries, attendanceRecords, semesterConfig, subjectManualAttendance]);

  // Excel import states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExcelPreviewOpen, setIsExcelPreviewOpen] = useState(false);
  const [parsedExcelResult, setParsedExcelResult] = useState<ParseResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [excelError, setExcelError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [notificationToast, setNotificationToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Form State
  const [formSubject, setFormSubject] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formInstructor, setFormInstructor] = useState('');
  const [formType, setFormType] = useState<ClassType>('Lecture');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:50');
  const [formDays, setFormDays] = useState<number[]>([1]); // default Monday
  const [formColor, setFormColor] = useState(TIMETABLE_COLORS[0].hex);
  const [formNotes, setFormNotes] = useState('');
  const [formCredits, setFormCredits] = useState<string>('');
  const [formBucket, setFormBucket] = useState<string>('');
  const [formComponent, setFormComponent] = useState<string>('');
  const [formCoordinator, setFormCoordinator] = useState<string>('');
  const [formDepartment, setFormDepartment] = useState<string>('');
  const [formTimeTableCode, setFormTimeTableCode] = useState<string>('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotificationToast({ message, type });
    setTimeout(() => {
      setNotificationToast(null);
    }, 4500);
  };

  const resetForm = () => {
    setFormSubject('');
    setFormCode('');
    setFormVenue('');
    setFormInstructor('');
    setFormType('Lecture');
    setFormStartTime('09:00');
    setFormEndTime('10:50');
    setFormDays([1]);
    setFormColor(TIMETABLE_COLORS[Math.floor(Math.random() * TIMETABLE_COLORS.length)].hex);
    setFormNotes('');
    setFormCredits('');
    setFormBucket('');
    setFormComponent('');
    setFormCoordinator('');
    setFormDepartment('');
    setFormTimeTableCode('');
    setEditingEntryId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddFormOpen(true);
    setSelectedEntry(null);
  };

  const handleOpenEdit = (entry: TimeTableEntry) => {
    setEditingEntryId(entry.id);
    setFormSubject(entry.subject);
    setFormCode(entry.code || '');
    setFormVenue(entry.venue);
    setFormInstructor(entry.instructor || '');
    setFormType(entry.type || 'Lecture');
    setFormStartTime(entry.startTime);
    setFormEndTime(entry.endTime);
    setFormDays([entry.dayOfWeek]);
    setFormColor(entry.color);
    setFormNotes(entry.notes || '');
    setFormCredits(entry.credits ? String(entry.credits) : '');
    setFormBucket(entry.bucket || '');
    setFormComponent(entry.component || '');
    setFormCoordinator(entry.coordinator || '');
    setFormDepartment(entry.department || '');
    setFormTimeTableCode(entry.timeTableCode || '');
    setIsAddFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim() || !formVenue.trim() || !formStartTime || !formEndTime) {
      return;
    }

    if (editingEntryId) {
      const existing = entries.find(item => item.id === editingEntryId);
      if (existing) {
        updateEntry({
          ...existing,
          subject: formSubject.trim(),
          code: formCode.trim() || undefined,
          venue: formVenue.trim(),
          instructor: formInstructor.trim() || undefined,
          type: formType,
          startTime: formStartTime,
          endTime: formEndTime,
          dayOfWeek: formDays[0] ?? existing.dayOfWeek,
          color: formColor,
          notes: formNotes.trim() || undefined,
          credits: formCredits.trim() || undefined,
          bucket: formBucket.trim() || undefined,
          component: formComponent.trim() || undefined,
          coordinator: formCoordinator.trim() || undefined,
          department: formDepartment.trim() || undefined,
          timeTableCode: formTimeTableCode.trim() || undefined,
        });
        showToast(`Updated "${formSubject.trim()}"`);
      }
    } else {
      formDays.forEach(day => {
        addEntry({
          subject: formSubject.trim(),
          code: formCode.trim() || undefined,
          venue: formVenue.trim(),
          instructor: formInstructor.trim() || undefined,
          type: formType,
          startTime: formStartTime,
          endTime: formEndTime,
          dayOfWeek: day,
          color: formColor,
          notes: formNotes.trim() || undefined,
          credits: formCredits.trim() || undefined,
          bucket: formBucket.trim() || undefined,
          component: formComponent.trim() || undefined,
          coordinator: formCoordinator.trim() || undefined,
          department: formDepartment.trim() || undefined,
          timeTableCode: formTimeTableCode.trim() || undefined,
        });
      });
      showToast(`Added ${formDays.length} class slot${formDays.length > 1 ? 's' : ''} for "${formSubject.trim()}"`);
    }

    setIsAddFormOpen(false);
    resetForm();
  };

  const handleDuplicateToDay = (entry: TimeTableEntry, targetDay: number) => {
    addEntry({
      subject: entry.subject,
      code: entry.code,
      venue: entry.venue,
      instructor: entry.instructor,
      type: entry.type,
      startTime: entry.startTime,
      endTime: entry.endTime,
      dayOfWeek: targetDay,
      color: entry.color,
      notes: entry.notes,
      credits: entry.credits,
      bucket: entry.bucket,
      component: entry.component,
      coordinator: entry.coordinator,
      department: entry.department,
      timeTableCode: entry.timeTableCode,
    });
    const targetDayName = DAYS.find(d => d.id === targetDay)?.name || 'Day';
    showToast(`Copied "${entry.subject}" to ${targetDayName}`);
  };

  // -------------------------------------------------------------
  // EXCEL IMPORT / EXPORT HANDLERS
  // -------------------------------------------------------------
  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    await processUploadedExcelFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processUploadedExcelFile = async (file: File) => {
    setExcelError(null);
    setUploadedFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelToTimetable(buffer);
      setParsedExcelResult(result);
      setIsExcelPreviewOpen(true);
    } catch (err: any) {
      console.error('Excel parse error:', err);
      setExcelError(err.message || 'Failed to parse Excel file. Please ensure it is a valid spreadsheet.');
      setIsExcelPreviewOpen(true);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedExcelResult || parsedExcelResult.entries.length === 0) return;

    if (importEntries) {
      importEntries(parsedExcelResult.entries, importMode === 'replace');
    } else {
      if (importMode === 'replace') {
        entries.forEach(e => deleteEntry(e.id));
      }
      parsedExcelResult.entries.forEach(e => {
        addEntry({
          subject: e.subject,
          code: e.code,
          venue: e.venue,
          instructor: e.instructor,
          type: e.type,
          startTime: e.startTime,
          endTime: e.endTime,
          dayOfWeek: e.dayOfWeek,
          color: e.color,
          notes: e.notes,
          credits: e.credits,
          bucket: e.bucket,
          component: e.component,
          coordinator: e.coordinator,
          department: e.department,
          timeTableCode: e.timeTableCode,
        });
      });
    }

    setIsExcelPreviewOpen(false);
    showToast(
      `Filled timetable with ${parsedExcelResult.entries.length} slots from "${uploadedFileName}"!`,
      'success'
    );
    setParsedExcelResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.name.endsWith('.csv')
      ) {
        await processUploadedExcelFile(file);
      } else {
        showToast('Please drop an Excel (.xlsx, .xls) or CSV file.', 'info');
      }
    }
  };

  // Determine current day and time
  const now = toIST(new Date());
  const currentDayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentTotalMins = currentHour * 60 + currentMin;

  // Filter days to display
  const displayedDays = useMemo(() => {
    if (showWeekend) {
      return DAYS;
    }
    // Monday (1) to Saturday (6)
    return DAYS.filter(d => d.id !== 0);
  }, [showWeekend]);

  // Unique subjects for quick filter tabs
  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, { subject: string; color: string; count: number; code?: string }>();
    entries.forEach(e => {
      const existing = map.get(e.subject);
      if (existing) {
        existing.count++;
      } else {
        map.set(e.subject, { subject: e.subject, color: e.color, count: 1, code: e.code });
      }
    });
    return Array.from(map.values());
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (activeSubjectFilter && e.subject !== activeSubjectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = e.subject.toLowerCase().includes(q);
        const matchVenue = e.venue.toLowerCase().includes(q);
        const matchCode = (e.code || '').toLowerCase().includes(q);
        const matchInstructor = (e.instructor || '').toLowerCase().includes(q);
        const matchDept = (e.department || '').toLowerCase().includes(q);
        const matchBucket = (e.bucket || '').toLowerCase().includes(q);
        if (!matchSubject && !matchVenue && !matchCode && !matchInstructor && !matchDept && !matchBucket) return false;
      }
      return true;
    });
  }, [entries, activeSubjectFilter, searchQuery]);

  // Today's classes
  const todayClasses = useMemo(() => {
    return entries
      .filter(e => e.dayOfWeek === currentDayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [entries, currentDayOfWeek]);

  // Upcoming next class today
  const nextClassToday = useMemo(() => {
    return todayClasses.find(c => {
      const [h, m] = c.startTime.split(':').map(Number);
      return h * 60 + m > currentTotalMins;
    }) || null;
  }, [todayClasses, currentTotalMins]);

  // Current active class right now
  const activeClassNow = useMemo(() => {
    return todayClasses.find(c => {
      const [sh, sm] = c.startTime.split(':').map(Number);
      const [eh, em] = c.endTime.split(':').map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      return currentTotalMins >= startMins && currentTotalMins < endMins;
    }) || null;
  }, [todayClasses, currentTotalMins]);

  // Calculate duration string helper
  const getDurationText = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const total = (eh * 60 + em) - (sh * 60 + sm);
    if (total <= 0) return '';
    const hrs = Math.floor(total / 60);
    const mins = total % 60;
    if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} min`;
    if (hrs > 0) return `${hrs} hr`;
    return `${mins} min`;
  };

  // Convert 24hr format to 12hr IST display (e.g. "09:00 AM", "01:30 PM")
  const format12Hour = (time24: string) => {
    if (!time24) return '';
    try {
      const [hStr, mStr] = time24.split(':');
      let h = parseInt(hStr, 10);
      if (isNaN(h)) return time24;
      const m = (mStr || '00').padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      const formattedHour = String(h).padStart(2, '0');
      return `${formattedHour}:${m} ${ampm}`;
    } catch (_) {
      return time24;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center font-sans p-2 sm:p-4 md:p-6 select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for Excel (.xlsx, .xls, .csv) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
        className="hidden"
        onChange={handleExcelFileSelect}
      />

      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-ink/75 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-4 z-[10030] bg-taxi/95 border-[6px] border-dashed border-ink flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150 shadow-[10px_10px_0px_#1A1A1B]">
          <div className="p-4 bg-ink text-taxi rounded-full border-4 border-ink shadow-[4px_4px_0px_#1A1A1B] mb-3">
            <FileSpreadsheet size={48} strokeWidth={2.5} />
          </div>
          <h3 className="font-sans font-black text-2xl uppercase tracking-tight text-ink">
            DROP EXCEL OR CSV TIMETABLE SHEET HERE
          </h3>
          <p className="font-mono text-xs uppercase font-bold text-ink/80 mt-1">
            Auto-extracts Course Code, Title, Day, Time, Resource Name & Faculty
          </p>
        </div>
      )}

      {/* Main Container */}
      <div className="relative w-full max-w-6xl bg-paper border-[6px] border-ink shadow-[8px_8px_0px_#1A1A1B] flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* TOP DOCKET HEADER */}
        <div className="bg-ink text-paper p-3 sm:p-4 border-b-[5px] border-taxi shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-taxi text-ink rounded-3xs border border-ink shadow-[1px_1px_0px_#1A1A1B]">
                <GraduationCap size={16} strokeWidth={2.5} />
              </span>
              <h2 className="font-sans font-black text-lg sm:text-xl uppercase tracking-tight text-paper flex items-center gap-2 leading-none">
                COLLEGE TIME TABLE MATRIX
              </h2>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest font-bold text-taxi mt-1">
              WEEKLY ACADEMIC SCHEDULE & VENUE DIRECTORY // {entries.length} SLOTS REGISTERED
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            
            {/* ⭐ PRIMARY EXCEL IMPORT BUTTON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-emerald-400 text-ink hover:bg-white hover:text-ink font-mono text-[9.5px] uppercase font-black border-2 border-ink shadow-[2.5px_2.5px_0px_#1A1A1B] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer group"
              title="Fill all timetable slots automatically from an Excel (.xlsx / .xls) or CSV sheet"
            >
              <FileSpreadsheet size={14} strokeWidth={2.5} className="group-hover:rotate-6 transition-transform text-ink" />
              <span>FILL FROM EXCEL</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3 py-1.5 bg-taxi text-ink font-mono text-[9.5px] uppercase font-black border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] hover:bg-white hover:text-ink active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} strokeWidth={3} />
              ADD CLASS
            </button>

            <button
              type="button"
              onClick={() => setShowWeekend(!showWeekend)}
              className={cn(
                "px-2.5 py-1.5 font-mono text-[9px] uppercase font-black border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] transition-all cursor-pointer",
                showWeekend ? "bg-white text-ink" : "bg-paper-dark text-ink/75 hover:text-ink"
              )}
            >
              {showWeekend ? 'HIDE SUNDAY' : 'SHOW SUNDAY'}
            </button>

            <button
              type="button"
              onClick={downloadTimetableTemplate}
              className="p-1.5 bg-paper text-ink hover:bg-taxi hover:text-ink border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] transition-colors cursor-pointer"
              title="Download University Template (.xlsx)"
            >
              <Download size={14} />
            </button>

            <button
              type="button"
              onClick={() => exportTimetableToExcel(entries)}
              className="p-1.5 bg-paper text-ink hover:bg-emerald-400 hover:text-ink border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] transition-colors cursor-pointer"
              title="Export Current Schedule to Excel (.xlsx)"
            >
              <FileText size={14} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-paper hover:text-taxi cursor-pointer transition-colors ml-1"
              title="Close Timetable"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* NOTIFICATION BANNER */}
        {notificationToast && (
          <div className="bg-emerald-100 border-b-2 border-ink px-4 py-2 flex items-center justify-between text-emerald-950 font-mono text-[10px] font-black uppercase tracking-wider animate-in slide-in-from-top-2 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-700" />
              <span>{notificationToast.message}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setNotificationToast(null)} 
              className="text-emerald-900 hover:text-ink cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* TOP PRIMARY TABS: SCHEDULE MATRIX vs ATTENDANCE TRACKER */}
        <div className="bg-paper-dark border-b-[3px] border-ink px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveMainTab('schedule')}
              className={cn(
                "px-3 py-1.5 font-mono text-[10px] uppercase font-black border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer",
                activeMainTab === 'schedule'
                  ? "bg-ink text-paper"
                  : "bg-paper text-ink hover:bg-stone-100"
              )}
            >
              <Building size={13} className={activeMainTab === 'schedule' ? 'text-taxi' : 'text-subway-red'} />
              <span>1. TIMETABLE SCHEDULE ({entries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab('attendance')}
              className={cn(
                "px-3 py-1.5 font-mono text-[10px] uppercase font-black border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer",
                activeMainTab === 'attendance'
                  ? "bg-taxi text-ink"
                  : "bg-paper text-ink hover:bg-yellow-50"
              )}
            >
              <GraduationCap size={14} className="text-ink" strokeWidth={2.5} />
              <span>2. ATTENDANCE TRACKER &amp; STATS</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-3xs text-[8px] font-black border",
                totalAttendanceStats.percentage >= (semesterConfig?.minAttendancePercent || 75)
                  ? "bg-emerald-100 text-emerald-950 border-emerald-700"
                  : "bg-subway-red text-white border-ink animate-pulse"
              )}>
                {totalAttendanceStats.percentage}% TILL DATE
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-[8.5px] font-bold text-ink/75 uppercase">
            <span>SEM START: <strong className="font-black text-ink">{semesterConfig?.startDate || '2025-01-06'}</strong></span>
            <span>•</span>
            <span>CRITERIA: <strong className="font-black text-ink">{semesterConfig?.minAttendancePercent || 75}%</strong></span>
          </div>
        </div>

        {/* RENDER ACTIVE TAB: ATTENDANCE TRACKER VIEW */}
        {activeMainTab === 'attendance' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-paper-dark/30">
            <AttendanceTrackerView
              entries={entries}
              semesterConfig={semesterConfig || DEFAULT_SEMESTER_CONFIG}
              attendanceRecords={attendanceRecords || []}
              subjectManualAttendance={subjectManualAttendance || {}}
              onUpdateSemesterConfig={onUpdateSemesterConfig || (() => {})}
              onMarkAttendance={onMarkAttendance || (() => {})}
              onMarkDayAll={onMarkDayAll || (() => {})}
              onQuickAdjust={onQuickAdjust || (() => {})}
              onDeleteRecord={onDeleteAttendanceRecord || (() => {})}
              onResetToSample={onResetAttendanceToSample || (() => {})}
              onClearAll={onClearAllAttendance || (() => {})}
            />
          </div>
        )}

        {/* RENDER ACTIVE TAB: TIMETABLE SCHEDULE MATRIX */}
        {activeMainTab === 'schedule' && (
          <>
            {/* LIVE STATUS BAR: TODAY & NEXT CLASS BANNER */}
            <div className="bg-paper-dark border-b-2 border-ink px-3 py-2 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase font-bold text-ink">
              <CalendarDays size={13} className="text-subway-red" />
              <span>TODAY IS {DAYS.find(d => d.id === currentDayOfWeek)?.name.toUpperCase()}</span>
            </div>

            {activeClassNow ? (
              <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-950 border border-emerald-600 px-2 py-0.5 rounded-3xs font-mono text-[9px] font-black uppercase animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                <span>NOW IN SESSION: {activeClassNow.subject} ({format12Hour(activeClassNow.startTime)} – {format12Hour(activeClassNow.endTime)} IST) @ {activeClassNow.venue}</span>
              </div>
            ) : nextClassToday ? (
              <div className="flex items-center gap-1.5 bg-taxi/25 text-ink border border-ink/40 px-2 py-0.5 rounded-3xs font-mono text-[9px] font-bold uppercase">
                <Clock size={11} className="text-amber-700" />
                <span>NEXT UP TODAY: <strong className="font-black">{nextClassToday.subject}</strong> AT {format12Hour(nextClassToday.startTime)} ({nextClassToday.venue})</span>
              </div>
            ) : (
              <div className="text-ink/60 font-mono text-[9px] font-bold uppercase">
                NO MORE CLASSES SCHEDULED FOR TODAY
              </div>
            )}
          </div>

          {/* Quick Search and Subject Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <input
                type="text"
                placeholder="SEARCH SUBJECT / VENUE..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-paper border border-ink/40 pl-6 pr-2 py-0.5 font-mono text-[9px] uppercase font-bold focus:bg-white focus:outline-none focus:border-ink"
              />
              <Search size={10} className="absolute left-1.5 top-1.5 text-ink/50" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1 text-ink/50 hover:text-ink cursor-pointer"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {activeSubjectFilter && (
              <button
                type="button"
                onClick={() => setActiveSubjectFilter(null)}
                className="px-1.5 py-0.5 bg-ink text-paper font-mono text-[8px] uppercase font-black rounded-3xs flex items-center gap-1 cursor-pointer"
              >
                <span>FILTER: {activeSubjectFilter.slice(0, 10)}...</span>
                <X size={8} />
              </button>
            )}
          </div>
        </div>

        {/* SUBJECT PILL SELECTOR BAR */}
        {uniqueSubjects.length > 0 && (
          <div className="bg-paper border-b border-ink/20 px-3 py-1.5 shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="font-mono text-[8px] uppercase font-black text-ink/50 shrink-0 flex items-center gap-1">
              <Filter size={9} /> SUBJECTS ({uniqueSubjects.length}):
            </span>
            <button
              type="button"
              onClick={() => setActiveSubjectFilter(null)}
              className={cn(
                "px-2 py-0.5 font-mono text-[8px] uppercase font-black border transition-all cursor-pointer shrink-0 rounded-3xs",
                activeSubjectFilter === null
                  ? "bg-ink text-white border-ink shadow-2xs"
                  : "bg-paper-dark text-ink/70 border-ink/20 hover:border-ink hover:text-ink"
              )}
            >
              ALL
            </button>
            {uniqueSubjects.map(sub => (
              <button
                key={sub.subject}
                type="button"
                onClick={() => setActiveSubjectFilter(activeSubjectFilter === sub.subject ? null : sub.subject)}
                className={cn(
                  "px-2 py-0.5 font-mono text-[8px] uppercase font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 rounded-3xs",
                  activeSubjectFilter === sub.subject
                    ? "bg-ink text-white border-ink shadow-2xs font-black"
                    : "bg-paper text-ink/80 border-ink/20 hover:border-ink hover:text-ink"
                )}
              >
                <span 
                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                  style={{ backgroundColor: sub.color }} 
                />
                <span className="truncate max-w-[120px]">{sub.subject}</span>
                <span className="font-mono text-[7px] opacity-60">({sub.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* MAIN BODY: SCHEDULE GRID OR EMPTY STATE */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-4 bg-paper-dark/40">
          
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-paper border-[4px] border-ink shadow-[6px_6px_0px_#1A1A1B] max-w-xl mx-auto my-6 space-y-4">
              <div className="p-4 bg-taxi text-ink rounded-full border-3 border-ink shadow-[3px_3px_0px_#1A1A1B]">
                <GraduationCap size={36} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-sans font-black text-xl uppercase tracking-tight text-ink">
                  NO TIMETABLE REGISTERED YET
                </h3>
                <p className="font-mono text-[10px] text-ink/75 uppercase font-bold mt-1 max-w-md">
                  Import your university schedule directly from an Excel spreadsheet or register your classes manually.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-emerald-400 text-ink font-mono text-[10.5px] uppercase font-black border-2 border-ink shadow-[3px_3px_0px_#1A1A1B] hover:bg-emerald-300 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2"
                >
                  <FileSpreadsheet size={15} strokeWidth={2.5} />
                  FILL FROM EXCEL SHEET (.XLSX)
                </button>

                <button
                  type="button"
                  onClick={downloadTimetableTemplate}
                  className="px-3.5 py-2 bg-paper text-ink font-mono text-[10px] uppercase font-black border-2 border-ink shadow-[2.5px_2.5px_0px_#1A1A1B] hover:bg-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download size={13} />
                  GET SAMPLE EXCEL TEMPLATE
                </button>

                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="px-3.5 py-2 bg-taxi text-ink font-mono text-[10px] uppercase font-black border-2 border-ink shadow-[2.5px_2.5px_0px_#1A1A1B] hover:bg-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={13} strokeWidth={3} />
                  ADD MANUALLY
                </button>

                <button
                  type="button"
                  onClick={resetToSample}
                  className="px-3.5 py-2 bg-paper text-ink/75 font-mono text-[10px] uppercase font-bold border border-ink/40 hover:text-ink hover:border-ink transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  LOAD DEMO TIMETABLE
                </button>
              </div>

              <div className="pt-3 border-t border-ink/20 text-ink/60 font-mono text-[9px] uppercase font-bold flex items-center gap-2">
                <UploadCloud size={14} className="text-emerald-700" />
                <span>You can also drag & drop your university .xlsx, .xls, or .csv file directly onto this screen</span>
              </div>
            </div>
          ) : (
            <div className="min-w-[760px] md:min-w-full bg-paper border-[4px] border-ink shadow-[5px_5px_0px_#1A1A1B] overflow-hidden">
              
              {/* Day Headers */}
              <div className="grid border-b-[4px] border-ink bg-ink text-paper" style={{ gridTemplateColumns: `repeat(${displayedDays.length}, minmax(0, 1fr))` }}>
                {displayedDays.map(day => {
                  const isToday = day.id === currentDayOfWeek;
                  const countForDay = filteredEntries.filter(e => e.dayOfWeek === day.id).length;

                  return (
                    <div
                      key={day.id}
                      className={cn(
                        "p-2.5 text-center border-r-2 border-paper/20 last:border-r-0 transition-colors",
                        isToday ? "bg-taxi text-ink font-black" : "bg-ink text-paper"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-sans font-black text-sm uppercase tracking-tight">
                          {day.name}
                        </span>
                        {isToday && (
                          <span className="bg-ink text-taxi px-1 py-0.2 rounded-3xs font-mono text-[7px] font-black uppercase">
                            TODAY
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[8px] opacity-75 uppercase font-bold mt-0.5">
                        {countForDay} {countForDay === 1 ? 'CLASS' : 'CLASSES'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Schedule Columns Grid */}
              <div className="grid divide-x-2 divide-ink bg-paper" style={{ gridTemplateColumns: `repeat(${displayedDays.length}, minmax(0, 1fr))` }}>
                {displayedDays.map(day => {
                  const isToday = day.id === currentDayOfWeek;
                  const dayEntries = filteredEntries
                    .filter(e => e.dayOfWeek === day.id)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <div
                      key={day.id}
                      className={cn(
                        "min-h-[480px] p-2 flex flex-col gap-2 transition-colors",
                        isToday ? "bg-taxi/5" : "bg-transparent"
                      )}
                    >
                      {/* Empty day prompt */}
                      {dayEntries.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-3 text-ink/25 font-mono text-[8.5px] uppercase border border-dashed border-ink/10 rounded my-2">
                          <span className="opacity-50">NO CLASSES</span>
                        </div>
                      ) : (
                        dayEntries.map(entry => {
                          const isSelected = selectedEntry?.id === entry.id;
                          const isEntryActiveNow = isToday && (() => {
                            const [sh, sm] = entry.startTime.split(':').map(Number);
                            const [eh, em] = entry.endTime.split(':').map(Number);
                            const startMins = sh * 60 + sm;
                            const endMins = eh * 60 + em;
                            return currentTotalMins >= startMins && currentTotalMins < endMins;
                          })();

                          return (
                            <div
                              key={entry.id}
                              onClick={() => setSelectedEntry(entry)}
                              className={cn(
                                "group relative border-2 border-ink p-2.5 cursor-pointer transition-all duration-150 rounded-[2px] select-none text-left",
                                isSelected
                                  ? "ring-2 ring-ink shadow-[4px_4px_0px_#1A1A1B] -translate-y-1 scale-[1.02] z-20"
                                  : "shadow-[2px_2px_0px_#1A1A1B] hover:shadow-[3.5px_3.5px_0px_#1A1A1B] hover:-translate-y-0.5 z-10",
                                isEntryActiveNow && "ring-2 ring-emerald-500 animate-pulse"
                              )}
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderLeftWidth: '5px',
                                borderLeftColor: entry.color,
                              }}
                              title={`${entry.subject} (${format12Hour(entry.startTime)} – ${format12Hour(entry.endTime)} IST) @ ${entry.venue || 'Classroom'}`}
                            >
                              {/* Top accent bar indicator */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1 truncate max-w-[120px]">
                                  <span 
                                    className="font-mono text-[7px] font-black uppercase text-white px-1 py-0.2 rounded-3xs shadow-3xs truncate"
                                    style={{ backgroundColor: entry.color }}
                                  >
                                    {entry.component || entry.type || 'Class'}
                                  </span>
                                  {entry.code && (
                                    <span className="font-mono text-[7px] font-black uppercase bg-stone-100 text-ink/70 px-1 py-0.2 rounded-3xs border border-ink/20">
                                      {entry.code}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[7.5px] font-bold text-ink/75 shrink-0 bg-stone-100 px-1 py-0.2 rounded-3xs border border-ink/15">
                                  {format12Hour(entry.startTime)}
                                </span>
                              </div>

                              {/* SUBJECT NAME (Prominently displayed) */}
                              <div className="font-sans font-black text-xs sm:text-[13px] text-ink uppercase tracking-tight leading-snug py-0.5 break-words group-hover:text-subway-red transition-colors">
                                {entry.subject}
                              </div>

                              {/* IST Time Slot Badge */}
                              <div className="flex items-center gap-1 font-mono text-[7.5px] text-ink/70 font-bold mt-0.5">
                                <Clock size={9} className="text-subway-red shrink-0" strokeWidth={2.5} />
                                <span>{format12Hour(entry.startTime)} – {format12Hour(entry.endTime)}</span>
                              </div>

                              {/* Course Bucket Tag if available */}
                              {entry.bucket && (
                                <div className="font-mono text-[6.5px] font-bold text-ink/50 uppercase tracking-tight truncate mt-0.5">
                                  {entry.bucket}
                                </div>
                              )}

                              {/* Small prompt hint on hover */}
                              <div className="mt-1 pt-1 border-t border-dashed border-ink/10 flex justify-between items-center text-[7px] font-mono text-ink/40 group-hover:text-ink/80 font-bold">
                                <span>INSPECT VENUE</span>
                                <ArrowRight size={8} className="group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Quick add button for this specific day */}
                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setFormDays([day.id]);
                          setIsAddFormOpen(true);
                          setSelectedEntry(null);
                        }}
                        className="mt-auto py-1 border border-dashed border-ink/30 hover:border-ink hover:bg-white text-ink/40 hover:text-ink font-mono text-[7.5px] font-black uppercase rounded-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title={`Add class on ${day.name}`}
                      >
                        <Plus size={9} />
                        ADD SLOT
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
        </>
      )}

        {/* BOTTOM FOOTER TOOLBAR */}
        <div className="bg-paper border-t-[4px] border-ink p-3 flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
          <div className="flex items-center gap-3 text-ink/75 font-mono text-[9px] uppercase font-bold flex-wrap">
            <span className="flex items-center gap-1">
              <Info size={12} className="text-subway-red" />
              TIP: Click any subject card to inspect classroom venue, faculty & notes.
            </span>
            <span className="hidden md:inline text-ink/30">•</span>
            <span className="hidden md:inline text-emerald-800 font-black">
              📊 Excel Timetable Support Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetToSample}
              className="px-2.5 py-1 text-ink/60 hover:text-ink hover:bg-stone-100 border border-ink/30 font-mono text-[8.5px] font-black uppercase transition-colors cursor-pointer flex items-center gap-1"
              title="Reset sample college schedule"
            >
              <RotateCcw size={10} />
              RESET PRESETS
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1 bg-ink text-paper font-mono text-[9.5px] uppercase font-black hover:bg-taxi hover:text-ink border-2 border-ink transition-colors cursor-pointer"
            >
              DONE
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ⭐ EXCEL IMPORT PREVIEW & CONFIRMATION MODAL                   */}
        {/* ------------------------------------------------------------- */}
        {isExcelPreviewOpen && (
          <div className="fixed inset-0 z-[10025] flex items-center justify-center p-3 sm:p-4 bg-ink/75 backdrop-blur-2xs animate-in fade-in duration-150">
            <div 
              className="absolute inset-0" 
              onClick={() => setIsExcelPreviewOpen(false)} 
            />

            <div className="relative w-full max-w-4xl bg-paper border-[6px] border-ink shadow-[10px_10px_0px_#1A1A1B] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="bg-ink text-paper p-3.5 border-b-[5px] border-emerald-400 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-emerald-400 text-ink rounded-3xs border border-ink">
                    <FileSpreadsheet size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-sans font-black text-base uppercase tracking-tight text-paper">
                      EXCEL TIMETABLE IMPORT REVIEW
                    </h3>
                    <p className="font-mono text-[8.5px] font-bold text-emerald-300 uppercase">
                      FILE: {uploadedFileName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExcelPreviewOpen(false)}
                  className="text-paper hover:text-taxi cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-paper">
                
                {excelError ? (
                  <div className="p-4 bg-red-50 border-2 border-subway-red space-y-3">
                    <div className="flex items-center gap-2 text-subway-red font-mono font-black text-xs uppercase">
                      <AlertTriangle size={18} />
                      <span>COULD NOT PARSE EXCEL FILE</span>
                    </div>
                    <p className="font-sans font-bold text-xs text-ink">
                      {excelError}
                    </p>
                    <div className="p-3 bg-white border border-ink/20 font-mono text-[9.5px] text-ink/80 space-y-1">
                      <p className="font-bold text-ink uppercase">Expected Columns Supported:</p>
                      <p>• Course Title / Subject (e.g. Machine Learning)</p>
                      <p>• Course Code (e.g. CSN344)</p>
                      <p>• Day (e.g. Monday, Tuesday...)</p>
                      <p>• Time (e.g. 09:00 To 10:50, 11:00 To 11:50)</p>
                      <p>• Resource Name / Venue (e.g. Block - VEDANTA - VED5F 510 ComputerLab 5)</p>
                      <p>• Couse instructore / Instructor (e.g. Vaidhai Choudhary)</p>
                      <p>• Component (e.g. Practical-1, Lecture-1)</p>
                      <p>• Course Bucket, Credit, Coordinator, Dept/School</p>
                    </div>
                    <div className="pt-2 flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={downloadTimetableTemplate}
                        className="px-3 py-1.5 bg-taxi text-ink font-mono text-[9px] uppercase font-black border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download size={12} />
                        DOWNLOAD UNIVERSITY ERP TEMPLATE (.XLSX)
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-paper text-ink font-mono text-[9px] uppercase font-black border-2 border-ink flex items-center gap-1.5 cursor-pointer"
                      >
                        <UploadCloud size={12} />
                        TRY ANOTHER FILE
                      </button>
                    </div>
                  </div>
                ) : parsedExcelResult && (
                  <>
                    {/* Summary Badges Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-emerald-50 border-2 border-emerald-600 p-2.5 rounded-xs">
                        <div className="font-mono text-[8px] text-emerald-800 uppercase font-black">CLASSES DETECTED</div>
                        <div className="font-sans font-black text-2xl text-emerald-950">{parsedExcelResult.totalParsed}</div>
                        <div className="font-mono text-[7.5px] text-emerald-700 font-bold">Total slots mapped</div>
                      </div>

                      <div className="bg-paper-dark border-2 border-ink p-2.5 rounded-xs">
                        <div className="font-mono text-[8px] text-ink/60 uppercase font-black">SUBJECTS</div>
                        <div className="font-sans font-black text-2xl text-ink">{parsedExcelResult.uniqueSubjects}</div>
                        <div className="font-mono text-[7.5px] text-ink/60 font-bold">Distinct courses</div>
                      </div>

                      <div className="bg-paper-dark border-2 border-ink p-2.5 rounded-xs">
                        <div className="font-mono text-[8px] text-ink/60 uppercase font-black">DAYS COVERED</div>
                        <div className="font-sans font-black text-2xl text-ink">{parsedExcelResult.daysCovered}</div>
                        <div className="font-mono text-[7.5px] text-ink/60 font-bold">Active weekdays</div>
                      </div>

                      <div className="bg-taxi/20 border-2 border-ink p-2.5 rounded-xs">
                        <div className="font-mono text-[8px] text-ink/80 uppercase font-black">SHEET FORMAT</div>
                        <div className="font-sans font-black text-sm text-ink mt-1 uppercase">
                          {parsedExcelResult.mode === 'matrix' ? 'WEEKLY MATRIX' : 'UNIVERSITY ERP LIST'}
                        </div>
                        <div className="font-mono text-[7.5px] text-ink/60 font-bold">Auto-mapped format</div>
                      </div>
                    </div>

                    {/* Detected Column Headers Pill Tags */}
                    {parsedExcelResult.detectedColumns && parsedExcelResult.detectedColumns.length > 0 && (
                      <div className="bg-paper border border-ink/20 p-2 rounded-xs space-y-1">
                        <div className="font-mono text-[7.5px] uppercase font-black text-ink/60">
                          DETECTED EXCEL COLUMNS:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {parsedExcelResult.detectedColumns.map((col, idx) => (
                            <span key={idx} className="font-mono text-[7.5px] font-bold bg-stone-100 border border-ink/20 px-1.5 py-0.5 rounded-3xs text-ink/80 flex items-center gap-1">
                              <Check size={8} className="text-emerald-600 stroke-[3px]" />
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Import Mode Options (Replace vs Append) */}
                    <div className="bg-paper-dark border-2 border-ink p-3 rounded-xs space-y-2">
                      <div className="font-mono text-[8.5px] uppercase font-black text-ink flex items-center gap-1.5">
                        <span>IMPORT STRATEGY:</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label 
                          className={cn(
                            "p-2.5 border-2 cursor-pointer flex items-start gap-2.5 transition-all",
                            importMode === 'replace'
                              ? "bg-white border-ink shadow-[2px_2px_0px_#1A1A1B]"
                              : "bg-paper border-ink/30 opacity-75 hover:opacity-100"
                          )}
                        >
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'replace'}
                            onChange={() => setImportMode('replace')}
                            className="mt-0.5 accent-ink"
                          />
                          <div>
                            <div className="font-sans font-black text-xs uppercase text-ink">
                              FILL & REPLACE ALL ({parsedExcelResult.totalParsed} SLOTS)
                            </div>
                            <div className="font-mono text-[8px] text-ink/60 font-bold mt-0.5">
                              Clears previous timetable slots and sets exact university schedule from Excel.
                            </div>
                          </div>
                        </label>

                        <label 
                          className={cn(
                            "p-2.5 border-2 cursor-pointer flex items-start gap-2.5 transition-all",
                            importMode === 'append'
                              ? "bg-white border-ink shadow-[2px_2px_0px_#1A1A1B]"
                              : "bg-paper border-ink/30 opacity-75 hover:opacity-100"
                          )}
                        >
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'append'}
                            onChange={() => setImportMode('append')}
                            className="mt-0.5 accent-ink"
                          />
                          <div>
                            <div className="font-sans font-black text-xs uppercase text-ink">
                              APPEND TO EXISTING ({entries.length} CURRENT)
                            </div>
                            <div className="font-mono text-[8px] text-ink/60 font-bold mt-0.5">
                              Keeps your currently scheduled classes and adds new ones from this sheet.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Scrollable Preview Table */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center font-mono text-[8.5px] uppercase font-black text-ink/75">
                        <span>PREVIEW OF DETECTED CLASSES ({parsedExcelResult.entries.length}):</span>
                        <span className="text-emerald-700 font-bold">✓ Ready to Populate</span>
                      </div>

                      <div className="max-h-[260px] overflow-y-auto overflow-x-auto border-2 border-ink bg-white shadow-inner">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-ink text-paper font-mono text-[8px] uppercase font-black sticky top-0 z-10">
                            <tr>
                              <th className="p-2 border-r border-paper/20">Day</th>
                              <th className="p-2 border-r border-paper/20">Time (IST)</th>
                              <th className="p-2 border-r border-paper/20">Course Title & Code</th>
                              <th className="p-2 border-r border-paper/20">Component</th>
                              <th className="p-2 border-r border-paper/20">Resource Name (Venue)</th>
                              <th className="p-2 border-r border-paper/20">Instructor</th>
                              <th className="p-2">Bucket / Dept</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-ink/10 font-sans">
                            {parsedExcelResult.entries.map((item, idx) => (
                              <tr key={idx} className="hover:bg-stone-50 transition-colors">
                                <td className="p-2 font-mono text-[8.5px] font-black text-ink whitespace-nowrap">
                                  <span className="bg-ink/10 px-1.5 py-0.5 rounded-3xs border border-ink/20">
                                    {DAY_SHORTS[item.dayOfWeek]}
                                  </span>
                                </td>
                                <td className="p-2 font-mono text-[9px] font-bold text-ink/80 whitespace-nowrap">
                                  {format12Hour(item.startTime)} – {format12Hour(item.endTime)}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1.5">
                                    <span 
                                      className="w-2 h-2 rounded-full shrink-0" 
                                      style={{ backgroundColor: item.color }} 
                                    />
                                    <span className="font-bold text-ink uppercase text-[11px] truncate max-w-[160px]">
                                      {item.subject}
                                    </span>
                                    {item.code && (
                                      <span className="font-mono text-[7.5px] bg-stone-100 border border-ink/20 px-1 rounded-3xs text-ink/70">
                                        {item.code}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2 font-mono text-[8px] uppercase font-bold text-ink/70 whitespace-nowrap">
                                  {item.component || item.type}
                                  {item.credits && <span className="text-ink/40 ml-1">({item.credits} Cr)</span>}
                                </td>
                                <td className="p-2 font-sans font-bold text-[10px] text-ink/80 truncate max-w-[180px]" title={item.venue}>
                                  📍 {item.venue}
                                </td>
                                <td className="p-2 font-sans text-[10px] text-ink/60 truncate max-w-[120px]">
                                  {item.instructor || '—'}
                                </td>
                                <td className="p-2 font-mono text-[7.5px] text-ink/60 truncate max-w-[140px]">
                                  {item.bucket || item.department || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-paper-dark border-t-2 border-ink flex justify-between items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsExcelPreviewOpen(false)}
                  className="px-4 py-1.5 bg-paper hover:bg-stone-200 border-2 border-ink font-mono text-[9.5px] uppercase font-bold cursor-pointer"
                >
                  CANCEL
                </button>

                {parsedExcelResult && !excelError && (
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="px-6 py-2 bg-emerald-400 text-ink font-mono text-[10.5px] uppercase font-black border-2 border-ink shadow-[3px_3px_0px_#1A1A1B] hover:bg-emerald-300 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>FILL TIMETABLE NOW ({parsedExcelResult.totalParsed} CLASSES)</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUBJECT DETAIL POPOVER / INSPECTOR MODAL (WHEN CLICKED)       */}
        {/* ------------------------------------------------------------- */}
        {selectedEntry && !isAddFormOpen && (
          <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-2xs animate-in fade-in duration-150">
            <div 
              className="absolute inset-0" 
              onClick={() => setSelectedEntry(null)} 
            />

            <div 
              className="relative w-full max-w-lg bg-paper border-[5px] border-ink shadow-[8px_8px_0px_#1A1A1B] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
              style={{ borderTopColor: selectedEntry.color, borderTopWidth: '8px' }}
            >
              {/* Header */}
              <div className="p-3.5 bg-paper-dark border-b-2 border-ink flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span 
                      className="font-mono text-[8px] font-black uppercase text-white px-2 py-0.5 rounded-3xs shadow-xs"
                      style={{ backgroundColor: selectedEntry.color }}
                    >
                      {selectedEntry.component || selectedEntry.type || 'Lecture'}
                    </span>
                    {selectedEntry.code && (
                      <span className="font-mono text-[8px] font-black uppercase bg-ink text-paper px-1.5 py-0.5 rounded-3xs">
                        {selectedEntry.code}
                      </span>
                    )}
                    {selectedEntry.credits && (
                      <span className="font-mono text-[8px] font-black uppercase bg-emerald-100 text-emerald-950 border border-emerald-600 px-1.5 py-0.5 rounded-3xs">
                        {selectedEntry.credits} CREDITS
                      </span>
                    )}
                    <span className="font-mono text-[8px] font-black uppercase text-subway-red bg-subway-red/10 border border-subway-red/30 px-1.5 py-0.5 rounded-3xs">
                      EVERY {DAYS.find(d => d.id === selectedEntry.dayOfWeek)?.name.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-sans font-black text-xl text-ink uppercase tracking-tight leading-tight mt-1">
                    {selectedEntry.subject}
                  </h3>
                  {selectedEntry.bucket && (
                    <div className="font-mono text-[8.5px] uppercase font-bold text-ink/60">
                      Bucket: {selectedEntry.bucket}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="p-1 text-ink/70 hover:text-ink hover:bg-stone-200 border border-ink/30 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Details Body */}
              <div className="p-4 space-y-3.5 overflow-y-auto max-h-[65vh] bg-paper">
                
                {/* VENUE / RESOURCE NAME BOX */}
                <div className="bg-taxi/20 border-2 border-ink p-3 rounded-xs shadow-[2px_2px_0px_#1A1A1B] space-y-1">
                  <div className="flex items-center gap-1 text-subway-red font-mono text-[8.5px] uppercase font-black">
                    <MapPin size={13} strokeWidth={3} className="shrink-0" />
                    <span>RESOURCE NAME / CLASSROOM VENUE</span>
                  </div>
                  <div className="font-sans font-black text-sm sm:text-base uppercase text-ink pl-4 leading-snug">
                    {selectedEntry.venue}
                  </div>
                </div>

                {/* ATTENDANCE SUMMARY FOR THIS SUBJECT */}
                {(() => {
                  const subStat = subjectStats.find(s => s.subject.trim().toLowerCase() === selectedEntry.subject.trim().toLowerCase());
                  const todayDateStr = format(toIST(new Date()), 'yyyy-MM-dd');
                  const todayRec = attendanceRecords.find(r => r.date === todayDateStr && (r.timeTableEntryId === selectedEntry.id || r.subject === selectedEntry.subject));

                  return (
                    <div className="bg-paper border-2 border-ink p-3 rounded-xs shadow-[2px_2px_0px_#1A1A1B] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[8.5px] font-black uppercase text-ink flex items-center gap-1">
                          <GraduationCap size={12} className="text-subway-red" />
                          <span>ATTENDANCE STATUS TILL DATE</span>
                        </span>
                        {subStat && (
                          <span className={cn(
                            "font-sans font-black text-xs px-1.5 py-0.2 rounded-3xs border",
                            subStat.percentage >= (semesterConfig?.minAttendancePercent || 75)
                              ? "bg-emerald-100 text-emerald-950 border-emerald-600"
                              : "bg-rose-100 text-subway-red border-red-600"
                          )}>
                            {subStat.percentage}% ({subStat.present}/{subStat.totalConducted})
                          </span>
                        )}
                      </div>

                      {subStat && (
                        <div className="space-y-1">
                          <div className="relative w-full h-2 bg-paper-dark border border-ink/40 overflow-hidden">
                            <div
                              className={cn(
                                "h-full",
                                subStat.percentage >= (semesterConfig?.minAttendancePercent || 75) ? "bg-emerald-500" : "bg-subway-red"
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, subStat.percentage))}%` }}
                            />
                          </div>
                          <div className="font-mono text-[7.5px] font-bold text-ink/70 flex justify-between uppercase">
                            <span>{subStat.present} Present / {subStat.absent} Absent</span>
                            {subStat.percentage >= (semesterConfig?.minAttendancePercent || 75) ? (
                              <span className="text-emerald-700 font-black">Can bunk {subStat.safeBunks} more classes</span>
                            ) : (
                              <span className="text-subway-red font-black">Need next {subStat.classesNeeded} classes</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Quick Mark for Today */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-ink/20 gap-2">
                        <span className="font-mono text-[7.5px] font-black text-ink/60 uppercase">
                          TODAY'S STATUS:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onMarkAttendance?.(todayDateStr, selectedEntry.subject, 'present', selectedEntry.id, undefined, selectedEntry.code, selectedEntry.component)}
                            className={cn(
                              "px-2 py-0.5 font-mono text-[8px] font-black uppercase border border-ink rounded-3xs cursor-pointer active:translate-y-0.5 transition-colors",
                              todayRec?.status === 'present'
                                ? "bg-emerald-500 text-white"
                                : "bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
                            )}
                          >
                            ✓ PRESENT
                          </button>
                          <button
                            type="button"
                            onClick={() => onMarkAttendance?.(todayDateStr, selectedEntry.subject, 'absent', selectedEntry.id, undefined, selectedEntry.code, selectedEntry.component)}
                            className={cn(
                              "px-2 py-0.5 font-mono text-[8px] font-black uppercase border border-ink rounded-3xs cursor-pointer active:translate-y-0.5 transition-colors",
                              todayRec?.status === 'absent'
                                ? "bg-subway-red text-white"
                                : "bg-rose-50 text-subway-red hover:bg-rose-100"
                            )}
                          >
                            ✗ ABSENT
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Grid stats: Time & Faculty */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Time */}
                  <div className="bg-paper-dark border-2 border-ink p-2.5 rounded-xs space-y-0.5">
                    <div className="flex items-center gap-1 text-ink/60 font-mono text-[8px] uppercase font-bold">
                      <Clock size={11} />
                      <span>TIME INTERVAL (IST)</span>
                    </div>
                    <div className="font-mono font-black text-xs text-ink">
                      {format12Hour(selectedEntry.startTime)} – {format12Hour(selectedEntry.endTime)} IST
                    </div>
                    <div className="font-mono text-[8px] text-subway-red font-black">
                      Duration: {getDurationText(selectedEntry.startTime, selectedEntry.endTime)}
                    </div>
                  </div>

                  {/* Instructor */}
                  <div className="bg-paper-dark border-2 border-ink p-2.5 rounded-xs space-y-0.5">
                    <div className="flex items-center gap-1 text-ink/60 font-mono text-[8px] uppercase font-bold">
                      <User size={11} />
                      <span>COURSE INSTRUCTOR / PROF</span>
                    </div>
                    <div className="font-sans font-bold text-xs text-ink truncate">
                      {selectedEntry.instructor || 'Faculty TBA'}
                    </div>
                    <div className="font-mono text-[8px] text-ink/50 font-bold">
                      {selectedEntry.coordinator && selectedEntry.coordinator !== 'No Faculty' 
                        ? `Coordinator: ${selectedEntry.coordinator}`
                        : 'Academic Faculty'}
                    </div>
                  </div>

                </div>

                {/* Department & Timetable Code */}
                {(selectedEntry.department || selectedEntry.timeTableCode) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-stone-50 border border-ink/20 p-2 rounded-xs">
                    {selectedEntry.department && (
                      <div className="font-mono text-[8px] text-ink/80">
                        <span className="font-black uppercase text-ink/50 block">OFFERING DEPT / SCHOOL:</span>
                        <span className="font-bold">{selectedEntry.department}</span>
                      </div>
                    )}
                    {selectedEntry.timeTableCode && (
                      <div className="font-mono text-[8px] text-ink/80">
                        <span className="font-black uppercase text-ink/50 block">TIMETABLE CODE:</span>
                        <span className="font-bold">{selectedEntry.timeTableCode}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {selectedEntry.notes && (
                  <div className="border-2 border-ink bg-stone-50 p-2.5 rounded-xs space-y-1">
                    <div className="flex items-center gap-1 text-ink/60 font-mono text-[8px] uppercase font-bold">
                      <FileText size={11} />
                      <span>INSTRUCTIONS & NOTES</span>
                    </div>
                    <p className="font-mono text-[10px] text-ink/80 leading-relaxed font-bold">
                      {selectedEntry.notes}
                    </p>
                  </div>
                )}

                {/* Quick Duplicate to Other Days */}
                <div className="border border-ink/20 p-2.5 rounded-xs bg-paper-dark/60 space-y-1.5">
                  <span className="font-mono text-[8px] uppercase font-black text-ink/60 flex items-center gap-1">
                    <Copy size={10} /> REPLICATE TO OTHER WEEKDAY:
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map(d => {
                      if (d.id === selectedEntry.dayOfWeek) return null;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            handleDuplicateToDay(selectedEntry, d.id);
                            setSelectedEntry(null);
                          }}
                          className="px-2 py-0.5 bg-paper hover:bg-taxi text-ink border border-ink font-mono text-[8px] font-black uppercase shadow-2xs active:translate-y-0.5 cursor-pointer"
                          title={`Copy to ${d.name}`}
                        >
                          + {d.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-paper-dark border-t-2 border-ink flex justify-between items-center gap-2">
                {deleteConfirmId === selectedEntry.id ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <span className="font-mono text-[8.5px] font-black text-subway-red uppercase">CONFIRM?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteEntry(selectedEntry.id);
                        setSelectedEntry(null);
                        setDeleteConfirmId(null);
                      }}
                      className="px-2.5 py-1 bg-subway-red text-white border-2 border-ink font-mono text-[8.5px] font-black uppercase hover:bg-black cursor-pointer shadow-[1px_1px_0px_#1A1A1B]"
                    >
                      YES, DELETE
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2 py-1 bg-paper text-ink border-2 border-ink font-mono text-[8.5px] font-black uppercase cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(selectedEntry.id)}
                    className="p-1.5 text-ink/60 hover:text-subway-red hover:bg-red-50 border border-transparent hover:border-ink transition-colors font-mono text-[9px] uppercase font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>REMOVE</span>
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenEdit(selectedEntry);
                      setSelectedEntry(null);
                    }}
                    className="px-3 py-1.5 bg-ink text-paper hover:bg-taxi hover:text-ink border-2 border-ink font-mono text-[9px] uppercase font-black shadow-[2px_2px_0px_#1A1A1B] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={12} />
                    EDIT CLASS
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(null)}
                    className="px-3 py-1.5 bg-paper text-ink hover:bg-stone-200 border-2 border-ink font-mono text-[9px] uppercase font-black cursor-pointer"
                  >
                    CLOSE
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ADD / EDIT SUBJECT MODAL FORM                                 */}
        {/* ------------------------------------------------------------- */}
        {isAddFormOpen && (
          <div className="fixed inset-0 z-[10020] flex items-center justify-center p-3 sm:p-4 bg-ink/70 backdrop-blur-2xs animate-in fade-in duration-150">
            <div 
              className="absolute inset-0" 
              onClick={() => setIsAddFormOpen(false)} 
            />

            <div className="relative w-full max-w-lg bg-paper border-[5px] border-ink shadow-[8px_8px_0px_#1A1A1B] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="bg-ink text-paper p-3.5 border-b-[4px] border-taxi flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-taxi" />
                  <h3 className="font-sans font-black text-base uppercase tracking-tight text-paper">
                    {editingEntryId ? 'EDIT SUBJECT SCHEDULE' : 'REGISTER NEW SUBJECT / CLASS'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="text-paper hover:text-taxi cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitForm} className="p-4 overflow-y-auto space-y-3.5 flex-1 bg-paper">
                
                {/* Subject Name & Course Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      Subject / Course Title <span className="text-subway-red">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Machine Learning"
                      value={formSubject}
                      onChange={e => setFormSubject(e.target.value)}
                      className="w-full bg-paper border-2 border-ink px-2.5 py-1.5 font-sans font-bold text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      Course Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CSN344"
                      value={formCode}
                      onChange={e => setFormCode(e.target.value)}
                      className="w-full bg-paper border-2 border-ink px-2.5 py-1.5 font-mono font-bold text-xs uppercase focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Resource Name / Venue & Component */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      Resource Name / Venue <span className="text-subway-red">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Block - VEDANTA - VED5F 510 ComputerLab 5"
                        value={formVenue}
                        onChange={e => setFormVenue(e.target.value)}
                        className="w-full bg-paper border-2 border-ink pl-7 pr-2.5 py-1.5 font-sans font-bold text-xs focus:bg-white focus:outline-none"
                      />
                      <MapPin size={12} className="absolute left-2.5 top-2.5 text-subway-red" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      Component (e.g. Practical-1)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Practical-1, Lecture-1"
                      value={formComponent}
                      onChange={e => setFormComponent(e.target.value)}
                      className="w-full bg-paper border-2 border-ink px-2 py-1.5 font-mono text-xs font-bold uppercase focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Instructor & Credits */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      Course Instructor / Faculty
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Vaidhai Choudhary"
                        value={formInstructor}
                        onChange={e => setFormInstructor(e.target.value)}
                        className="w-full bg-paper border-2 border-ink pl-7 pr-2.5 py-1.5 font-sans font-bold text-xs focus:bg-white focus:outline-none"
                      />
                      <User size={12} className="absolute left-2.5 top-2.5 text-ink/50" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      Credits
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 3"
                      value={formCredits}
                      onChange={e => setFormCredits(e.target.value)}
                      className="w-full bg-paper border-2 border-ink px-2.5 py-1.5 font-mono font-bold text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Course Bucket & Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      Course Bucket / Category
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Discipline Elective, Discipline Core"
                      value={formBucket}
                      onChange={e => setFormBucket(e.target.value)}
                      className="w-full bg-paper border-2 border-ink px-2.5 py-1.5 font-sans font-bold text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      Offering Dept / School
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. School of Computing"
                      value={formDepartment}
                      onChange={e => setFormDepartment(e.target.value)}
                      className="w-full bg-paper border-2 border-ink px-2.5 py-1.5 font-sans font-bold text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Day(s) of Week Selector */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75 flex justify-between">
                    <span>Days of Week {editingEntryId ? '(Single day)' : '(Select multiple to batch-create)'}</span>
                    <span className="text-subway-red font-bold">
                      {formDays.length} DAY{formDays.length > 1 ? 'S' : ''} SELECTED
                    </span>
                  </label>
                  <div className="grid grid-cols-7 gap-1 bg-paper-dark border-2 border-ink p-1.5 shadow-[1px_1px_0px_#1A1A1B]">
                    {DAYS.map(day => {
                      const isSel = formDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => {
                            if (editingEntryId) {
                              setFormDays([day.id]);
                            } else {
                              if (isSel) {
                                if (formDays.length > 1) {
                                  setFormDays(formDays.filter(d => d !== day.id));
                                }
                              } else {
                                setFormDays([...formDays, day.id]);
                              }
                            }
                          }}
                          className={cn(
                            "py-1.5 text-center font-mono text-[9px] font-black uppercase border transition-all cursor-pointer",
                            isSel
                              ? "bg-ink text-white border-ink shadow-[1px_1px_0px_#1A1A1B] scale-102"
                              : "bg-paper text-ink/70 border-ink/20 hover:border-ink"
                          )}
                        >
                          {day.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      Start Time <span className="text-subway-red">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formStartTime}
                      onChange={e => setFormStartTime(e.target.value)}
                      className="w-full bg-paper border-2 border-ink px-2 py-1.5 font-mono text-xs font-bold focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                      End Time <span className="text-subway-red">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formEndTime}
                      onChange={e => setFormEndTime(e.target.value)}
                      className="w-full bg-paper border-2 border-ink px-2 py-1.5 font-mono text-xs font-bold focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* MULTIPLE COLORS FOR SUBJECT CARDS */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75 flex justify-between">
                    <span>Card Accent Color</span>
                    <span className="font-bold font-mono text-[8px]" style={{ color: formColor }}>
                      {TIMETABLE_COLORS.find(c => c.hex === formColor)?.name || 'Custom'}
                    </span>
                  </label>
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 bg-paper-dark border-2 border-ink p-1.5 shadow-[1px_1px_0px_#1A1A1B]">
                    {TIMETABLE_COLORS.map(c => {
                      const isSel = formColor === c.hex;
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setFormColor(c.hex)}
                          className={cn(
                            "aspect-square rounded-xs border-2 transition-all flex items-center justify-center cursor-pointer",
                            isSel ? "border-ink scale-110 shadow-[1px_1px_0px_#1A1A1B] z-10" : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          {isSel && <Check size={11} className="text-white stroke-[3px]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="block font-mono text-[8.5px] uppercase font-black text-ink/75">
                    Notes / Syllabus / Preparation
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Bring lab practical records..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    className="w-full bg-paper border-2 border-ink px-2.5 py-1.5 font-mono text-xs focus:bg-white focus:outline-none resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-2 border-t-2 border-ink flex justify-end items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddFormOpen(false)}
                    className="px-3 py-1.5 bg-paper hover:bg-stone-200 border-2 border-ink font-mono text-[9.5px] uppercase font-bold cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 bg-taxi text-ink font-mono text-[9.5px] uppercase font-black border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] hover:bg-ink hover:text-paper active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    {editingEntryId ? 'SAVE CHANGES' : 'CONFIRM & ADD TO TIMETABLE'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
