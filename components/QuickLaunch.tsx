
import React, { useState } from 'react';
import { calculateDailyEntry, getLocalDateStr } from '../utils/calculations';
import { DailyEntry, AppConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { 
  Plus, 
  Store, 
  DollarSign, 
  CreditCard, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Zap
} from 'lucide-react';

interface QuickLaunchProps {
  onAdd: (entry: DailyEntry) => void;
  existingEntries: DailyEntry[];
  config: AppConfig;
}

const QuickLaunch: React.FC<QuickLaunchProps> = ({ onAdd, existingEntries, config }) => {
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); 
  };

  const [amount, setAmount] = useState<string>('6'); 
  const [storeName, setStoreName] = useState<string>('');
  const [time, setTime] = useState<string>(getCurrentTime());
  const [date, setDate] = useState<string>(getLocalDateStr());
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'pix' | 'caderno'>('pix');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const allStores = Array.from(new Set(existingEntries.filter(e => e.grossAmount > 0).map(e => e.storeName).reverse())) as string[];
  
  // Filtra as lojas do carrossel com base no que o usuário está digitando
  const filteredStores = storeName.trim() === '' 
    ? allStores 
    : allStores.filter(s => s.toLowerCase().includes(storeName.toLowerCase()));

  const suggestionAmounts = [6, 7, 8, 10, 12, 17, 18, 22, 25, 30, 40];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    // Normalização: Se o nome digitado já existe (independente de maiúsculas/minúsculas), 
    // usa o nome que já está no histórico para não duplicar no relatório.
    let finalStoreName = storeName.trim();
    const existingMatch = allStores.find(s => s.toLowerCase() === finalStoreName.toLowerCase());
    if (existingMatch) {
      finalStoreName = existingMatch;
    }

    const newEntry = calculateDailyEntry(numAmount, date, time, finalStoreName, config, undefined, undefined, paymentMethod);
    onAdd(newEntry);
    
    setAmount('6');
    setStoreName('');
    setTime(getCurrentTime());
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
          <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
            <Zap size={20} fill="currentColor" />
          </div>
          Lançamento Rápido
        </h3>
        <button 
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {showAdvanced ? <><ChevronUp size={14} /> Menos</> : <><ChevronDown size={14} /> Mais</>}
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Estabelecimento */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <Store size={12} className="text-indigo-500 dark:text-indigo-400" /> Loja
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              placeholder="Onde foi?"
            />
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-1 px-1">
              {filteredStores.length > 0 ? (
                filteredStores.map(store => (
                  <motion.button
                    key={store}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStoreName(store)}
                    className={`text-[9px] font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap flex-shrink-0 ${storeName === store ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    {store}
                  </motion.button>
                ))
              ) : storeName.trim() !== '' && (
                <div className="text-[9px] font-bold text-slate-400 py-2 px-1 uppercase italic">Nova loja detectada</div>
              )}
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <DollarSign size={12} className="text-indigo-500 dark:text-indigo-400" /> Valor Bruto
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 font-black text-lg">R$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-black text-slate-800 dark:text-white text-xl font-mono-num"
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-1 px-1">
              {suggestionAmounts.map(val => (
                <motion.button
                  key={val}
                  type="button"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setAmount(val.toString())}
                  className={`text-[10px] font-black w-10 h-10 rounded-xl transition-all flex items-center justify-center flex-shrink-0 ${amount === val.toString() ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  {val}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Pagamento */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              <CreditCard size={12} className="text-indigo-500 dark:text-indigo-400" /> Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pix', label: 'PIX' },
                  { id: 'money', label: 'Din.' },
                  { id: 'caderno', label: 'Cad.' }
                ].map(method => (
                  <motion.button 
                    key={method.id}
                    type="button" 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all ${paymentMethod === method.id ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    {method.label}
                  </motion.button>
                ))}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data</label>
                  <button 
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-indigo-200 dark:hover:border-indigo-500"
                  >
                    <Calendar className="text-slate-300 dark:text-slate-600" size={16} />
                    <span>{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Hora</label>
                  <button 
                    type="button"
                    onClick={() => setShowTimePicker(true)}
                    className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-indigo-200 dark:hover:border-indigo-500"
                  >
                    <Clock className="text-slate-300 dark:text-slate-600" size={16} />
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
          className="w-full bg-indigo-600 dark:bg-indigo-500 text-white font-black py-5 rounded-[2rem] hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 dark:shadow-none uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3"
        >
          <Plus size={18} strokeWidth={3} /> Salvar Lançamento
        </motion.button>
      </form>
    </motion.div>
  );
};

export default QuickLaunch;
