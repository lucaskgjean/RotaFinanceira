
import React, { useState } from 'react';
import { DailyEntry, AppConfig } from '../types';
import { generateId, getLocalDateStr } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Navigation, 
  Fuel, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Save
} from 'lucide-react';

interface QuickKMProps {
  onAdd: (entry: DailyEntry) => void;
  config: AppConfig;
  entries: DailyEntry[];
}

const QuickKM: React.FC<QuickKMProps> = ({ onAdd, config, entries }) => {
  const [totalKm, setTotalKm] = useState<string>('');
  const [date, setDate] = useState<string>(getLocalDateStr());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate fuel price based on expenses for the selected date
  const fuelPrice = React.useMemo(() => {
    const dayFuelExpenses = entries.filter(e => 
      e.date === date && 
      e.category === 'fuel' && 
      e.liters && 
      e.liters > 0
    );

    if (dayFuelExpenses.length > 0) {
      const totalSpent = dayFuelExpenses.reduce((acc, curr) => acc + curr.fuel, 0);
      const totalLiters = dayFuelExpenses.reduce((acc, curr) => acc + (curr.liters || 0), 0);
      return totalSpent / totalLiters;
    }

    return config.lastFuelPrice || 0;
  }, [entries, date, config.lastFuelPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numTotalKm = parseFloat(totalKm);
    if (isNaN(numTotalKm) || numTotalKm <= 0) return;

    const lastKm = config.lastTotalKm || 0;
    const kmDriven = lastKm > 0 ? numTotalKm - lastKm : 0;

    const newEntry: DailyEntry = {
      id: generateId(),
      date,
      time: new Date().toTimeString().slice(0, 5),
      storeName: 'Fechamento de KM',
      grossAmount: 0,
      fuel: 0,
      food: 0,
      maintenance: 0,
      others: 0,
      netAmount: 0,
      kmDriven: kmDriven,
      kmAtMaintenance: numTotalKm, 
      fuelPrice: fuelPrice
    };

    onAdd(newEntry);
    setTotalKm('');
    setShowAdvanced(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-widest">
          <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
            <Navigation size={20} />
          </div>
          Fechamento de KM
        </h3>
        <button 
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          {showAdvanced ? <><ChevronUp size={14} /> Menos</> : <><ChevronDown size={14} /> Data</>}
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <Navigation size={12} className="text-rose-500 dark:text-rose-400" /> KM Total do Veículo
            </label>
            <input
              type="number"
              step="0.1"
              value={totalKm}
              onChange={(e) => setTotalKm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500 transition font-black text-slate-800 dark:text-white text-xl font-mono-num"
              placeholder={`Atual: ${config.lastTotalKm || 0} KM`}
              required
            />
            <AnimatePresence>
              {config.lastTotalKm && totalKm && parseFloat(totalKm) > config.lastTotalKm && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest ml-1"
                >
                  + {(parseFloat(totalKm) - config.lastTotalKm).toFixed(1)} KM rodados
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <Fuel size={12} className="text-rose-500 dark:text-rose-400" /> Preço da Gasolina (Calculado)
            </label>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 flex items-center justify-between">
              <span className="text-slate-400 dark:text-slate-500 font-black text-lg">R$</span>
              <span className="text-slate-800 dark:text-white text-lg font-black font-mono-num">
                {fuelPrice > 0 ? fuelPrice.toFixed(3) : "---"}
              </span>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">/ L</span>
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight ml-1">
              Baseado nos gastos de combustível do dia {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Data do Fechamento</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500 transition font-black text-slate-700 dark:text-slate-200 text-sm" 
                    required 
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          type="submit" 
          className="w-full bg-rose-600 dark:bg-rose-500 text-white font-black py-5 rounded-[2rem] hover:bg-rose-700 dark:hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 dark:shadow-none uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3"
        >
          <Save size={18} /> Salvar Fechamento
        </motion.button>
      </form>
    </motion.div>
  );
};

export default QuickKM;
