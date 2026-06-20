import React from 'react';
import { 
  Dumbbell, BookOpen, Brain, Droplet, Apple, Coffee, Laptop, PenTool, Moon, Key, Brush, Music
} from 'lucide-react';

interface HabitIconProps {
  iconName: string;
  className?: string;
  size?: number;
}

export function HabitIcon({ iconName, className, size = 13 }: HabitIconProps) {
  const strokeWidth = 2.5;
  switch (iconName) {
    case 'dumbbell':
      return <Dumbbell size={size} strokeWidth={strokeWidth} className={className} />;
    case 'book-open':
      return <BookOpen size={size} strokeWidth={strokeWidth} className={className} />;
    case 'brain':
      return <Brain size={size} strokeWidth={strokeWidth} className={className} />;
    case 'droplet':
      return <Droplet size={size} strokeWidth={strokeWidth} className={className} />;
    case 'apple':
      return <Apple size={size} strokeWidth={strokeWidth} className={className} />;
    case 'coffee':
      return <Coffee size={size} strokeWidth={strokeWidth} className={className} />;
    case 'laptop':
      return <Laptop size={size} strokeWidth={strokeWidth} className={className} />;
    case 'pen-tool':
      return <PenTool size={size} strokeWidth={strokeWidth} className={className} />;
    case 'moon':
      return <Moon size={size} strokeWidth={strokeWidth} className={className} />;
    case 'key':
      return <Key size={size} strokeWidth={strokeWidth} className={className} />;
    case 'brush':
      return <Brush size={size} strokeWidth={strokeWidth} className={className} />;
    case 'music':
      return <Music size={size} strokeWidth={strokeWidth} className={className} />;
    default:
      // Backward compatibility mapping for old saved emoji icons to new custom Lucide icons!
      if (iconName === '🏃‍♂️') return <Dumbbell size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '📚') return <BookOpen size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '🧘') return <Brain size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '💧') return <Droplet size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '🍎') return <Apple size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '☕') return <Coffee size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '💻') return <Laptop size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '✍️') return <PenTool size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '🛌') return <Moon size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '🔑') return <Key size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '🧹') return <Brush size={size} strokeWidth={strokeWidth} className={className} />;
      if (iconName === '🎸') return <Music size={size} strokeWidth={strokeWidth} className={className} />;

      return <span className="shrink-0 select-none font-sans leading-none" style={{ fontSize: `${size}px` }}>{iconName}</span>;
  }
}
