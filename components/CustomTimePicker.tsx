
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, X, Check } from 'lucide-react';

interface CustomTimePickerProps {
  value: string; // HH:mm
  onChange: (time: string) => void;
  onClose: () => void;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({ value, onChange, onClose }) => {
  const [hour, setHour] = useState(() => value.split(':')[0] || '00');
  const [minute, setMinute] = useState(() => value.split(':')[1] || '00');

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const allMinutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleSave = () => {
    onChange(`${hour}:${minute}`);
    onClose();
  };

  const handleSetNow = () => {
    const now = new Date();
    setHour(String(now.getHours()).padStart(2, '0'));
    setMinute(String(now.getMinutes()).padStart(2, '0'));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
      >
        {/* Header with Selected Time Display */}
        <div className="p-8 bg-indigo-600 text-white text-center">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="opacity-70" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Horário Definido</span>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-black tracking-tighter">{hour}</span>
            <span className="text-4xl font-black opacity-30 animate-pulse">:</span>
            <span className="text-5xl font-black tracking-tighter">{minute}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-6 h-64">
            {/* Hours Column */}
            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-3">Hora</label>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1">
                {hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHour(h)}
                    className={`
                      w-full py-3 rounded-xl text-sm font-black transition-all
                      ${hour === h 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
                        : 'text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="flex-1 flex flex-col">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-3">Minuto</label>
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1">
                {allMinutes.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinute(m)}
                    className={`
                      w-full py-3 rounded-xl text-sm font-black transition-all
                      ${minute === m 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
                        : 'text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 space-y-3">
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleSetNow}
                className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Clock size={14} /> Agora
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
              onClick={handleSave}
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2"
            >
              <Check size={16} strokeWidth={3} /> Confirmar Hora
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomTimePicker;
