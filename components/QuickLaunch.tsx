import React, { useState, useMemo } from 'react';
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
  Zap,
  X,
  Briefcase,
  Calculator,
  Layers
} from 'lucide-react';

const normalizeText = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

interface QuickLaunchProps {
  onAdd: (entry: DailyEntry) => void;
  existingEntries: DailyEntry[];
  config: AppConfig;
}

type LaunchMode = 'single' | 'shift';

const QuickLaunch: React.FC<QuickLaunchProps> = ({ onAdd, existingEntries, config }) => {
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); 
  };

  // Modo de lançamento: 'single' (Corrida avulsa) ou 'shift' (Turno / Fechamento de período)
  const [mode, setMode] = useState<LaunchMode>(() => {
    const saved = localStorage.getItem('rota_quicklaunch_mode');
    return saved === 'shift' ? 'shift' : 'single';
  });

  const handleModeChange = (newMode: LaunchMode) => {
    setMode(newMode);
    localStorage.setItem('rota_quicklaunch_mode', newMode);
  };

  // Estado geral comum
  const [storeName, setStoreName] = useState<string>('');
  const [time, setTime] = useState<string>(getCurrentTime());
  const [date, setDate] = useState<string>(getLocalDateStr());
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'pix' | 'debito' | 'caderno'>('pix');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Estados específicos para Modo Avulso
  const [singleAmount, setSingleAmount] = useState<string>('6');
  const [singleDescription, setSingleDescription] = useState<string>('');

  // Estados específicos para Modo Turno / Fechamento
  const [deliveryCount, setDeliveryCount] = useState<string>('1');
  const [shiftTotalAmount, setShiftTotalAmount] = useState<string>('');
  const [shiftDescription, setShiftDescription] = useState<string>('');
  
  // Calculadora opcional para Modo Turno (Diária fixa + taxa por entrega)
  const [showShiftCalc, setShowShiftCalc] = useState(false);
  const [fixedDailyRate, setFixedDailyRate] = useState<string>('50');
  const [ratePerDelivery, setRatePerDelivery] = useState<string>('8');

  // Lojas e histórico de descrições existentes
  const allStores = useMemo(() => {
    return Array.from(new Set(existingEntries.filter(e => e.grossAmount > 0).map(e => e.storeName).reverse())) as string[];
  }, [existingEntries]);

  const allDescriptions = useMemo(() => {
    return Array.from(new Set(existingEntries.filter(e => e.description).map(e => e.description!).reverse())) as string[];
  }, [existingEntries]);

  const updatePaymentMethodForStore = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    
    const lastEntryForStore = [...existingEntries]
      .reverse()
      .find(e => e.grossAmount > 0 && normalizeText(e.storeName) === normalizeText(trimmedName));

    if (lastEntryForStore && lastEntryForStore.paymentMethod) {
      setPaymentMethod(lastEntryForStore.paymentMethod);
    }
  };

  // Filtra as lojas do carrossel com base no que o usuário está digitando
  const filteredStores = useMemo(() => {
    return storeName.trim() === '' 
      ? allStores 
      : allStores.filter(s => normalizeText(s).includes(normalizeText(storeName)));
  }, [storeName, allStores]);

  const activeDescription = mode === 'single' ? singleDescription : shiftDescription;
  const filteredDescriptions = useMemo(() => {
    return activeDescription.trim() === ''
      ? allDescriptions
      : allDescriptions.filter(d => normalizeText(d).includes(normalizeText(activeDescription)));
  }, [activeDescription, allDescriptions]);

  const suggestionAmounts = [6, 7, 8, 10, 12, 17, 18, 22, 25, 30, 40];

  // Aplica o cálculo da diária fixa + taxas ao valor total do turno
  const handleApplyShiftCalculation = () => {
    const daily = parseFloat(fixedDailyRate) || 0;
    const rate = parseFloat(ratePerDelivery) || 0;
    const count = parseInt(deliveryCount) || 0;
    const calculatedTotal = daily + (count * rate);
    if (calculatedTotal > 0) {
      setShiftTotalAmount(calculatedTotal.toFixed(2));
    }
  };

  const handleSave = (paid: boolean) => {
    if (mode === 'single') {
      const numAmount = parseFloat(singleAmount);
      if (isNaN(numAmount) || numAmount <= 0) return;

      const finalStoreName = storeName.trim();
      const newEntry = calculateDailyEntry(
        numAmount, 
        date, 
        time, 
        finalStoreName, 
        config, 
        undefined, 
        undefined, 
        paymentMethod, 
        paid, 
        singleDescription.trim(),
        'single',
        1
      );
      onAdd(newEntry);
      
      setSingleAmount('6');
      setStoreName('');
      setSingleDescription('');
      setTime(getCurrentTime());
    } else {
      // Modo Turno / Fechamento
      const numTotal = parseFloat(shiftTotalAmount);
      const parsedCount = parseInt(deliveryCount, 10);

      // Não é possível salvar turno sem a quantidade de corridas (mínimo 1) ou sem valor
      if (isNaN(parsedCount) || parsedCount < 1) {
        return;
      }
      if (isNaN(numTotal) || numTotal <= 0) {
        return;
      }

      const finalCount = parsedCount;
      const finalStoreName = storeName.trim();

      const defaultDesc = `Turno (${finalCount} corridas)`;
      const finalDesc = shiftDescription.trim() ? shiftDescription.trim() : defaultDesc;

      const newEntry = calculateDailyEntry(
        numTotal,
        date,
        time,
        finalStoreName || 'Turno / Fechamento',
        config,
        undefined,
        undefined,
        paymentMethod,
        paid,
        finalDesc,
        'shift',
        finalCount
      );
      onAdd(newEntry);

      // Reseta os campos do turno mantendo praticidade
      setShiftTotalAmount('');
      setDeliveryCount('1');
      setShiftDescription('');
      setTime(getCurrentTime());
    }

    // Remove o foco para fechar teclado no mobile
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave(true);
  };

  const getPaymentLabel = (id: string, defaultLabel: string) => {
    return config.paymentMethodLabels?.[id as keyof typeof config.paymentMethodLabels] || defaultLabel;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800"
    >
      {/* Top Header com Seletor de Modo (Avulso vs. Turno) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none shrink-0">
            {mode === 'single' ? <Zap size={20} fill="currentColor" /> : <Briefcase size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest leading-none">
              Lançamento Rápido
            </h3>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {mode === 'single' ? 'Corrida por corrida' : 'Turno e diária'}
            </span>
          </div>
        </div>

        {/* Segmented Control para alternar entre os modos */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
            <button
              type="button"
              onClick={() => handleModeChange('single')}
              className={`relative px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'single'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {mode === 'single' && (
                <motion.div
                  layoutId="quicklaunch-mode-pill"
                  className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/40 dark:border-slate-700/60"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <Zap size={12} fill={mode === 'single' ? 'currentColor' : 'none'} />
                <span>Avulso</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('shift')}
              className={`relative px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'shift'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {mode === 'shift' && (
                <motion.div
                  layoutId="quicklaunch-mode-pill"
                  className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/40 dark:border-slate-700/60"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                <Briefcase size={12} />
                <span>Turno</span>
              </span>
            </button>
          </div>

          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1.5 px-1 cursor-pointer"
            title={showAdvanced ? "Ocultar opções adicionais" : "Mostrar mais opções"}
          >
            <span>{showAdvanced ? 'Menos' : 'Mais'}</span>
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =========================================================================
            MODO 1: CORRIDA AVULSA (Modo corrida por corrida)
           ========================================================================= */}
        {mode === 'single' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Estabelecimento */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                <Store size={12} className="text-indigo-500 dark:text-indigo-400" /> Loja
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStoreName(val);
                    const matchedStore = allStores.find(s => normalizeText(s) === normalizeText(val));
                    if (matchedStore) {
                      updatePaymentMethodForStore(matchedStore);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-5 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 text-sm"
                  placeholder="Onde foi?"
                />
                {storeName && (
                  <button
                    type="button"
                    onClick={() => setStoreName('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                    title="Limpar loja"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-1 px-1 h-10 items-center">
                {filteredStores.length > 0 ? (
                  filteredStores.map(store => (
                    <motion.button
                      key={store}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setStoreName(store);
                        updatePaymentMethodForStore(store);
                      }}
                      className={`text-[10px] font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                        normalizeText(storeName) === normalizeText(store) 
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {store}
                    </motion.button>
                  ))
                ) : storeName.trim() !== '' && !allStores.some(s => normalizeText(s) === normalizeText(storeName)) && (
                  <div className="text-[10px] font-bold text-slate-400 py-2 px-1 uppercase italic">Nova loja detectada</div>
                )}
              </div>
            </div>

            {/* Valor */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                <DollarSign size={12} className="text-indigo-500 dark:text-indigo-400" /> Valor da Corrida
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={singleAmount}
                  onChange={(e) => setSingleAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 text-sm font-mono-num"
                  placeholder="0.00"
                  required
                />
                {singleAmount && (
                  <button
                    type="button"
                    onClick={() => setSingleAmount('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                    title="Limpar valor"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-1 px-1 h-10 items-center">
                {suggestionAmounts.map(val => (
                  <motion.button
                    key={val}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSingleAmount(val.toString())}
                    className={`text-[10px] font-bold px-4 py-2 min-w-[42px] rounded-xl transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${
                      singleAmount === val.toString() 
                        ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {val}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Pagamento */}
            <div className="space-y-3">
              <div className="flex justify-between items-center ml-1">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <CreditCard size={12} className="text-indigo-500 dark:text-indigo-400" /> Pagamento
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pix', label: getPaymentLabel('pix', 'PIX') },
                  { id: 'money', label: getPaymentLabel('money', 'Din.') },
                  { id: 'caderno', label: getPaymentLabel('caderno', 'Cad.') }
                ].map(method => (
                  <motion.button 
                    key={method.id}
                    type="button" 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all cursor-pointer ${
                      paymentMethod === method.id 
                        ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-lg' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    {method.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
              MODO 2: TURNO / FECHAMENTO (Padrão de tamanhos e layout alinhado)
             ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna 1: Loja do Turno */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                <Store size={12} className="text-indigo-500 dark:text-indigo-400" /> Loja do Turno
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStoreName(val);
                    const matchedStore = allStores.find(s => normalizeText(s) === normalizeText(val));
                    if (matchedStore) {
                      updatePaymentMethodForStore(matchedStore);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-5 pr-12 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 text-sm"
                  placeholder="Onde foi o turno?"
                />
                {storeName && (
                  <button
                    type="button"
                    onClick={() => setStoreName('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                    title="Limpar loja"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-1 px-1 h-10 items-center">
                {filteredStores.length > 0 ? (
                  filteredStores.map(store => (
                    <motion.button
                      key={store}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setStoreName(store);
                        updatePaymentMethodForStore(store);
                      }}
                      className={`text-[10px] font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                        normalizeText(storeName) === normalizeText(store)
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {store}
                    </motion.button>
                  ))
                ) : storeName.trim() !== '' && !allStores.some(s => normalizeText(s) === normalizeText(storeName)) && (
                  <div className="text-[10px] font-bold text-slate-400 py-2 px-1 uppercase italic">Nova loja detectada</div>
                )}
              </div>
            </div>

            {/* Coluna 2: Quantidade de Corridas e Valor Total na mesma linha */}
            <div className="space-y-3">
              {/* Cabeçalhos lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                    <Layers size={12} className="text-indigo-500 dark:text-indigo-400 shrink-0" /> Corridas
                  </label>
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                    {deliveryCount ? `${deliveryCount}x` : ''}
                  </span>
                </div>

                <div className="flex justify-between items-center ml-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                    <DollarSign size={12} className="text-indigo-500 dark:text-indigo-400 shrink-0" /> Valor Total
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowShiftCalc(!showShiftCalc)}
                    className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                    title="Calcular diária fixa + taxa por entrega"
                  >
                    <Calculator size={10} />
                    <span>{showShiftCalc ? 'Fechar' : 'Calc.'}</span>
                  </button>
                </div>
              </div>

              {/* Inputs lado a lado na mesma linha */}
              <div className="grid grid-cols-2 gap-3">
                {/* Quantidade de Corridas */}
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(deliveryCount, 10) || 1;
                      if (cur > 1) setDeliveryCount((cur - 1).toString());
                    }}
                    className="absolute left-1.5 w-7 h-7 rounded-xl bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer z-10"
                    title="Diminuir corrida"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={deliveryCount}
                    onChange={(e) => setDeliveryCount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-10 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 text-sm font-mono-num text-center"
                    placeholder="1"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(deliveryCount, 10) || 0;
                      setDeliveryCount((cur + 1).toString());
                    }}
                    className="absolute right-1.5 w-7 h-7 rounded-xl bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer z-10"
                    title="Aumentar corrida"
                  >
                    +
                  </button>
                </div>

                {/* Valor Total */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={shiftTotalAmount}
                    onChange={(e) => setShiftTotalAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-11 pr-8 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 text-sm font-mono-num"
                    placeholder="0.00"
                    required
                  />
                  {shiftTotalAmount && (
                    <button
                      type="button"
                      onClick={() => setShiftTotalAmount('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                      title="Limpar valor"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-painel: Calculadora de Diária Fixa + Taxa por Entrega (apenas se acionada) */}
              {showShiftCalc && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2 mt-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Diária (R$)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={fixedDailyRate}
                        onChange={(e) => setFixedDailyRate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 dark:text-white font-mono-num"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Taxa (R$)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={ratePerDelivery}
                        onChange={(e) => setRatePerDelivery(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 dark:text-white font-mono-num"
                        placeholder="8"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyShiftCalculation}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Calcular Total
                  </button>
                </motion.div>
              )}
            </div>

            {/* Coluna 3: Forma de Pagamento */}
            <div className="space-y-3">
              <div className="flex justify-between items-center ml-1">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <CreditCard size={12} className="text-indigo-500 dark:text-indigo-400" /> Pagamento
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pix', label: getPaymentLabel('pix', 'PIX') },
                  { id: 'money', label: getPaymentLabel('money', 'Din.') },
                  { id: 'caderno', label: getPaymentLabel('caderno', 'Cad.') }
                ].map(method => (
                  <motion.button 
                    key={method.id}
                    type="button" 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all cursor-pointer ${
                      paymentMethod === method.id 
                        ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-lg' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                    }`}
                  >
                    {method.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            OPÇÕES AVANÇADAS EXPANSÍVEIS (Data, Hora e Observações)
           ========================================================================= */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              {/* Data e Horário na mesma linha */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data</label>
                  <button 
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    className="w-full flex items-center justify-center sm:justify-start gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-indigo-200 dark:hover:border-indigo-500 cursor-pointer"
                  >
                    <Calendar className="text-slate-300 dark:text-slate-600 shrink-0" size={16} />
                    <span className="truncate">{new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Horário</label>
                  <button 
                    type="button"
                    onClick={() => setShowTimePicker(true)}
                    className="w-full flex items-center justify-center sm:justify-start gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-indigo-200 dark:hover:border-indigo-500 cursor-pointer"
                  >
                    <Clock className="text-slate-300 dark:text-slate-600 shrink-0" size={16} />
                    <span>{time}</span>
                  </button>
                </div>
              </div>

              {/* Descrição Oculta (Expandível) */}
              <div className="mt-4 space-y-2">
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Observação / Descrição
                </label>
                <div className="relative p-1">
                  <input
                    type="text"
                    value={mode === 'single' ? singleDescription : shiftDescription}
                    onChange={(e) => {
                      if (mode === 'single') {
                        setSingleDescription(e.target.value);
                      } else {
                        setShiftDescription(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-medium text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    placeholder={mode === 'single' ? "Bairro ou detalhe (opcional)" : "Ex: Turno chuvoso, taxa extra de entrega"}
                  />
                  <div className="flex overflow-x-auto gap-2 mt-3 pb-1 scrollbar-hide -mx-1 px-1">
                    {filteredDescriptions.length > 0 ? (
                      filteredDescriptions.slice(0, 8).map(desc => (
                        <motion.button
                          key={desc}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (mode === 'single') {
                              setSingleDescription(desc);
                            } else {
                              setShiftDescription(desc);
                            }
                          }}
                          className={`text-[9px] font-black px-4 py-2 rounded-xl transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
                            (mode === 'single' ? singleDescription : shiftDescription) === desc 
                              ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {desc}
                        </motion.button>
                      ))
                    ) : activeDescription.trim() !== '' && (
                      <div className="text-[9px] font-bold text-slate-400 py-2 px-1 uppercase italic">Nova descrição</div>
                    )}
                  </div>
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

        {/* Botões de Ação de Salvamento */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSave(true)}
            type="button" 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-4 rounded-2xl transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 border border-emerald-500 shadow-md shadow-emerald-600/25 cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} /> Salvar Pago
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSave(false)}
            type="button" 
            className="flex-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black py-4 rounded-2xl transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 border border-rose-500 shadow-md shadow-rose-600/25 cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} /> Pendente
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default QuickLaunch;
