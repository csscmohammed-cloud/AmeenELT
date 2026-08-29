import React from 'react';

interface AmeenLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AmeenLogo({ className = '', iconOnly = false, size = 'md' }: AmeenLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };
  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl sm:text-3xl'
  };
  const badgeSizes = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-xs px-2.5 py-1'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Custom Vector Icon Logo */}
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 p-[1.5px] shadow-lg shadow-teal-500/20 group hover:scale-105 transition-all duration-300 ${iconSizes[size]}`}>
        <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-cyan-500/10 opacity-100" />
          
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-3/5 h-3/5 relative z-10 text-teal-600 dark:text-teal-400 transform group-hover:rotate-3 transition-transform duration-300">
            <path d="M16 5L6 23M16 5L26 23M10 17H22" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="16" cy="11" r="2" fill="#0ea5e9" />
          </svg>
        </div>
      </div>

      {!iconOnly && (
        <div className="flex items-center gap-2">
          <span className={`font-extrabold tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}>
            Ameen
          </span>
          <span className={`font-bold rounded-lg border border-teal-200/80 dark:border-teal-800/80 bg-teal-50/80 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 shadow-2xs uppercase tracking-wider ${badgeSizes[size]}`}>
            ELT
          </span>
        </div>
      )}
    </div>
  );
}
