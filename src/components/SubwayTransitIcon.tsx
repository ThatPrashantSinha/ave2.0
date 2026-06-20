import React from 'react';

interface SubwayTransitIconProps {
  className?: string;
  size?: number;
}

export function SubwayTransitIcon({ className, size = 28 }: SubwayTransitIconProps) {
  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 select-none bg-paper border-[2.5px] border-ink rounded-full overflow-hidden shadow-[2px_2px_0px_#1A1A1B] ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Outer subway line tracks background details */}
      <div className="absolute inset-0 rounded-full border border-dashed border-ink/30 animate-[spin_40s_linear_infinite]" />
      
      {/* Subway train face vector SVG */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-[85%] h-[85%] relative z-10 transition-transform hover:scale-105 duration-200"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dynamic track ties under the train */}
        <path d="M 20 85 L 80 85" stroke="#1A1A1B" strokeWidth="6" strokeLinecap="round" />
        <path d="M 30 92 L 70 92" stroke="#1A1A1B" strokeWidth="4" strokeLinecap="round" />
        
        {/* Rails going under */}
        <path d="M 25 85 L 12 100" stroke="#1A1A1B" strokeWidth="5" strokeLinecap="round" />
        <path d="M 75 85 L 88 100" stroke="#1A1A1B" strokeWidth="5" strokeLinecap="round" />

        {/* Train main exterior protective chassis shell */}
        <rect x="18" y="15" width="64" height="60" rx="20" fill="#1A1A1B" />
        
        {/* Colorful train body/plate */}
        <rect x="22" y="19" width="56" height="52" rx="16" fill="#F43F5E" stroke="#1A1A1B" strokeWidth="4" />
        
        {/* Lower metallic vents bumper block */}
        <rect x="30" y="65" width="40" height="12" rx="4" fill="#94A3B8" stroke="#1A1A1B" strokeWidth="3" />
        <line x1="40" y1="65" x2="40" y2="77" stroke="#1A1A1B" strokeWidth="3" />
        <line x1="50" y1="65" x2="50" y2="77" stroke="#1A1A1B" strokeWidth="3" />
        <line x1="60" y1="65" x2="60" y2="77" stroke="#1A1A1B" strokeWidth="3" />

        {/* Vintage glass windshield visor */}
        <rect x="28" y="27" width="44" height="26" rx="6" fill="#06B6D4" stroke="#1A1A1B" strokeWidth="4" />
        
        {/* Windshield glare highlight effect */}
        <path d="M 32 31 L 52 31 L 40 49 L 32 49 Z" fill="white" fillOpacity="0.25" />
        
        {/* Destination board light inside the window */}
        <rect x="40" y="32" width="20" height="5" rx="1" fill="#FEF08A" stroke="#1A1A1B" strokeWidth="1.5" />
        <circle cx="45" cy="34.5" r="1" fill="#1A1A1B" />
        <circle cx="50" cy="34.5" r="1" fill="#1A1A1B" />
        <circle cx="55" cy="34.5" r="1" fill="#1A1A1B" />

        {/* Glowing circular route indicator signal lamps */}
        <circle cx="35" cy="58" r="6" fill="#FEF08A" stroke="#1A1A1B" strokeWidth="3.5" />
        <circle cx="65" cy="58" r="6" fill="#FEF08A" stroke="#1A1A1B" strokeWidth="3.5" />
        
        <circle cx="35" cy="58" r="2.5" fill="white" />
        <circle cx="65" cy="58" r="2.5" fill="white" />
        
        {/* Upper single signal route indicator lamp */}
        <circle cx="50" cy="11" r="5" fill="#10B981" stroke="#1A1A1B" strokeWidth="3" />
        <rect x="47" y="14" width="6" height="4" fill="#1A1A1B" />
      </svg>
    </div>
  );
}
