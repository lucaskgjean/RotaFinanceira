
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DailyEntry, AppConfig } from '../types';
import { calculateDailyEntry, calculateManualExpense, calculateKmClosing } from '../utils/calculations';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock } from 'lucide-react';

interface EditModalProps {
  entry: DailyEntry;
  config: AppConfig;
  onSave: (updatedEntry: DailyEntry) => void;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ entry, config, onSave, onClose }) => {
  const isIncome = entry.grossAmount > 0;
  const isKmClosing = entry.storeName === 'Fechamento de KM';
  
  const [amount, setAmount] = useState<string>(
    isIncome ? entry.grossAmount.toString() : (entry.fuel + entry.food + entry.maintenance + (entry.others || 0)).toString()
  );
  const [description, setDescription] = useState<string>(
    isIncome ? entry.storeName : entry.storeName.replace('[GASTO] ', '')
  );
  const [date, setDate] = useState<string>(entry.date);
  const [time, setTime] = useState<string>(entry.time);
  const [kmDriven, setKmDriven] = useState<string>(entry.kmDriven?.toString() || '');
  const [fuelPrice, setFuelPrice] = useState<string>(entry.fuelPrice?.toString() || '');
  const [kmAtMaintenance, setKmAtMaintenance] = useState<string>(entry.kmAtMaintenance?.toString() || '');
  const [kmType, setKmType] = useState<'work' | 'personal'>(entry.kmType || 'work');
  const [liters, setLiters] = useState<string>(entry.liters?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'pix' | 'debito' | 'caderno'>(entry.paymentMethod || 'pix');
  const [isPaid, setIsPaid] = useState<boolean>(entry.isPaid || false);
  const [category, setCategory] = useState<'fuel' | 'food' | 'maintenance' | 'others'>(
    entry.fuel > 0 ? 'fuel' : entry.food > 0 ? 'food' : entry.maintenance > 0 ? 'maintenance' : 'others'
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const heightDiff = window.innerHeight - viewport.height;
      setKeyboardHeight(heightDiff > 0 ? heightDiff : 0);
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isKmClosing) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) return;
    }

    const numKm = kmDriven ? parseFloat(kmDriven) : undefined;
    const numFuelPrice = fuelPrice ? parseFloat(fuelPrice) : undefined;
    const numKmAtMaintenance = kmAtMaintenance ? parseFloat(kmAtMaintenance) : undefined;
    const numLiters = liters ? parseFloat(liters) : undefined;

    let updated: DailyEntry;
    if (isKmClosing) {
      updated = {
        ...calculateKmClosing(numKmAtMaintenance || 0, config.lastTotalKm || 0, numFuelPrice || 0, date, time, kmType),
        id: entry.id
      };
    } else if (isIncome) {
      updated = {
        ...calculateDailyEntry(parseFloat(amount), date, time, description, config, numKm, numFuelPrice, paymentMethod),
        id: entry.id,
        isPaid: paymentMethod === 'money' ? true : isPaid
      };
    } else {
      updated = {
        ...calculateManualExpense(parseFloat(amount), category, date, time, description, numKmAtMaintenance, paymentMethod, numLiters),
        id: entry.id,
        isPaid: paymentMethod === 'money' ? true : isPaid
      };
    }
    
    onSave(updated);
  };

  const modalContent = (
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
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            bottom: keyboardHeight > 0 ? keyboardHeight : 'auto'
          }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={{
            maxHeight: keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px - 32px)` : '90vh'
          }}
          className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-transparent dark:border-slate-800 pointer-events-auto"
        >
          <div className={`p-6 text-white flex justify-between items-center ${isKmClosing ? 'bg-rose-500' : isIncome ? 'bg-indigo-600' : 'bg-rose-500'}`}>
            <div>
              <h3 className="text-xl font-bold">Editar {isKmClosing ? 'Fechamento KM' : isIncome ? 'Corrida' : 'Gasto'}</h3>
              <p className="text-xs opacity-80">ID: {entry.id.slice(0, 8)}...</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSave} className="p-8 space-y-5 max-h-[80vh] overflow-y-auto">
            {isKmClosing ? (
              <div className="space-y-5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tipo de KM</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setKmType('work')}
                      className={`px-4 py-2 flex items-center justify-center rounded-lg text-sm font-black transition-all ${kmType === 'work' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setKmType('personal')}
                      className={`px-4 py-2 flex items-center justify-center rounded-lg text-sm font-black transition-all ${kmType === 'personal' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      -
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">KM Total do Veículo</label>
                  <input 
                    type="number" step="0.1" required autoFocus
                    value={kmAtMaintenance} onChange={(e) => setKmAtMaintenance(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-4 text-2xl font-black text-slate-800 dark:text-white focus:border-rose-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Preço Gasolina (R$/L)</label>
                  <input 
                    type="number" step="0.001" required
                    value={fuelPrice} onChange={(e) => setFuelPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-rose-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Valor Principal */}
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Valor do Lançamento</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 font-bold">R$</span>
                    <input 
                      type="number" step="0.01" required autoFocus
                      value={amount} onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-2xl font-black text-slate-800 dark:text-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Categoria ou Origem */}
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">
                    {isIncome ? 'Estabelecimento / App' : 'Categoria do Gasto'}
                  </label>
                  {isIncome ? (
                    <input 
                      type="text" required
                      value={description} onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 font-bold focus:border-indigo-500 outline-none transition-all"
                    />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { id: 'fuel', label: 'Comb.', color: 'bg-red-500' },
                        { id: 'food', label: 'Alim.', color: 'bg-orange-500' },
                        { id: 'maintenance', label: 'Manut.', color: 'bg-blue-500' },
                        { id: 'others', label: 'Outros.', color: 'bg-slate-500' }
                      ].map(cat => (
                        <button
                          key={cat.id} type="button"
                          onClick={() => setCategory(cat.id as any)}
                          className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${category === cat.id ? `${cat.color} border-transparent text-white shadow-lg` : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!isIncome && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Descrição do Gasto</label>
                      <input 
                        type="text"
                        value={description} onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 font-bold focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    {category === 'fuel' && (
                      <div>
                        <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Litros Abastecidos</label>
                        <input 
                          type="number" step="0.01"
                          value={liters} onChange={(e) => setLiters(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    )}
                    {category === 'maintenance' && (
                      <div>
                        <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">KM no Momento do Serviço</label>
                        <input 
                          type="number"
                          value={kmAtMaintenance} onChange={(e) => setKmAtMaintenance(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Forma de Pagamento</label>
                  <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'caderno', label: 'Caderno' },
                        { id: 'debito', label: 'Débito' },
                        { id: 'money', label: 'Dinheiro' },
                        { id: 'pix', label: 'PIX' }
                      ].map(pay => (
                        <button
                          key={pay.id} type="button"
                          onClick={() => {
                            setPaymentMethod(pay.id as any);
                            if (pay.id === 'money') setIsPaid(true);
                          }}
                          className={`py-3 rounded-xl border-2 font-black text-[10px] uppercase transition-all ${paymentMethod === pay.id ? 'bg-slate-800 dark:bg-slate-700 border-transparent text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}
                        >
                          {pay.label}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Status de Recebimento */}
                {paymentMethod !== 'money' && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Status</span>
                      <span className={`text-sm font-bold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {isPaid ? 'Recebido / Pago' : 'Pendente'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPaid(!isPaid)}
                      className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${isPaid ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400'}`}
                    >
                      {isPaid ? 'Pago' : 'Pendente'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Data</label>
                <button 
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none transition-all"
                >
                  <Calendar size={16} className="text-slate-400" />
                  <span>{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </button>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Hora</label>
                <button 
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none transition-all"
                >
                  <Clock size={16} className="text-slate-400" />
                  <span>{time}</span>
                </button>
              </div>
            </div>

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

            <div className="pt-4 flex gap-3">
              <button 
                type="button" onClick={onClose}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black uppercase text-xs rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className={`flex-[2] py-4 text-white font-black uppercase text-xs rounded-2xl shadow-xl transition-all active:scale-95 ${isKmClosing ? 'bg-rose-500 shadow-rose-200 dark:shadow-none hover:bg-rose-600' : isIncome ? 'bg-indigo-600 shadow-indigo-200 dark:shadow-none hover:bg-indigo-700' : 'bg-rose-500 shadow-rose-200 dark:shadow-none hover:bg-rose-600'}`}
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default EditModal;
