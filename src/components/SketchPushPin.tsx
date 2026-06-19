import React from 'react';

interface SketchPushPinProps {
  color?: string; // hex color for body fill
  size?: number;  // dimensions in px
  className?: string;
  horizontal?: boolean; // if true, points horizontally left-to-right (pinning the edge)
}

export function SketchPushPin({ color = '#38bdf8', size = 28, className, horizontal = false }: SketchPushPinProps) {
  // Let's create an exceptionally polished, high-effort NYC Manhattan/Journal-style pushpin.
  // It features manual comic-book shading, glossy 3D highlight overlays, realistic metallic needle 
  // facets, an industrial brass-alloy collar, and bold cartoon outlines matching "The Daily Docket" theme.
  
  const rotationClass = horizontal ? "rotate-[270deg]" : "rotate-[-30deg]";

  return (
    <div 
      className={className} 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        display: 'inline-block',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={rotationClass}
        style={{ 
          filter: 'drop-shadow(3px 3px 0px rgba(26,26,27,0.95))',
          transition: 'all 0.15s ease-out'
        }}
      >
        {/* ================= NEEDLE / STEEL PIN (High effort facet-shaded needle) ================= */}
        {/* Core needle body with bold steel outline */}
        <path
          d="M47.5 60 L52.5 60 L51.2 96 A1.2 1.2 0 0 1 48.8 96 Z"
          fill="#D1D5DB"
          stroke="#1A1A1B"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* High-contrast lighter steel facet (Left side) */}
        <path
          d="M48 60 L50 60 L50 95 L49 95 Z"
          fill="#F3F4F6"
        />
        {/* Shaded metallic steel facet (Right side) */}
        <path
          d="M50 60 L52 60 L51 95 L50 95 Z"
          fill="#9CA3AF"
        />
        {/* Inner black facet divider line */}
        <line
          x1="50"
          y1="60"
          x2="50"
          y2="95"
          stroke="#1A1A1B"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* ================= BRASS/GOLD RING COLLAR (Premium industrial detailing) ================= */}
        {/* Base collar curve */}
        <path
          d="M38 56 L62 56 L59 62 L41 62 Z"
          fill="#EAB308"
          stroke="#1A1A1B"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Brass light highlight on left */}
        <path
          d="M41 57 L46 57 L44 61 L42 61 Z"
          fill="#FEF08A"
        />
        {/* Brass shadow on right */}
        <path
          d="M51 57 L60 57 L58 61 L50 61 Z"
          fill="#CA8A04"
        />

        {/* ================= MAIN PIN BODY - BULBOUS SPHERE LOWER PART ================= */}
        {/* Base color filled bulb shape */}
        <path
          d="M38 39 Q20 39 20 49 Q20 59 50 59 Q80 59 80 49 Q80 39 62 39 Z"
          fill={color}
          stroke="#1A1A1B"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Dark crescent shadow (Right-hand shading) */}
        <path
          d="M50 59 Q80 59 80 49 Q80 40 68 40 Q55 45 50 59 Z"
          fill="black"
          opacity="0.22"
        />
        {/* Shiny white specular glare arc (Left-hand highlights) */}
        <path
          d="M26 46 C22 50, 31 54, 40 55 C32 52, 28 48, 28 45 Z"
          fill="white"
          opacity="0.7"
        />
        {/* Shiny white specular dot */}
        <circle
          cx="30"
          cy="45"
          r="3"
          fill="white"
          opacity="0.85"
        />

        {/* ================= MAIN PIN BODY - HOURGLASS WAIST SQUEEZE ================= */}
        {/* Base color waist */}
        <path
          d="M28 20 L72 20 L62 39 L38 39 Z"
          fill={color}
          stroke="#1A1A1B"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Shaded waist wedge (right-side) */}
        <path
          d="M50 20 L72 20 L62 39 L50 39 Z"
          fill="black"
          opacity="0.18"
        />
        {/* Shiny highlight wedge (left-side stripe) */}
        <path
          d="M32 21 L37 21 L41 38 L38 38 Z"
          fill="white"
          opacity="0.5"
        />

        {/* ================= MAIN PIN BODY - DECORATIVE FLAT TOP LID ================= */}
        {/* Base color lip lid */}
        <path
          d="M16 11 L84 11 L80 20 L20 20 Z"
          fill={color}
          stroke="#1A1A1B"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Right side shading of top lid */}
        <path
          d="M50 11 L84 11 L80 20 L50 20 Z"
          fill="black"
          opacity="0.15"
        />
        {/* Left side reflection on top lip */}
        <path
          d="M19 13 L45 13 L43 18 L21 18 Z"
          fill="white"
          opacity="0.6"
        />

        {/* ================= REAL NOIR JOURNAL SHADING HATCH MARKS ================= */}
        {/* Hatching in waist shadow */}
        <line x1="64" y1="23" x2="60" y2="36" stroke="#1A1A1B" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <line x1="68" y1="24" x2="65" y2="33" stroke="#1A1A1B" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
        
        {/* Hatching in lower bulb shadow */}
        <line x1="67" y1="44" x2="62" y2="52" stroke="#1A1A1B" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <line x1="71" y1="45" x2="68" y2="49" stroke="#1A1A1B" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      </svg>
    </div>
  );
}
