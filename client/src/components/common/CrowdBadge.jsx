import React from 'react';
import { Users, Clock, AlertCircle, CheckCircle2, Flame, HelpCircle } from 'lucide-react';

export function CrowdBadge({
  status = 'unknown',
  waitMinutes = null,
  size = 'md',
  showWait = true,
  compact = false,
  className = '',
}) {
  const configs = {
    low: {
      label: compact ? 'Crowd: Low' : 'Low Crowd',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    moderate: {
      label: compact ? 'Crowd: Moderate' : 'Moderate Crowd',
      bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
      icon: Users,
    },
    high: {
      label: compact ? 'Crowd: High' : 'Heavy Crowd',
      bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      dot: 'bg-rose-500',
      icon: Flame,
    },
    mixed: {
      label: compact ? 'Crowd: Mixed' : 'Mixed Reports',
      bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      dot: 'bg-indigo-500',
      icon: AlertCircle,
    },
    unknown: {
      label: compact ? 'Crowd: Unknown' : 'Live Crowd Unknown',
      bg: 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700',
      dot: 'bg-stone-400 dark:bg-stone-500',
      icon: HelpCircle,
    },
  };

  const current = configs[status] || configs.unknown;
  const Icon = current.icon;

  const sizeClasses = {
    sm: 'text-[11px] sm:text-xs px-2 py-0.5 gap-1',
    md: 'text-xs md:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border shadow-2xs font-medium transition-all max-w-full w-fit ${
        current.bg
      } ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={`Current crowd condition: ${current.label}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${current.dot}`} />
      <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
      <span className="truncate">{current.label}</span>
      {showWait && typeof waitMinutes === 'number' && waitMinutes > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] sm:text-[11px] opacity-90 pl-1 border-l border-current/20 shrink-0">
          <Clock className="w-3 h-3" /> ~{waitMinutes}m
        </span>
      )}
    </div>
  );
}

export default CrowdBadge;
