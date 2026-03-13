
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  onClose: () => void;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, onClose }) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    return d;
  });

  const [tempDate, setTempDate] = useState(value);

  const selectedDate = tempDate ? new Date(tempDate + 'T12:00:00') : null;

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
    setTempDate(`${year}-${month}-${d}`);
  };

  const handleConfirm = () => {
    onChange(tempDate);
    onClose();
  };

  const handleSetToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setTempDate(dateStr);
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
      >
        {/* Header with Selected Date Display */}
        <div className="p-6 bg-indigo-600 text-white">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="opacity-70" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Data Selecionada</span>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="text-xl font-black capitalize">
            {selectedDate ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione uma data'}
          </div>
        </div>

        <div className="p-6">
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
              
              const isSelected = selectedDate && 
                                selectedDate.getDate() === day && 
                                selectedDate.getMonth() === month && 
                                selectedDate.getFullYear() === year;
              
              const isToday = new Date().getDate() === day && 
                              new Date().getMonth() === month && 
                              new Date().getFullYear() === year;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`
                    aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all
                    ${isSelected 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-110 z-10' 
                      : isToday
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  {day}
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
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
            >
              Confirmar Data
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomDatePicker;
