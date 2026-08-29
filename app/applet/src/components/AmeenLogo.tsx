import React from 'react';

interface AmeenLogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AmeenLogo({ className = '', iconOnly = false, size = 'md' }: AmeenLogoProps) {
  const containerSizes = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5'
  };
  const boxSizes = {
    sm: 'px-1 py-0.5 border',
    md: 'px-2 py-1 border-2',
    lg: 'px-3 py-1.5 border-[3px]'
  };
  const textSizes = {
    sm: 'text-sm',
    md: 'text-2xl',
    lg: 'text-4xl'
  };
  const eltSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-base'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`border-slate-900 dark:border-white font-black tracking-tighter text-slate-900 dark:text-white uppercase ${boxSizes[size]} ${textSizes[size]}`}>
        AMEEN
      </div>
      {!iconOnly && (
        <div className={`flex items-center mt-0.5 ${containerSizes[size]}`}>
          <div className="h-[2px] w-6 bg-slate-900 dark:bg-white" />
          <span className={`font-bold tracking-widest text-slate-900 dark:text-white ${eltSizes[size]}`}>ELT</span>
          <div className="h-[2px] w-6 bg-slate-900 dark:bg-white" />
        </div>
      )}
    </div>
  );
}
