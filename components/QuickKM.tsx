
import React, { useState } from 'react';
import { DailyEntry, AppConfig } from '../types';
import { generateId, getLocalDateStr } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from './CustomDatePicker';
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
  const [kmType, setKmType] = useState<'work' | 'personal'>('work');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    // O kmDriven é calculado aqui apenas para visualização imediata, 
    // o App.tsx recalculará todos os deltas para garantir consistência total.
    const kmDriven = (lastKm > 0 && numTotalKm > lastKm) ? numTotalKm - lastKm : 0;

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
      fuelPrice: fuelPrice,
      kmType: kmType
    };

    onAdd(newEntry);

    // Fecha o teclado removendo o foco do elemento ativo
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setTotalKm('');
    setKmType('work');
    setShowAdvanced(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800"
    >
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-widest">
          <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
            <Navigation size={18} />
          </div>
          Fechamento de KM
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setKmType('work')}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black transition-all ${kmType === 'work' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setKmType('personal')}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black transition-all ${kmType === 'personal' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              -
            </button>
          </div>
          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {showAdvanced ? <><ChevronUp size={12} /> Menos</> : <><ChevronDown size={12} /> Data</>}
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <Navigation size={10} className="text-blue-500 dark:text-blue-400" /> KM Total do Veículo
            </label>
            <input
              type="number"
              step="0.1"
              value={totalKm}
              onChange={(e) => setTotalKm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-black text-slate-800 dark:text-white text-lg font-mono-num"
              placeholder={`Atual: ${config.lastTotalKm || 0} KM`}
              required
            />
            <AnimatePresence>
              {config.lastTotalKm && totalKm && parseFloat(totalKm) > config.lastTotalKm && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-1.5 text-[9px] font-black uppercase tracking-widest ml-1 ${kmType === 'work' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {kmType === 'work' ? '+' : '-'} {(parseFloat(totalKm) - config.lastTotalKm).toFixed(1)} KM {kmType === 'work' ? 'rodados (Trabalho)' : 'rodados (Pessoal)'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <Fuel size={10} className="text-blue-500 dark:text-blue-400" /> Preço da Gasolina
            </label>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3.5 flex items-center justify-between">
              <span className="text-slate-400 dark:text-slate-500 font-black text-base">R$</span>
              <span className="text-slate-800 dark:text-white text-base font-black font-mono-num">
                {fuelPrice > 0 ? fuelPrice.toFixed(3) : "---"}
              </span>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">/ L</span>
            </div>
            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight ml-1">
              Baseado no dia {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
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
              <div className="pt-5 border-t border-slate-50 dark:border-slate-800">
                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data do Fechamento</label>
                <button 
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 transition-all hover:border-blue-200 dark:hover:border-blue-500/30"
                >
                  <Calendar className="text-slate-300 dark:text-slate-600" size={16} />
                  <span>{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDatePicker && (
            <CustomDatePicker 
              value={date} 
              onChange={setDate} 
              onClose={() => setShowDatePicker(false)} 
            />
          )}
        </AnimatePresence>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onMouseDown={(e) => {
            // Previne o blur do input antes do clique ser registrado, 
            // evitando que o teclado bloqueie a ação no primeiro toque.
            e.preventDefault();
          }}
          type="submit" 
          className="w-full bg-blue-600 dark:bg-blue-500 text-white font-black py-4 rounded-[1.5rem] hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 dark:shadow-none uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2"
        >
          <Save size={16} /> Salvar Fechamento
        </motion.button>
      </form>
    </motion.div>
  );
};

export default QuickKM;
