
import React, { useState } from 'react';
import { calculateManualExpense, getLocalDateStr } from '../utils/calculations';
import { DailyEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { 
  PlusCircle, 
  Fuel, 
  Utensils, 
  Wrench, 
  CreditCard, 
  Calendar, 
  Clock, 
  Navigation,
  Save,
  Tag,
  FileText,
  MoreHorizontal
} from 'lucide-react';

interface QuickExpenseProps {
  onAdd: (entry: DailyEntry) => void;
}

const QuickExpense: React.FC<QuickExpenseProps> = ({ onAdd }) => {
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const [amount, setAmount] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<'fuel' | 'food' | 'maintenance' | 'others'>('fuel');
  const [time, setTime] = useState<string>(getCurrentTime());
  const [date, setDate] = useState<string>(getLocalDateStr());
  const [kmAtMaintenance, setKmAtMaintenance] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'pix' | 'debito'>('money');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const suggestionAmounts = [20, 50, 100, 150];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const numKm = kmAtMaintenance ? parseFloat(kmAtMaintenance) : undefined;
    const numLiters = liters ? parseFloat(liters) : undefined;

    const newEntry = calculateManualExpense(numAmount, category, date, time, description, numKm, paymentMethod, numLiters);
    onAdd(newEntry);
    
    setAmount('');
    setLiters('');
    setDescription('');
    setKmAtMaintenance('');
    setTime(getCurrentTime());
  };

  const categoryConfig = {
    fuel: { color: 'rose', icon: <Fuel size={18} />, label: 'Combustível' },
    food: { color: 'amber', icon: <Utensils size={18} />, label: 'Alimentação' },
    maintenance: { color: 'blue', icon: <Wrench size={18} />, label: 'Manutenção' },
    others: { color: 'slate', icon: <MoreHorizontal size={18} />, label: 'Outros' },
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
            <PlusCircle size={18} />
          </div>
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Lançar Gasto Extra</h3>
        </div>
        <button 
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          {showAdvanced ? 'Menos' : 'Mais'}
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Categoria */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <Tag size={10} /> Categoria
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map(cat => (
                  <button 
                    key={cat}
                    type="button" 
                    onClick={() => setCategory(cat)}
                    className={`py-2 flex flex-col items-center gap-1 rounded-xl border-2 transition-all ${category === cat ? `bg-${categoryConfig[cat].color}-50 dark:bg-${categoryConfig[cat].color}-500/10 border-${categoryConfig[cat].color}-500 text-${categoryConfig[cat].color}-600 dark:text-${categoryConfig[cat].color}-400` : 'bg-slate-50 dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    {categoryConfig[cat].icon}
                    <span className="text-[7px] font-black uppercase tracking-tighter">{categoryConfig[cat].label}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <CreditCard size={10} /> Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 font-black text-base">R$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 transition font-black text-slate-800 dark:text-white text-lg font-mono-num"
                placeholder="0,00"
                required
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestionAmounts.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="text-[9px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition font-black uppercase tracking-widest"
                >
                  R$ {val}
                </button>
              ))}
            </div>
          </div>

          {/* Litros ou KM (Condicional) */}
          <AnimatePresence mode="wait">
            {category === 'fuel' && (
              <motion.div 
                key="fuel-input"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  <Fuel size={10} /> Litros Abastecidos
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 transition font-black text-slate-800 dark:text-white text-base font-mono-num"
                  placeholder="Ex: 10.5"
                  required
                />
              </motion.div>
            )}

            {category === 'maintenance' && (
              <motion.div 
                key="maintenance-input"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  <Navigation size={10} /> KM Atual
                </label>
                <input
                  type="number"
                  value={kmAtMaintenance}
                  onChange={(e) => setKmAtMaintenance(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition font-black text-slate-800 dark:text-white text-base font-mono-num"
                  placeholder="Ex: 45000"
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forma de Pagamento */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <CreditCard size={10} /> Pagamento
            </label>
            <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'money', label: 'Dinheiro' },
                  { id: 'pix', label: 'PIX' },
                  { id: 'debito', label: 'Débito' }
                ].map(method => (
                  <button 
                    key={method.id}
                    type="button" 
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`py-2 text-[8px] font-black rounded-lg border-2 transition-all uppercase tracking-widest ${paymentMethod === method.id ? 'bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-700 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    {method.label}
                  </button>
                ))}
            </div>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    <FileText size={10} /> Descrição
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 transition font-bold text-slate-700 dark:text-slate-200 text-xs"
                    placeholder="Ex: Troca de óleo..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    <Calendar size={10} /> Data
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2.5 text-[10px] font-black focus:outline-none dark:text-slate-200 transition-all hover:border-rose-200 dark:hover:border-rose-500/30"
                  >
                    <Calendar className="text-slate-300 dark:text-slate-600" size={12} />
                    <span>{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    <Clock size={10} /> Hora
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowTimePicker(true)}
                    className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2.5 text-[10px] font-black focus:outline-none dark:text-slate-200 transition-all hover:border-rose-200 dark:hover:border-rose-500/30"
                  >
                    <Clock className="text-slate-300 dark:text-slate-600" size={12} />
                    <span>{time}</span>
                  </button>
                </div>
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
          {showTimePicker && (
            <CustomTimePicker 
              value={time} 
              onChange={setTime} 
              onClose={() => setShowTimePicker(false)} 
            />
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-4 rounded-[1.5rem] hover:bg-black dark:hover:bg-slate-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2"
        >
          <Save size={16} /> Salvar Gasto
        </motion.button>
      </form>
    </motion.div>
  );
};

export default QuickExpense;
