import React, { useMemo } from 'react';
import { Attempt } from '../types';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';

export function PerformanceHeatmap({ attempts }: { attempts: Attempt[] }) {
  const days = 14;
  
  const heatmapData = useMemo(() => {
    const data = [];
    const today = startOfDay(new Date());
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dayAttempts = attempts.filter(a => isSameDay(new Date(a.completedAt), date));
      
      let colorClass = 'bg-slate-100 dark:bg-slate-800'; // level 0 (none)
      if (dayAttempts.length > 0) {
        const totalScore = dayAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        const avgScore = totalScore / dayAttempts.length;
        
        if (avgScore > 80) colorClass = 'bg-teal-500'; // level 3 (high)
        else if (avgScore > 50) colorClass = 'bg-teal-400'; // level 2 (medium)
        else colorClass = 'bg-teal-300'; // level 1 (low)
      }
      
      data.push({
        date,
        count: dayAttempts.length,
        colorClass
      });
    }
    return data;
  }, [attempts]);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Activity Heatmap (Last 14 Days)</h3>
      <div className="flex gap-2 justify-center items-end h-24">
        {heatmapData.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-2 group relative">
            <div 
              className={`w-6 rounded-sm ${day.colorClass} transition-all duration-300 hover:scale-110`}
              style={{ height: `${Math.max(12, day.count * 15)}px` }}
            >
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                {format(day.date, 'MMM d')}: {day.count} activities
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {format(day.date, 'd')}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-6 text-xs text-slate-500">
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800"></div> None</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-teal-300"></div> Needs Practice</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-teal-400"></div> Good</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-teal-500"></div> Excellent</span>
      </div>
    </div>
  );
}
