import React from 'react';
import { cn } from '../lib/utils';
import { Newspaper, Calendar as Cal, Activity, Play } from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  setTab: (t: string) => void;
}

export function Navigation({ currentTab, setTab }: NavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Front Page', icon: Newspaper },
    { id: 'planner', label: 'The Ledger', icon: Cal },
    { id: 'focus', label: 'Focus', icon: Play },
    { id: 'progress', label: 'Stats', icon: Activity },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 bg-ink border-[4px] border-taxi text-paper flex justify-around p-3 z-50 shadow-[6px_6px_0px_#1A1A1B]">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = currentTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                isActive ? "text-taxi" : "text-paper opacity-60 hover:opacity-100"
              )}
            >
              <div className="relative">
                <Icon size={20} />
                {isActive && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-taxi rounded-full"></div>}
              </div>
              <span className="font-mono text-[9px] uppercase font-bold tracking-widest mt-1">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop Bottom Navigation (Or styled like the newspaper footer edge) */}
      <div className="hidden md:flex justify-between items-center border-[6px] border-ink mt-12 mb-8 bg-paper font-sans text-sm font-black uppercase tracking-widest shadow-[6px_6px_0px_var(--color-ink)]">
        <div className="flex border-r-[6px] border-ink">
          {tabs.map((t, idx) => {
            const isActive = currentTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-6 py-4 hover:bg-ink hover:text-paper transition-colors flex items-center gap-2",
                  isActive ? "bg-ink text-paper" : "bg-transparent text-ink",
                  idx !== tabs.length - 1 ? "border-r-[6px] border-ink" : ""
                )}
              >
                <t.icon size={16} className={isActive ? "text-taxi" : ""} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="px-6 py-4 text-ink-light border-l-[6px] border-ink flex items-center space-x-4">
          <span className="font-mono text-[10px] font-bold">OFFLINE MODE: <span className="text-ink">ACTIVE</span></span>
          <div className="w-6 h-6 border-2 border-ink rounded-full flex items-center justify-center font-bold text-[10px] font-mono text-ink">MK</div>
        </div>
      </div>
    </>
  );
}
