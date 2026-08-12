import React from 'react';
import { AttendanceStatus } from '../types';
import { Check, X, Ban, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface AttendanceStatusSymbolProps {
  status: AttendanceStatus | 'unmarked' | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

// Custom micro-icon/symbol component for present, absent, cancel and not marked (icon only, no internal text)
export function AttendanceStatusSymbol({
  status,
  size = 'sm',
  className = '',
  showTooltip = true
}: AttendanceStatusSymbolProps) {
  if (!status) return null;

  switch (status) {
    case 'present':
      return (
        <span
          className={cn(
            "inline-flex items-center justify-center font-mono rounded-3xs border transition-all shrink-0 select-none shadow-[1px_1px_0px_#1A1A1B]",
            "bg-emerald-600 text-white border-emerald-950",
            size === 'xs' && "w-3 h-3 min-w-[12px]",
            size === 'sm' && "w-3.5 h-3.5 min-w-[14px]",
            size === 'md' && "w-4.5 h-4.5 min-w-[18px]",
            size === 'lg' && "w-6 h-6 min-w-[24px]",
            className
          )}
          title={showTooltip ? "Attendance: Present (✓)" : undefined}
        >
          <Check 
            size={size === 'xs' ? 7.5 : size === 'sm' ? 9 : size === 'md' ? 11 : 14} 
            strokeWidth={3.5} 
            className="shrink-0 text-white" 
          />
        </span>
      );
    case 'absent':
      return (
        <span
          className={cn(
            "inline-flex items-center justify-center font-mono rounded-3xs border transition-all shrink-0 select-none shadow-[1px_1px_0px_#1A1A1B]",
            "bg-subway-red text-white border-rose-950",
            size === 'xs' && "w-3 h-3 min-w-[12px]",
            size === 'sm' && "w-3.5 h-3.5 min-w-[14px]",
            size === 'md' && "w-4.5 h-4.5 min-w-[18px]",
            size === 'lg' && "w-6 h-6 min-w-[24px]",
            className
          )}
          title={showTooltip ? "Attendance: Absent (✕)" : undefined}
        >
          <X 
            size={size === 'xs' ? 7.5 : size === 'sm' ? 9 : size === 'md' ? 11 : 14} 
            strokeWidth={3.5} 
            className="shrink-0 text-white" 
          />
        </span>
      );
    case 'cancelled':
      return (
        <span
          className={cn(
            "inline-flex items-center justify-center font-mono rounded-3xs border transition-all shrink-0 select-none shadow-[1px_1px_0px_#1A1A1B]",
            "bg-stone-500 text-white border-stone-800",
            size === 'xs' && "w-3 h-3 min-w-[12px]",
            size === 'sm' && "w-3.5 h-3.5 min-w-[14px]",
            size === 'md' && "w-4.5 h-4.5 min-w-[18px]",
            size === 'lg' && "w-6 h-6 min-w-[24px]",
            className
          )}
          title={showTooltip ? "Class: Cancelled (⊘)" : undefined}
        >
          <Ban 
            size={size === 'xs' ? 7 : size === 'sm' ? 8.5 : size === 'md' ? 10.5 : 13} 
            strokeWidth={3} 
            className="shrink-0 text-white" 
          />
        </span>
      );
    case 'unmarked':
      return (
        <span
          className={cn(
            "inline-flex items-center justify-center font-mono rounded-3xs border border-dashed transition-all shrink-0 select-none shadow-[1px_1px_0px_#1A1A1B]",
            "bg-amber-400 text-amber-950 border-amber-900",
            size === 'xs' && "w-3 h-3 min-w-[12px]",
            size === 'sm' && "w-3.5 h-3.5 min-w-[14px]",
            size === 'md' && "w-4.5 h-4.5 min-w-[18px]",
            size === 'lg' && "w-6 h-6 min-w-[24px]",
            className
          )}
          title={showTooltip ? "Attendance: Not Marked (?)" : undefined}
        >
          <HelpCircle 
            size={size === 'xs' ? 7.5 : size === 'sm' ? 9 : size === 'md' ? 11 : 14} 
            strokeWidth={3.5} 
            className="shrink-0 text-amber-950" 
          />
        </span>
      );
    default:
      return null;
  }
}
