import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  FileText, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Layers, 
  GraduationCap, 
  ArrowRight,
  Clipboard,
  RefreshCw,
  Info
} from 'lucide-react';
import { ExamEntry, ExamType } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface ExamImageParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExams: (exams: Omit<ExamEntry, 'id'>[], addToCalendar: boolean) => Promise<any>;
  defaultExamName?: string;
  onNavigateToCalendar?: () => void;
}

interface EditableExamItem {
  id: string;
  subject: string;
  code: string;
  date: string;
  dayOfWeek?: string;
  startTime: string;
  endTime: string;
  venue: string;
  type: ExamType;
  notes: string;
}

const PRESET_EXAM_NAMES = [
  'Mid-Term Examination',
  'End-Term Theory Examination',
  'Unit Test 1',
  'Unit Test 2',
  'Internal Sessional Exam',
  'Practicals & Viva Voce',
];

const EXAM_TYPES: ExamType[] = ['Theory', 'Practical', 'Viva', 'Quiz', 'Other'];

export function ExamImageParserModal({
  isOpen,
  onClose,
  onAddExams,
  defaultExamName = 'Mid-Term Examination 2026',
  onNavigateToCalendar,
}: ExamImageParserModalProps) {
  const [examName, setExamName] = useState(defaultExamName);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedExams, setParsedExams] = useState<EditableExamItem[]>([]);
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle clipboard paste of image
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setErrorMessage(null);
    setImageMimeType(file.type);
    setParsedExams([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedImage(result);
      // Directly extract exam schedule from the uploaded image
      handleParseWithAI(result, file.type);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  // Call server-side Gemini API to parse the exam timetable image
  const handleParseWithAI = async (imgData?: unknown, mime?: unknown) => {
    const targetImage = (typeof imgData === 'string' && imgData.trim().length > 0) ? imgData : selectedImage;
    const targetMime = (typeof mime === 'string' && mime.trim().length > 0) ? mime : imageMimeType;

    if (!targetImage || typeof targetImage !== 'string') {
      setErrorMessage('Please select, drag & drop, or paste an image of your exam timetable.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep('Uploading exam date-sheet image...');

    try {
      setLoadingStep('Analyzing timetable image with Gemini Vision...');

      const response = await fetch('/api/parse-exam-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: targetImage,
          mimeType: targetMime,
          examNameHint: examName,
        }),
      });

      setLoadingStep('Extracting exam courses, dates, timings and sessions...');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to parse exam image');
      }

      if (data.detectedExamName && (!examName || examName === 'Exam Schedule')) {
        setExamName(data.detectedExamName);
      }

      const items: EditableExamItem[] = (data.exams || []).map((e: any, idx: number) => ({
        id: 'exam-item-' + idx + '-' + Math.random().toString(36).substring(7),
        subject: e.subject || `Subject ${idx + 1}`,
        code: e.code || '',
        date: e.date || new Date().toISOString().split('T')[0],
        dayOfWeek: e.dayOfWeek || '',
        startTime: e.startTime || '09:30',
        endTime: e.endTime || '12:30',
        venue: e.venue || '',
        type: e.type || 'Theory',
        notes: e.notes || '',
      }));

      if (items.length === 0) {
        setErrorMessage('No exam slots could be clearly recognized in this image. You can manually add slots below or try a sharper image.');
      } else {
        setParsedExams(items);
      }
    } catch (err: any) {
      console.error('Error during AI parse:', err);
      setErrorMessage(err.message || 'Error parsing exam schedule. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleUpdateItem = (id: string, field: keyof EditableExamItem, value: string) => {
    setParsedExams(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleDeleteItem = (id: string) => {
    setParsedExams(prev => prev.filter(item => item.id !== id));
  };

  const handleAddNewSlot = () => {
    const newItem: EditableExamItem = {
      id: 'new-' + Math.random().toString(36).substring(7),
      subject: '',
      code: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:30',
      endTime: '12:30',
      venue: '',
      type: 'Theory',
      notes: '',
    };
    setParsedExams(prev => [...prev, newItem]);
  };

  const handleConfirmAndAddToCalendar = async () => {
    if (parsedExams.length === 0) {
      setErrorMessage('No exam slots to add. Please extract or enter at least one exam slot.');
      return;
    }

    const validExams = parsedExams.filter(e => e.subject.trim().length > 0);
    if (validExams.length === 0) {
      setErrorMessage('Please provide a subject name for at least one exam.');
      return;
    }

    const finalExamName = examName.trim() || 'Exam';

    const examEntriesToSave: Omit<ExamEntry, 'id'>[] = validExams.map(e => ({
      examName: finalExamName,
      subject: e.subject.trim(),
      code: e.code.trim() || undefined,
      date: e.date,
      dayOfWeek: e.dayOfWeek || undefined,
      startTime: e.startTime,
      endTime: e.endTime,
      venue: e.venue.trim() || undefined,
      type: e.type,
      notes: e.notes.trim() || undefined,
      color: '#EF4444',
    }));

    await onAddExams(examEntriesToSave, addToCalendar);
    setAddedCount(validExams.length);
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-2 sm:p-4 select-none font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-ink/80 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-[#FFFEEF] border-[6px] border-ink shadow-[10px_10px_0px_#1A1A1B] flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-ink text-paper p-3.5 sm:p-4 border-b-[5px] border-taxi shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-taxi text-ink rounded-3xs border border-ink shadow-[2px_2px_0px_#1A1A1B]">
              <Sparkles size={18} strokeWidth={2.5} className="animate-spin-slow" />
            </span>
            <div>
              <h2 className="font-sans font-black text-lg sm:text-xl uppercase tracking-tight text-paper flex items-center gap-2 leading-none">
                ADD EXAMS FROM IMAGE
              </h2>
              <p className="font-mono text-[9px] uppercase tracking-widest font-bold text-taxi mt-1">
                AI VISION EXAM DATE-SHEET PARSER // EXTRACT ONLY FROM IMAGE TO CALENDAR
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-paper hover:text-taxi cursor-pointer transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          
          {/* SUCCESS BANNER OVERLAY */}
          {isSuccess ? (
            <div className="bg-emerald-50 border-[4px] border-emerald-700 p-6 text-center space-y-4 shadow-[6px_6px_0px_#065F46] animate-in fade-in zoom-in-95">
              <div className="inline-flex p-3 bg-emerald-600 text-white rounded-full border-2 border-emerald-800 shadow-[3px_3px_0px_#1A1A1B]">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-sans font-black text-2xl uppercase tracking-tight text-emerald-950">
                  {addedCount} EXAMS ADDED TO YOUR CALENDAR!
                </h3>
                <p className="font-mono text-xs uppercase font-bold text-emerald-800 mt-1">
                  Exam Series: <strong className="text-ink bg-taxi/40 px-1.5 py-0.5 border border-emerald-700">{examName}</strong>
                </p>
                <p className="text-sm font-sans text-emerald-900/80 mt-2 max-w-md mx-auto">
                  All dates, subjects, time slots, and exam hall venues are synchronized to your weekly calendar docket.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                {onNavigateToCalendar && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToCalendar();
                    }}
                    className="px-4 py-2 bg-emerald-700 text-white font-mono text-xs font-black uppercase border-2 border-ink shadow-[3px_3px_0px_#1A1A1B] hover:bg-emerald-800 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Calendar size={14} />
                    <span>VIEW ON CALENDAR</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-paper text-ink font-mono text-xs font-black uppercase border-2 border-ink shadow-[3px_3px_0px_#1A1A1B] hover:bg-stone-100 active:translate-y-0.5 transition-all cursor-pointer"
                >
                  DONE
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* SECTION 1: EXAM NAME INPUT & PRESET TAGS */}
              <div className="bg-paper border-[3px] border-ink p-3 sm:p-4 shadow-[4px_4px_0px_#1A1A1B]">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="font-mono text-[10px] font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-subway-red" />
                    <span>1. EXAM SERIES NAME (CUSTOMIZABLE)</span>
                  </label>
                  <span className="font-mono text-[8px] font-bold text-ink/60 uppercase">
                    You can name or rename this exam
                  </span>
                </div>

                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g., Mid-Term Examination 2026, End Semester Exams, Unit Test 1..."
                  className="w-full bg-[#FCFAF2] border-2 border-ink px-3 py-2 font-sans font-black text-sm text-ink placeholder:text-ink/40 shadow-[2px_2px_0px_#1A1A1B] focus:outline-none focus:bg-taxi/20 transition-colors uppercase"
                />

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="font-mono text-[8px] font-bold text-ink/75 uppercase mr-1">
                    Quick Names:
                  </span>
                  {PRESET_EXAM_NAMES.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setExamName(preset)}
                      className={cn(
                        "px-2 py-0.5 border border-ink font-mono text-[8px] font-bold uppercase transition-all cursor-pointer shadow-[1px_1px_0px_#1A1A1B]",
                        examName.toLowerCase() === preset.toLowerCase()
                          ? "bg-taxi text-ink font-black scale-105"
                          : "bg-paper-dark text-ink/80 hover:bg-taxi/30"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: IMAGE UPLOAD / DRAG & DROP / PASTE */}
              <div className="bg-paper border-[3px] border-ink p-3 sm:p-4 shadow-[4px_4px_0px_#1A1A1B]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className="font-mono text-[10px] font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Camera size={14} className="text-subway-blue" />
                    <span>2. UPLOAD EXAM TIMETABLE IMAGE</span>
                  </label>
                  
                  <span className="font-mono text-[8.5px] font-black uppercase px-2 py-0.5 bg-ink text-taxi border border-ink shadow-[1px_1px_0px_#1A1A1B] inline-flex items-center gap-1">
                    <Sparkles size={11} className="text-taxi" />
                    <span>EXTRACT ONLY FROM IMAGE</span>
                  </span>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageFile(e.target.files[0]);
                    }
                  }}
                />

                {/* Drag and drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-[3px] border-dashed p-4 sm:p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2",
                    isDragging 
                      ? "border-subway-red bg-taxi/30 scale-[1.01]" 
                      : selectedImage 
                        ? "border-ink bg-white" 
                        : "border-ink/60 bg-[#FAF8F2] hover:border-ink hover:bg-stone-50"
                  )}
                >
                  {selectedImage ? (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] bg-paper overflow-hidden shrink-0">
                          <img 
                            src={selectedImage} 
                            alt="Exam Timetable Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-left">
                          <span className="font-mono text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-600 px-1.5 py-0.5 rounded-3xs inline-flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            IMAGE READY FOR PARSING
                          </span>
                          <p className="font-sans font-black text-sm text-ink uppercase mt-1">
                            TIMETABLE IMAGE LOADED
                          </p>
                          <p className="font-mono text-[9px] font-semibold text-ink/70">
                            Click to replace or drag another image
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="px-2.5 py-1.5 bg-paper text-ink font-mono text-[9px] font-black uppercase border border-ink shadow-[1.5px_1.5px_0px_#1A1A1B] hover:bg-taxi"
                        >
                          CHANGE
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                          }}
                          className="p-1.5 bg-red-100 text-subway-red border border-ink hover:bg-subway-red hover:text-white"
                          title="Remove image"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-taxi text-ink rounded-full border-2 border-ink shadow-[3px_3px_0px_#1A1A1B]">
                        <Upload size={24} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="font-sans font-black text-base uppercase text-ink">
                          DRAG &amp; DROP EXAM SCHEDULE IMAGE HERE
                        </p>
                        <p className="font-mono text-[9.5px] uppercase font-bold text-ink/75 mt-0.5">
                          Or click to browse • Supports PNG, JPG, WEBP • Paste directly with Ctrl+V
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Extract action button */}
                {selectedImage && parsedExams.length === 0 && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleParseWithAI()}
                      className={cn(
                        "px-4 py-2 bg-taxi text-ink font-mono text-xs font-black uppercase border-2 border-ink shadow-[3px_3px_0px_#1A1A1B] hover:bg-white active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer",
                        isLoading && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      <Sparkles size={14} className={isLoading ? "animate-spin" : ""} />
                      <span>{isLoading ? 'PARSING IMAGE WITH AI...' : 'PARSE EXAM INFO FROM IMAGE'}</span>
                    </button>
                  </div>
                )}

                {/* Loading state bar */}
                {isLoading && (
                  <div className="mt-3 p-3 bg-taxi/20 border-2 border-ink flex items-center gap-2.5 animate-pulse font-mono text-xs font-bold text-ink">
                    <RefreshCw size={15} className="animate-spin text-subway-red" />
                    <span>{loadingStep || 'Processing date sheet with AI model...'}</span>
                  </div>
                )}

                {/* Error message */}
                {errorMessage && (
                  <div className="mt-3 p-2.5 bg-red-100 border-2 border-subway-red text-red-950 font-mono text-[10px] font-bold flex items-center gap-2">
                    <AlertCircle size={15} className="text-subway-red shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* SECTION 3: EXTRACTED EXAM PAPERS REVIEW & EDIT TABLE */}
              {parsedExams.length > 0 && (
                <div className="bg-paper border-[3px] border-ink p-3 sm:p-4 shadow-[4px_4px_0px_#1A1A1B] space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b-2 border-ink">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-emerald-500 text-white font-mono text-[9px] font-black px-1.5 border border-ink">
                        {parsedExams.length}
                      </span>
                      <h3 className="font-sans font-black text-sm uppercase text-ink">
                        PARSED EXAM PAPERS (REVIEW &amp; EDIT)
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddNewSlot}
                        className="px-2.5 py-1 bg-white text-ink hover:bg-taxi font-mono text-[9px] font-black uppercase border border-ink shadow-[1.5px_1.5px_0px_#1A1A1B] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} strokeWidth={3} />
                        <span>ADD PAPER</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleParseWithAI()}
                        disabled={isLoading}
                        className="px-2 py-1 bg-paper text-ink hover:bg-stone-100 font-mono text-[9px] font-bold uppercase border border-ink shadow-[1.5px_1.5px_0px_#1A1A1B] flex items-center gap-1 cursor-pointer"
                        title="Re-parse image"
                      >
                        <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
                        <span>RE-SCAN</span>
                      </button>
                    </div>
                  </div>

                  {/* Exam Slots List */}
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {parsedExams.map((exam, idx) => (
                      <div 
                        key={exam.id}
                        className="bg-[#FCFAF2] border-2 border-ink p-2.5 shadow-[2px_2px_0px_#1A1A1B] flex flex-col md:flex-row items-start md:items-center gap-2 text-xs relative group"
                      >
                        {/* Paper index indicator */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="w-5 h-5 rounded-full bg-ink text-taxi font-mono text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="md:hidden font-mono text-[9px] font-bold text-ink/60">Paper #{idx + 1}</span>
                        </div>

                        {/* Date & Day */}
                        <div className="w-full md:w-36 shrink-0">
                          <label className="font-mono text-[7.5px] uppercase font-bold text-ink/60 block mb-0.5">
                            Exam Date
                          </label>
                          <input
                            type="date"
                            value={exam.date}
                            onChange={(e) => handleUpdateItem(exam.id, 'date', e.target.value)}
                            className="w-full bg-paper border border-ink px-1.5 py-1 font-mono text-[11px] font-black text-ink shadow-[1px_1px_0px_#1A1A1B]"
                          />
                        </div>

                        {/* Time Range */}
                        <div className="w-full md:w-44 shrink-0 flex items-center gap-1">
                          <div className="flex-1">
                            <label className="font-mono text-[7.5px] uppercase font-bold text-ink/60 block mb-0.5">
                              Start
                            </label>
                            <input
                              type="time"
                              value={exam.startTime}
                              onChange={(e) => handleUpdateItem(exam.id, 'startTime', e.target.value)}
                              className="w-full bg-paper border border-ink px-1 py-1 font-mono text-[10.5px] font-bold text-ink shadow-[1px_1px_0px_#1A1A1B]"
                            />
                          </div>
                          <span className="mt-3 font-mono text-[10px] font-bold text-ink/50">-</span>
                          <div className="flex-1">
                            <label className="font-mono text-[7.5px] uppercase font-bold text-ink/60 block mb-0.5">
                              End
                            </label>
                            <input
                              type="time"
                              value={exam.endTime}
                              onChange={(e) => handleUpdateItem(exam.id, 'endTime', e.target.value)}
                              className="w-full bg-paper border border-ink px-1 py-1 font-mono text-[10.5px] font-bold text-ink shadow-[1px_1px_0px_#1A1A1B]"
                            />
                          </div>
                        </div>

                        {/* Subject Title & Code - SUBJECT FIRST */}
                        <div className="w-full flex-1 min-w-[160px]">
                          <label className="font-mono text-[7.5px] uppercase font-bold text-ink/60 block mb-0.5">
                            Subject / Course Name &amp; Code
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={exam.subject}
                              placeholder="Subject Title (e.g. Data Structures)..."
                              onChange={(e) => handleUpdateItem(exam.id, 'subject', e.target.value)}
                              className="flex-1 bg-paper border border-ink px-2 py-1 font-sans font-bold text-[11px] text-ink shadow-[1px_1px_0px_#1A1A1B]"
                            />
                            <input
                              type="text"
                              value={exam.code}
                              placeholder="CODE (CS-301)"
                              onChange={(e) => handleUpdateItem(exam.id, 'code', e.target.value)}
                              className="w-28 bg-paper border border-ink px-1.5 py-1 font-mono text-[10px] font-black text-ink uppercase shadow-[1px_1px_0px_#1A1A1B]"
                            />
                          </div>
                        </div>

                        {/* Venue / Room */}
                        <div className="w-full md:w-32 shrink-0">
                          <label className="font-mono text-[7.5px] uppercase font-bold text-ink/60 block mb-0.5">
                            Exam Hall / Venue
                          </label>
                          <input
                            type="text"
                            value={exam.venue}
                            placeholder="e.g. Hall 304"
                            onChange={(e) => handleUpdateItem(exam.id, 'venue', e.target.value)}
                            className="w-full bg-paper border border-ink px-1.5 py-1 font-mono text-[10px] text-ink shadow-[1px_1px_0px_#1A1A1B]"
                          />
                        </div>

                        {/* Type */}
                        <div className="w-full md:w-24 shrink-0">
                          <label className="font-mono text-[7.5px] uppercase font-bold text-ink/60 block mb-0.5">
                            Type
                          </label>
                          <select
                            value={exam.type}
                            onChange={(e) => handleUpdateItem(exam.id, 'type', e.target.value as ExamType)}
                            className="w-full bg-paper border border-ink px-1 py-1 font-mono text-[10px] font-bold text-ink shadow-[1px_1px_0px_#1A1A1B] cursor-pointer"
                          >
                            {EXAM_TYPES.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        {/* Delete row */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(exam.id)}
                          className="p-1.5 text-ink/50 hover:text-subway-red cursor-pointer shrink-0 mt-2 md:mt-0 transition-colors"
                          title="Remove exam slot"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Integration Checkbox */}
                  <div className="pt-2 border-t-2 border-ink flex items-center justify-between flex-wrap gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-mono text-[10px] font-bold text-ink select-none">
                      <input
                        type="checkbox"
                        checked={addToCalendar}
                        onChange={(e) => setAddToCalendar(e.target.checked)}
                        className="w-4 h-4 accent-subway-red cursor-pointer"
                      />
                      <span>ADD DIRECTLY TO WEEKLY CALENDAR AS URGENT EXAM DOCKETS</span>
                    </label>

                    <div className="font-mono text-[9px] font-bold text-ink/70">
                      Total: <strong className="text-ink font-black">{parsedExams.length} Papers</strong>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!isSuccess && (
          <div className="bg-paper-dark border-t-[4px] border-ink p-3 sm:p-4 shrink-0 flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-paper text-ink font-mono text-xs font-black uppercase border-2 border-ink shadow-[2px_2px_0px_#1A1A1B] hover:bg-stone-100 active:translate-y-0.5 transition-all cursor-pointer"
            >
              CANCEL
            </button>

            <div className="flex items-center gap-2">
              {parsedExams.length > 0 && (
                <button
                  type="button"
                  onClick={handleConfirmAndAddToCalendar}
                  className="px-4 py-2 bg-taxi text-ink font-mono text-xs font-black uppercase border-2 border-ink shadow-[3px_3px_0px_#1A1A1B] hover:bg-white active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar size={14} />
                  <span>ADD {parsedExams.length} EXAMS TO CALENDAR</span>
                  <ArrowRight size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
