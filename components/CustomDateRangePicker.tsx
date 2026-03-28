
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, ArrowRight } from 'lucide-react';

interface CustomDateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
  onClose: () => void;
}

const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({ startDate, endDate, onChange, onClose }) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = startDate ? new Date(startDate + 'T12:00:00') : new Date();
    return d;
  });

  const [tempStart, setTempStart] = useState<string | null>(startDate);
  const [tempEnd, setTempEnd] = useState<string | null>(endDate);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const selectedDateStr = `${year}-${month}-${d}`;

    if (!tempStart || (tempStart && tempEnd)) {
      // Começando nova seleção
      setTempStart(selectedDateStr);
      setTempEnd(null);
    } else {
      // Finalizando seleção
      if (selectedDateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(selectedDateStr);
      } else {
        setTempEnd(selectedDateStr);
      }
    }
  };

  const handleConfirm = () => {
    if (tempStart && tempEnd) {
      onChange(tempStart, tempEnd);
      onClose();
    } else if (tempStart) {
      onChange(tempStart, tempStart);
      onClose();
    }
  };

  const handleSetToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    if (tempStart && !tempEnd) {
      // Se já tem início mas não tem fim, marca o fim como hoje
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
    } else {
      // Comportamento padrão: seleciona apenas hoje (início e fim)
      setTempStart(dateStr);
      setTempEnd(dateStr);
    }
    setCurrentDate(today);
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const pickerContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm pointer-events-auto"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-xs rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 pointer-events-auto"
        >
          {/* Header with Selected Range Display */}
          <div className="p-6 bg-indigo-600 text-white">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="opacity-70" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Período Selecionado</span>
              </div>
              <button type="button" onClick={onClose} className="p-1 hover:bg-indigo-700 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm font-black">
              <div className="flex-1 bg-white/10 p-3 rounded-xl text-center">
                {tempStart ? new Date(tempStart + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--/--'}
              </div>
              <ArrowRight size={16} className="opacity-50" />
              <div className="flex-1 bg-white/10 p-3 rounded-xl text-center">
                {tempEnd ? new Date(tempEnd + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--/--'}
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Quick Periods */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { label: 'Hoje', action: handleSetToday },
                { label: '7 dias', days: 7 },
                { label: '30 dias', days: 30 },
                { label: 'Mês', type: 'month' }
              ].map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (p.action) {
                      p.action();
                    } else if (p.days) {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - p.days + 1);
                      setTempStart(start.toISOString().split('T')[0]);
                      setTempEnd(end.toISOString().split('T')[0]);
                      setCurrentDate(end);
                    } else if (p.type === 'month') {
                      const end = new Date();
                      const start = new Date(end.getFullYear(), end.getMonth(), 1);
                      setTempStart(start.toISOString().split('T')[0]);
                      setTempEnd(end.toISOString().split('T')[0]);
                      setCurrentDate(end);
                    }
                  }}
                  className="whitespace-nowrap px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-all border border-slate-100 dark:border-slate-700"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Month Navigation */}
            <div className="flex justify-between items-center mb-6">
              <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <div className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">
                  {monthNames[month]}
                </div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {year}
                </div>
              </div>
              <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day, idx) => (
                <div key={`${day}-${idx}`} className="text-center text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                
                const yearStr = currentDate.getFullYear();
                const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
                const dayStr = String(day).padStart(2, '0');
                const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

                const isStart = tempStart === dateStr;
                const isEnd = tempEnd === dateStr;
                const isInRange = tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd;
                
                const isToday = new Date().getDate() === day && 
                                new Date().getMonth() === month && 
                                new Date().getFullYear() === year;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={`
                      aspect-square flex items-center justify-center rounded-full text-xs font-bold transition-all relative
                      ${isStart || isEnd 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-110 z-10' 
                        : isInRange
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : isToday
                            ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    <span className="relative z-10">{day}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="mt-8 space-y-3">
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleSetToday}
                  className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <CalendarIcon size={14} /> Hoje
                </button>
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
              </div>
              <button 
                type="button"
                onClick={handleConfirm}
                disabled={!tempStart}
                className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Período
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(pickerContent, document.body);
};

export default CustomDateRangePicker;
