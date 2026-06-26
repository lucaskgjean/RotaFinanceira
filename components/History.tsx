
import React, { useState, useMemo } from 'react';
import { DailyEntry, AppConfig, TimeEntry } from '../types';
import { formatCurrency, getWeeklySummary, getDailyStats, getLocalDateStr } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import CustomDateRangePicker from './CustomDateRangePicker';
import CustomSelect from './CustomSelect';
import { 
  Search, 
  Filter, 
  X, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Clock,
  CreditCard,
  Tag,
  Trash2,
  Edit3,
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  Layers,
  Banknote,
  Activity,
  BarChart3,
  ArrowUpRight,
  Smartphone,
  BookOpen,
  Share2
} from 'lucide-react';
import QuickLaunch from './QuickLaunch';
import PerformanceCalendar from './PerformanceCalendar';

// Algoritmo CRC-16 CCITT (0x1021) usado pelo Banco Central para Pix
function crc16(data: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    for (let b = 0; b < 8; b++) {
      const bit = ((byte >> (7 - b)) & 1) === 1;
      const c15 = ((crc >> 15) & 1) === 1;
      crc <<= 1;
      if (c15 !== bit) {
        crc ^= polynomial;
      }
    }
  }
  crc &= 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayload(key: string, name: string, city: string, amount: number, storeName: string): string {
  const cleanKey = key.trim();
  
  // Sanitiza nome (retira acentos, max 25 chars, uppercase)
  let cleanName = (name || 'ROTA FINANCEIRA').trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .slice(0, 25)
    .toUpperCase();
  if (!cleanName) cleanName = 'ROTA FINANCEIRA';

  let cleanCity = (city || 'SAO PAULO').trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .slice(0, 15)
    .toUpperCase();
  if (!cleanCity) cleanCity = 'SAO PAULO';

  // Identificador da transação (TXID). Nome da loja sanitizado, max 25 caracteres, sem espaços
  let cleanTxid = storeName.trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "") // sem espaços para txid estático padrão
    .slice(0, 25)
    .toUpperCase();
  if (!cleanTxid) cleanTxid = 'COBRANCA';

  // GUI (ID 00)
  const gui = "0014br.gov.bcb.pix";
  // Chave Pix (ID 01)
  const keyField = `01${cleanKey.length.toString().padStart(2, '0')}${cleanKey}`;
  const accountInfoValue = `${gui}${keyField}`;
  const accountInfo = `26${accountInfoValue.length.toString().padStart(2, '0')}${accountInfoValue}`;
  
  // Merchant Category Code (ID 52)
  const mcc = "52040000";
  
  // Currency (ID 53)
  const currency = "5303986"; // BRL
  
  // Amount (ID 54)
  const formattedAmount = amount.toFixed(2);
  const amountField = `54${formattedAmount.length.toString().padStart(2, '0')}${formattedAmount}`;
  
  // Country Code (ID 58)
  const country = "5802BR";
  
  // Merchant Name (ID 59)
  const nameField = `59${cleanName.length.toString().padStart(2, '0')}${cleanName}`;
  
  // Merchant City (ID 60)
  const cityField = `60${cleanCity.length.toString().padStart(2, '0')}${cleanCity}`;
  
  // Additional Data (ID 62)
  const txidField = `05${cleanTxid.length.toString().padStart(2, '0')}${cleanTxid}`;
  const additionalData = `62${txidField.length.toString().padStart(2, '0')}${txidField}`;
  
  // Combine parts
  let payload = `000201${accountInfo}${mcc}${currency}${amountField}${country}${nameField}${cityField}${additionalData}6304`;
  
  // Calculate CRC16
  const crc = crc16(payload);
  return payload + crc;
}

interface HistoryProps {
  entries: DailyEntry[];
  timeEntries: TimeEntry[];
  config: AppConfig;
  onDelete: (id: string) => void;
  onEdit: (entry: DailyEntry) => void;
  onUpdate: (entry: DailyEntry) => void;
  onBulkUpdateStoreName: (oldName: string, newName: string) => void;
  onBulkUpdatePaidStatus?: (ids: string[], isPaid: boolean) => void;
  filterStore: string;
  onFilterStoreChange: (val: string) => void;
}

const History: React.FC<HistoryProps> = ({ 
  entries, 
  timeEntries, 
  config, 
  onDelete, 
  onEdit, 
  onUpdate, 
  onBulkUpdateStoreName, 
  onBulkUpdatePaidStatus,
  filterStore, 
  onFilterStoreChange 
}) => {
  const todayStr = getLocalDateStr();
  const [filterStartDate, setFilterStartDate] = useState<string>(todayStr);
  const [filterEndDate, setFilterEndDate] = useState<string>(todayStr);
  const [filterPayment, setFilterPayment] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [showPaymentSelect, setShowPaymentSelect] = useState(false);
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [showStoreSelect, setShowStoreSelect] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [isEditingStoreName, setIsEditingStoreName] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [billingStore, setBillingStore] = useState<{ name: string; totalDue: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [confirmingStoreIds, setConfirmingStoreIds] = useState<string[] | null>(null);

  const storePendingBalances = useMemo(() => {
    const map: Record<string, { totalDue: number; totalEntries: number; totalPaid: number; entryIds: string[] }> = {};
    
    entries.forEach(e => {
      if (e.grossAmount <= 0 || e.storeName === 'Fechamento de KM') return;
      
      const matchRange = (filterStartDate || filterEndDate) ? (
        (!filterStartDate || e.date >= filterStartDate) &&
        (!filterEndDate || e.date <= filterEndDate)
      ) : true;
      
      if (!matchRange) return;
      
      const store = e.storeName || 'Geral';
      if (!map[store]) {
        map[store] = { totalDue: 0, totalEntries: 0, totalPaid: 0, entryIds: [] };
      }
      
      if (!e.isPaid) {
        map[store].totalDue += e.grossAmount;
        map[store].entryIds.push(e.id);
        map[store].totalEntries += 1;
      } else {
        map[store].totalPaid += e.grossAmount;
      }
    });

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        totalDue: data.totalDue,
        totalPaid: data.totalPaid,
        totalEntries: data.totalEntries,
        entryIds: data.entryIds
      }))
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [entries, filterStartDate, filterEndDate]);

  const storesWithDues = useMemo(() => {
    return storePendingBalances.filter(item => item.totalDue > 0);
  }, [storePendingBalances]);

  const handleBillStore = (store: { name: string; totalDue: number }) => {
    setBillingStore(store);
    setCopied(false);
  };

  const handleShare = async (storeName: string, amount: number, pixCode: string, qrCodeUrl: string) => {
    try {
      setIsSharing(true);
      
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 750;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');
      
      const grad = ctx.createLinearGradient(0, 0, 0, 750);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 750);
      
      ctx.fillStyle = '#6366f1';
      ctx.font = '900 14px sans-serif';
      ctx.fillText('ROTA FINANCEIRA', 50, 60);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px sans-serif';
      ctx.fillText('Cobrança de Loja', 50, 100);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, 130);
      ctx.lineTo(550, 130);
      ctx.stroke();
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ESTABELECIMENTO', 50, 165);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px sans-serif';
      const storeNameText = storeName.length > 35 ? storeName.slice(0, 35) + '...' : storeName;
      ctx.fillText(storeNameText, 50, 195);
      
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('VALOR PENDENTE', 50, 245);
      
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 32px monospace';
      ctx.fillText(formatCurrency(amount), 50, 285);
      
      ctx.beginPath();
      ctx.moveTo(50, 320);
      ctx.lineTo(550, 320);
      ctx.stroke();

      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(175, 360, 250, 250, 24);
          } else {
            ctx.rect(175, 360, 250, 250);
          }
          ctx.fill();
          ctx.drawImage(qrImg, 185, 370, 230, 230);
          resolve();
        };
        qrImg.onerror = () => {
          reject(new Error('Erro ao desenhar QR code'));
        };
        qrImg.src = qrCodeUrl;
      });
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Escaneie o QR Code acima para pagar', 300, 640);
      ctx.fillText('O Pix Copia e Cola também foi copiado!', 300, 660);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error('Falha ao gerar blob');
        }
        
        const file = new File([blob], `cobranca_${storeName.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
        const shareText = `Olá! Segue cobrança da loja *${storeName}* no valor de *${formatCurrency(amount)}*.\n\nVocê pode pagar escaneando o QR Code na imagem ou utilizando o Pix Copia e Cola abaixo:\n\n${pixCode}`;
        
        try {
          await navigator.clipboard.writeText(pixCode);
        } catch (e) {
          console.warn("Clipboard access denied", e);
        }

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Cobrança - ${storeName}`,
            text: shareText
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `cobranca_${storeName.replace(/\s+/g, '_')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          alert(`Código Pix Copia e Cola copiado para a área de transferência!\n\nAlém disso, a imagem com o QR Code foi baixada para você enviar ao estabelecimento.`);
        }
        setIsSharing(false);
      }, 'image/png');
      
    } catch (err) {
      console.error(err);
      try {
        await navigator.clipboard.writeText(pixCode);
        const shareText = `Olá! Segue cobrança da loja *${storeName}* no valor de *${formatCurrency(amount)}*.\n\nPix Copia e Cola:\n\n${pixCode}`;
        if (navigator.share) {
          await navigator.share({
            title: `Cobrança - ${storeName}`,
            text: shareText
          });
        } else {
          alert(`Código Pix Copia e Cola copiado para a área de transferência!\n\nPix Copia e Cola:\n\n${pixCode}`);
        }
      } catch (e) {
        alert(`Não foi possível compartilhar a imagem, mas o Pix Copia e Cola foi copiado para a área de transferência!`);
      }
      setIsSharing(false);
    }
  };

  const uniqueStores = useMemo(() => {
    return Array.from(new Set(entries.filter(e => e.grossAmount > 0).map(e => e.storeName))).sort();
  }, [entries]);

  const todayEntries = entries.filter(e => e.date === todayStr);

  const filteredEntries = useMemo(() => {
    return entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => {
      // Excluir gastos manuais (grossAmount === 0) e Fechamento de KM (que agora fica na Manutenção)
      if (entry.grossAmount === 0 || entry.storeName === 'Fechamento de KM') return false;

      const matchRange = (filterStartDate || filterEndDate) ? (
        (!filterStartDate || entry.date >= filterStartDate) &&
        (!filterEndDate || entry.date <= filterEndDate)
      ) : true;
      
      const matchPayment = filterPayment ? entry.paymentMethod === filterPayment : true;
      
      const matchStatus = filterStatus ? (
        filterStatus === 'paid' ? entry.isPaid === true : entry.isPaid === false
      ) : true;

      const matchStore = filterStore ? entry.storeName.toLowerCase().includes(filterStore.toLowerCase()) : true;
      
      return matchRange && matchPayment && matchStatus && matchStore;
    }).sort((a, b) => b.index - a.index)
      .map(item => item.entry);
  }, [entries, filterStartDate, filterEndDate, filterPayment, filterStatus, filterStore]);

  const stats = useMemo(() => getWeeklySummary(filteredEntries), [filteredEntries]);
  const dailyBreakdown = useMemo(() => getDailyStats(entries, timeEntries, config), [entries, timeEntries, config]);

  const getPaymentIcon = (method?: string) => {
    switch (method) {
      case 'pix': return <Smartphone size={24} />;
      case 'money': return <Banknote size={24} />;
      case 'debito': return <CreditCard size={24} />;
      case 'caderno': return <BookOpen size={24} />;
      default: return <Wallet size={24} />;
    }
  };

  const getStatusStyles = (isPaid: boolean) => {
    // Fundo cinza claro igual aos botões de ação
    const base = 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 transition-all';
    if (isPaid) {
      return `${base} text-emerald-500 dark:text-emerald-400`;
    }
    return `${base} text-rose-500 dark:text-rose-400`;
  };

  const clearFilters = () => {
    setFilterStartDate(todayStr);
    setFilterEndDate(todayStr);
    setFilterPayment('');
    setFilterStatus('');
    onFilterStoreChange('');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const weekRange = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.getFullYear(), now.getMonth(), diff);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, []);

  const monthRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStartDate !== todayStr || filterEndDate !== todayStr) count++;
    if (filterPayment) count++;
    if (filterStatus) count++;
    if (filterStore) count++;
    return count;
  }, [filterStartDate, filterEndDate, filterPayment, filterStatus, filterStore, todayStr]);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-24"
    >
      {/* Filtros Inteligentes */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 relative">
              <Filter size={16} />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 border-2 border-white dark:border-slate-900 rounded-full" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Filtros de Busca</h3>
              {activeFiltersCount > 0 && (
                <span className="text-[8px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-2 lg:col-span-2">
            <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Período</label>
            
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { label: 'Hoje', start: todayStr, end: todayStr },
                { label: 'Ontem', start: yesterdayStr, end: yesterdayStr },
                { label: 'Semana', start: weekRange.start, end: weekRange.end },
                { label: 'Mês', start: monthRange.start, end: monthRange.end },
                { label: '7 dias', days: 7 },
                { label: '30 dias', days: 30 }
              ].map((p, i) => {
                let pStart = p.start;
                let pEnd = p.end;
                
                if (p.days) {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - p.days + 1);
                  pStart = start.toISOString().split('T')[0];
                  pEnd = end.toISOString().split('T')[0];
                }

                const isSelected = pStart === filterStartDate && pEnd === filterEndDate;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setFilterStartDate(pStart!);
                      setFilterEndDate(pEnd!);
                    }}
                    className={`whitespace-nowrap px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                      isSelected 
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => {
                  const dStart = new Date(filterStartDate + 'T12:00:00');
                  dStart.setDate(dStart.getDate() - 1);
                  const newDateStr = dStart.toISOString().split('T')[0];
                  setFilterStartDate(newDateStr);
                  setFilterEndDate(newDateStr);
                }}
                className="flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 w-12 h-[50px] rounded-2xl transition-all border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 flex-shrink-0"
                title="Dia anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <button 
                type="button"
                onClick={() => setShowRangePicker(true)}
                className="flex-1 flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:border-indigo-200 dark:hover:border-indigo-500/30 h-[50px] min-w-0"
              >
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 truncate">
                  <Calendar className="text-slate-300 dark:text-slate-600 flex-shrink-0" size={14} />
                  <span className="truncate">{new Date(filterStartDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                </div>
                <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 truncate">
                  <span className="truncate">{new Date(filterEndDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const dStart = new Date(filterStartDate + 'T12:00:00');
                  dStart.setDate(dStart.getDate() + 1);
                  const newDateStr = dStart.toISOString().split('T')[0];
                  setFilterStartDate(newDateStr);
                  setFilterEndDate(newDateStr);
                }}
                className="flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 w-12 h-[50px] rounded-2xl transition-all border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 flex-shrink-0"
                title="Próximo dia"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <CustomSelect
              label="Pagamento"
              value={filterPayment}
              options={[
                { id: '', label: 'Todos', icon: <Banknote size={14} /> },
                { id: 'pix', label: config.paymentMethodLabels?.pix || 'PIX', icon: <CreditCard size={14} className="text-indigo-500" /> },
                { id: 'money', label: config.paymentMethodLabels?.money || 'Dinheiro', icon: <Wallet size={14} className="text-emerald-500" /> },
                { id: 'caderno', label: config.paymentMethodLabels?.caderno || 'Caderno', icon: <Tag size={14} className="text-amber-500" /> }
              ]}
              onChange={setFilterPayment}
              isOpen={showPaymentSelect}
              onOpen={() => setShowPaymentSelect(true)}
              onClose={() => setShowPaymentSelect(false)}
            />
          </div>
          <div className="space-y-2">
            <CustomSelect
              label="Status"
              value={filterStatus}
              options={[
                { id: '', label: 'Todos', icon: <Activity size={14} /> },
                { id: 'paid', label: 'Pago', icon: <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> },
                { id: 'pending', label: 'Pendente', icon: <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" /> }
              ]}
              onChange={setFilterStatus}
              isOpen={showStatusSelect}
              onOpen={() => setShowStatusSelect(true)}
              onClose={() => setShowStatusSelect(false)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CustomSelect
                  label="Filtrar por Loja"
                  value={filterStore}
                  options={[
                    { id: '', label: 'Todas as Lojas', icon: <HistoryIcon size={14} /> },
                    ...uniqueStores.map(store => ({
                      id: store,
                      label: store,
                      icon: <Tag size={14} />
                    }))
                  ]}
                  onChange={onFilterStoreChange}
                  isOpen={showStoreSelect}
                  onOpen={() => setShowStoreSelect(true)}
                  onClose={() => setShowStoreSelect(false)}
                />
              </div>
              {filterStore && (
                <button
                  onClick={() => {
                    setNewStoreName(filterStore);
                    setIsEditingStoreName(true);
                  }}
                  className="mt-6 p-3.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm border border-indigo-100 dark:border-indigo-500/20"
                  title="Editar nome desta loja em todos os registros"
                >
                  <Edit3 size={18} />
                </button>
              )}
            </div>
          </div>
          <button 
            onClick={clearFilters}
            className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl transition flex items-center justify-center gap-2"
          >
            <X size={14} /> Limpar
          </button>
        </div>
      </motion.div>

      {/* Card Único de Resumo Financeiro (Período Selecionado) */}
      <motion.div 
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BarChart3 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Resumo Financeiro</h3>
              <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mt-0.5">Desempenho no Período</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
              Bruto: {formatCurrency(stats.totalGross)}
            </span>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full uppercase tracking-widest border border-slate-200 dark:border-slate-700">
              {filteredEntries.length} Itens
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <TrendingUp size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Total Bruto</span>
            </div>
            <p className="text-xl font-black text-slate-800 dark:text-white font-mono-num">{formatCurrency(stats.totalGross)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <ArrowUpRight size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Total Líquido</span>
            </div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num">{formatCurrency(stats.totalNet)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Recebido</span>
            </div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num">{formatCurrency(stats.totalPaid)}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertCircle size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Pendente</span>
            </div>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono-num">{formatCurrency(stats.totalPending)}</p>
          </div>
        </div>
      </motion.div>

      {/* Lista de Movimentações */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
            Histórico Completo
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredEntries.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center"
              >
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-500/5 rounded-full flex items-center justify-center text-indigo-200 dark:text-indigo-900/30">
                    <HistoryIcon size={48} strokeWidth={1} />
                  </div>
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-10 h-10 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-50 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600"
                  >
                    <Search size={20} />
                  </motion.div>
                </div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2">Nada por aqui ainda</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                  Tente ajustar os filtros ou realize um novo lançamento para ver os dados.
                </p>
                {activeFiltersCount > 0 && (
                  <button 
                    onClick={clearFilters}
                    className="mt-6 text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:underline"
                  >
                    Limpar todos os filtros
                  </button>
                )}
              </motion.div>
            ) : (
              filteredEntries.slice(0, visibleCount).map((entry) => (
                <motion.div 
                  layout
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border transition-all group relative overflow-hidden ${
                    entry.isPaid 
                      ? 'border-emerald-400/50 dark:border-emerald-500/30' 
                      : 'border-rose-400/50 dark:border-rose-500/30'
                  } hover:shadow-md`}
                >
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-4 items-center min-w-0 flex-1">
                      <div className={`shrink-0 w-14 h-14 rounded-[1.25rem] border flex items-center justify-center transition-all ${getStatusStyles(entry.isPaid)}`}>
                        {getPaymentIcon(entry.paymentMethod)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-800 dark:text-white leading-tight text-lg truncate">{entry.storeName.replace('[GASTO]', '').trim()}</h4>
                        </div>
                        <div className="flex items-center flex-nowrap gap-x-3 mt-1.5 whitespace-nowrap overflow-hidden">
                          <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight flex items-center gap-1.5">
                            <Calendar size={11} /> {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR').split('/')[0] + '/' + new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR').split('/')[1]}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight flex items-center gap-1.5 border-l border-slate-100 dark:border-slate-800 pl-3">
                            <Clock size={11} /> {entry.time}
                          </span>
                          {entry.paymentMethod && (
                            <span className={`shrink-0 text-[11px] font-black uppercase tracking-tight flex items-center gap-1.5 border-l border-slate-100 dark:border-slate-800 pl-3 ${entry.isPaid ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                              <CreditCard size={11} /> {config.paymentMethodLabels?.[entry.paymentMethod as keyof typeof config.paymentMethodLabels] || entry.paymentMethod}
                            </span>
                          )}
                        </div>
                        {entry.description && (
                          <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium italic border-t border-slate-50 dark:border-slate-800/50 pt-1.5">
                            {entry.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className={`text-xl font-black ${entry.isPaid ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {entry.grossAmount > 0 ? formatCurrency(entry.grossAmount).replace('R$', '') : formatCurrency(entry.fuel + entry.food + entry.maintenance).replace('R$', '')}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight flex items-center justify-end gap-1">
                        <Banknote size={10} /> VALOR
                      </span>
                    </div>
                  </div>

                  {/* Removido a parte de projeção conforme solicitado */}
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onDelete(entry.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 pr-4 pl-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95 group/btn"
                    >
                      <Trash2 size={16} className="text-rose-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Excluir</span>
                    </button>
                    <button 
                      onClick={() => onEdit(entry)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 pr-4 pl-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95 group/btn"
                    >
                      <Edit3 size={16} className="text-indigo-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Editar</span>
                    </button>
                    <button 
                      onClick={() => onUpdate({ ...entry, isPaid: !entry.isPaid })}
                      className="flex-1 flex items-center justify-center gap-2 py-3 pr-4 pl-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95 group/btn"
                    >
                      <div className={entry.isPaid ? 'text-emerald-500' : 'text-rose-500'}>
                        {entry.isPaid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {entry.isPaid ? 'Pago' : 'Pendente'}
                      </span>
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {filteredEntries.length > visibleCount && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setVisibleCount(prev => prev + 40)}
              className="w-full mt-4 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2"
            >
              Ver Mais <ChevronRight size={14} />
            </motion.button>
          )}

          {visibleCount > 3 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setVisibleCount(3)}
              className="w-full mt-2 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-all flex items-center justify-center gap-2"
            >
              Recolher <X size={12} />
            </motion.button>
          )}
        </div>
      </div>

      {/* SEÇÃO: COBRANÇA DE LOJAS */}
      <motion.div 
        variants={itemVariants} 
        className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Banknote size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Cobrança das Lojas</h3>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">
                Pendências no período selecionado
              </p>
            </div>
          </div>
          {storesWithDues.length > 0 && (
            <span className="text-[9px] font-black bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-full uppercase tracking-widest border border-rose-100 dark:border-rose-500/10 self-start sm:self-center">
              {storesWithDues.length} {storesWithDues.length === 1 ? 'Loja pendente' : 'Lojas pendentes'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 max-h-[460px] overflow-y-auto -mr-2 pr-2 custom-scrollbar">
          {storesWithDues.length > 0 ? (
            storesWithDues.map((store, idx) => (
              <div 
                key={idx} 
                onMouseLeave={() => {
                  if (confirmingStoreIds && JSON.stringify(confirmingStoreIds) === JSON.stringify(store.entryIds)) {
                    setConfirmingStoreIds(null);
                  }
                }}
                className="flex flex-col p-5 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800/80 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/60 gap-3"
              >
                {/* Linha 1: Posição da Loja e Nome na frente */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-[10px] font-black bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    {idx + 1}º
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-white truncate">
                    {store.name}
                  </span>
                </div>

                {/* Linha 2: Quantidade de Entregas Pendentes e o Valor Pendente */}
                <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900/40 px-3.5 py-2.5 rounded-xl border border-slate-100/80 dark:border-slate-800/50">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <Layers size={11} className="text-indigo-500" />
                    <span>{store.totalEntries} {store.totalEntries === 1 ? 'entrega' : 'entregas'} pendente{store.totalEntries === 1 ? '' : 's'}</span>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">A cobrar:</span>
                    <span className="text-sm font-black text-rose-500 dark:text-rose-400 font-mono-num leading-none">
                      {formatCurrency(store.totalDue)}
                    </span>
                  </div>
                </div>

                {/* Linha 3: Botões de Pago e Cobrar (Alinhamento na linha inferior, Pago primeiro, Cobrar no mesmo estilo) */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {/* Botão Pago */}
                  {confirmingStoreIds && JSON.stringify(confirmingStoreIds) === JSON.stringify(store.entryIds) ? (
                    <button
                      onClick={() => {
                        if (onBulkUpdatePaidStatus && store.entryIds && store.entryIds.length > 0) {
                          onBulkUpdatePaidStatus(store.entryIds, true);
                          setConfirmingStoreIds(null);
                        }
                      }}
                      className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-white dark:text-rose-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 h-10 cursor-pointer animate-pulse"
                    >
                      <CheckCircle2 size={12} strokeWidth={2.5} />
                      Confirmar?
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (store.entryIds && store.entryIds.length > 0) {
                          setConfirmingStoreIds(store.entryIds);
                        }
                      }}
                      className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-emerald-100/50 dark:border-emerald-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 h-10 cursor-pointer"
                    >
                      <CheckCircle2 size={12} strokeWidth={2.5} />
                      Pago
                    </button>
                  )}

                  {/* Botão Cobrar */}
                  <button
                    onClick={() => handleBillStore(store)}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-indigo-100/50 dark:border-indigo-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 h-10 cursor-pointer"
                  >
                    <Smartphone size={12} strokeWidth={2.5} />
                    Cobrar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-4 shadow-inner">
                <Check size={28} strokeWidth={3} />
              </div>
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-1.5">Tudo em dia!</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-normal max-w-sm">
                Nenhum valor pendente para cobrar das lojas no período selecionado.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Calendário de Performance */}
      <PerformanceCalendar dailyStats={dailyBreakdown} />

      <AnimatePresence>
        {showRangePicker && (
          <CustomDateRangePicker 
            startDate={filterStartDate} 
            endDate={filterEndDate} 
            onChange={(start, end) => {
              setFilterStartDate(start);
              setFilterEndDate(end);
            }} 
            onClose={() => setShowRangePicker(false)} 
          />
        )}
        {billingStore && (() => {
          const hasPixConfig = config.pixKey && config.pixKey.trim().length > 0;
          const pixCode = hasPixConfig 
            ? generatePixPayload(config.pixKey!, config.pixName || '', config.pixCity || '', billingStore.totalDue, billingStore.name)
            : '';
          const qrCodeUrl = hasPixConfig
            ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`
            : '';

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-5 shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-y-auto max-h-[92vh] custom-scrollbar"
              >
                <button 
                  onClick={() => setBillingStore(null)}
                  className="absolute top-4 right-4 p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 rounded-full transition-all"
                >
                  <X size={14} />
                </button>

                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Cobrança de Loja</h3>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Enviar cobrança via Pix</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Estabelecimento</span>
                    <span className="block text-sm font-black text-slate-800 dark:text-white">{billingStore.name}</span>
                  </div>

                  <div className="p-3 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl border border-rose-500/10">
                    <span className="block text-[8px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Valor Não Recebido (Pendente)</span>
                    <span className="block text-lg font-black text-rose-600 dark:text-rose-400 font-mono-num">{formatCurrency(billingStore.totalDue)}</span>
                  </div>
                </div>

                {hasPixConfig ? (
                  <div className="space-y-4 flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-none flex items-center justify-center">
                      <img 
                        src={qrCodeUrl} 
                        alt="Pix QR Code" 
                        className="w-36 h-36 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="w-full space-y-1.5">
                      <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Pix Copia e Cola</label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-[11px] font-mono rounded-xl border border-slate-100 dark:border-slate-800 break-all select-all text-slate-600 dark:text-slate-300 max-h-12 overflow-y-auto custom-scrollbar">
                          {pixCode}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pixCode);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className={`px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center justify-center ${copied ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        >
                          {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center space-y-3">
                    <div className="w-10 h-10 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Chave Pix não encontrada</h4>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal font-bold uppercase tracking-tight">
                        Para gerar o código Pix automático, configure sua chave Pix e o seu nome de beneficiário na aba <span className="text-indigo-500 font-black">Perfil</span> nas Configurações.
                      </p>
                    </div>
                  </div>
                )}

                {hasPixConfig && (
                  <div className="w-full mt-4">
                    <button
                      onClick={() => handleShare(billingStore.name, billingStore.totalDue, pixCode, qrCodeUrl)}
                      disabled={isSharing}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md hover:shadow-indigo-500/20 flex items-center justify-center gap-1.5 cursor-pointer h-11"
                    >
                      <Share2 size={12} className={isSharing ? 'animate-spin' : ''} />
                      {isSharing ? 'Gerando Imagem...' : 'Compartilhar Cobrança'}
                    </button>
                  </div>
                )}

                <div className="mt-3">
                  <button 
                    onClick={() => setBillingStore(null)}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition h-11"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
        {isEditingStoreName && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-widest">Renomear Loja</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Atualização em massa</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Isso alterará o nome <span className="font-black text-indigo-500">"{filterStore}"</span> para o novo nome em <span className="font-black text-slate-800 dark:text-white">TODOS</span> os registros do seu histórico.
                </p>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Novo Nome da Loja</label>
                  <input 
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-slate-800 dark:text-white font-bold focus:border-indigo-500 outline-none transition-all"
                    placeholder="Ex: Novo Nome da Loja"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditingStoreName(false)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onBulkUpdateStoreName(filterStore, newStoreName);
                    onFilterStoreChange(newStoreName);
                    setIsEditingStoreName(false);
                  }}
                  disabled={!newStoreName || newStoreName === filterStore}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default History;
