
import React, { useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency } from '../utils/calculations';

interface PerformanceCalendarProps {
  dailyStats: any[];
}

const PerformanceCalendar: React.FC<PerformanceCalendarProps> = ({ dailyStats }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentDate);
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  // Preencher dias vazios no início
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }

  // Preencher dias do mês
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const stats = dailyStats.find(s => s.date === dateStr);
    days.push({ day: d, stats });
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm mt-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
            <Calendar size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">{capitalizedMonth}</h4>
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{year}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
            <ChevronRight className="rotate-180" size={18} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(wd => (
          <div key={wd} className="text-center text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} className="aspect-square" />;
          
          const isToday = new Date().toDateString() === new Date(year, month, d.day).toDateString();
          const hasWorked = !!d.stats;
          const goalMet = d.stats?.goalMet;

          let bgColor = 'bg-slate-50 dark:bg-slate-800/50';
          let textColor = 'text-slate-400 dark:text-slate-600';
          let borderColor = 'border-transparent';

          if (hasWorked) {
            if (goalMet) {
              bgColor = 'bg-emerald-500/10';
              textColor = 'text-emerald-600 dark:text-emerald-400';
              borderColor = 'border-emerald-500/20';
            } else {
              bgColor = 'bg-indigo-500/10';
              textColor = 'text-indigo-600 dark:text-indigo-400';
              borderColor = 'border-indigo-500/20';
            }
          }

          if (isToday) {
            borderColor = 'border-indigo-500';
          }

          return (
            <div 
              key={d.day} 
              className={`aspect-square rounded-2xl border ${borderColor} ${bgColor} flex flex-col items-center justify-center relative group transition-all`}
            >
              <span className={`text-xs font-black font-mono-num ${textColor}`}>{d.day}</span>
              {hasWorked && (
                <div className={`w-1 h-1 rounded-full mt-1 ${goalMet ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
              )}
              
              {/* Tooltip simples no hover */}
              {hasWorked && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                  <div className="bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-lg whitespace-nowrap uppercase tracking-widest shadow-xl">
                    {formatCurrency(d.stats.gross)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Meta Batida</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trabalhado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Folga</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PerformanceCalendar;
