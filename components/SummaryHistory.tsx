import React from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { 
  Clock, AlertCircle, TrendingUp, X, ChevronUp, ChevronDown, 
  CheckCircle2, CreditCard, Calendar, Package, Edit3, Trash2, 
  Check, Smartphone, ChevronRight
} from 'lucide-react';
import { DailyEntry } from '../types';

export interface SummaryStore {
  name: string;
  gross: number;
  count: number;
  paid: number;
  pending: number;
  entryIds: string[];
  paymentMethods: string[];
  entries: DailyEntry[];
  latestDateTime: string;
}

interface SummaryHistoryProps {
  summaryStores: SummaryStore[];
  summarySortMode: 'lancamento' | 'pendente' | 'faturamento';
  setSummarySortMode: (mode: 'lancamento' | 'pendente' | 'faturamento') => void;
  isAllStoresExpanded: boolean;
  setIsAllStoresExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  expandedStores: Record<string, boolean>;
  setExpandedStores: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedSummaryEntries: Record<string, boolean>;
  toggleSummaryEntry: (id: string) => void;
  confirmingStoreStatusName: string | null;
  setConfirmingStoreStatusName: (name: string | null) => void;
  onBulkUpdatePaidStatus?: (entryIds: string[], isPaid: boolean) => void;
  onUpdate: (entry: DailyEntry) => void;
  onEdit: (entry: DailyEntry) => void;
  onDelete: (id: string) => void;
  handleBillStore: (store: { name: string; totalDue: number; entryIds?: string[] }) => void;
  formatCurrency: (val: number) => string;
  itemVariants?: Variants;
}

export const SummaryHistory: React.FC<SummaryHistoryProps> = ({
  summaryStores,
  summarySortMode,
  setSummarySortMode,
  isAllStoresExpanded,
  setIsAllStoresExpanded,
  expandedStores,
  setExpandedStores,
  expandedSummaryEntries,
  toggleSummaryEntry,
  confirmingStoreStatusName,
  setConfirmingStoreStatusName,
  onBulkUpdatePaidStatus,
  onUpdate,
  onEdit,
  onDelete,
  handleBillStore,
  formatCurrency,
  itemVariants,
}) => {
  const getPaymentLabel = (pm: string) => {
    switch (pm) {
      case 'pix': return 'PIX';
      case 'money': return 'Dinheiro';
      case 'debito': return 'Débito';
      case 'caderno': return 'Caderno';
      default: return pm.toUpperCase();
    }
  };

  return (
    <motion.div 
      variants={itemVariants} 
      id="summary-history-section"
      className="space-y-4"
    >
      <div id="summary-history-header" className="flex flex-wrap items-center justify-between gap-3 px-2">
        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
          Histórico Resumido
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de ordenação: Lançamento, Pendente, Faturamento */}
          <div className="flex items-center p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 gap-1 shadow-xs">
            {/* 1. Lançamento */}
            <button
              type="button"
              id="summary-sort-lancamento"
              onClick={() => setSummarySortMode('lancamento')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                summarySortMode === 'lancamento'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Lançamento: ordenar começando pelo lançamento mais recente"
            >
              <Clock size={11} className={summarySortMode === 'lancamento' ? 'text-indigo-500' : 'text-slate-400'} />
              <span>Lançamento</span>
            </button>

            {/* 2. Pendente */}
            <button
              type="button"
              id="summary-sort-pendente"
              onClick={() => setSummarySortMode('pendente')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                summarySortMode === 'pendente'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Pendente: ordenar por lojas com maior valor pendente"
            >
              <AlertCircle size={11} className={summarySortMode === 'pendente' ? 'text-white' : 'text-rose-500'} />
              <span>Pendente</span>
            </button>

            {/* 3. Faturamento */}
            <button
              type="button"
              id="summary-sort-faturamento"
              onClick={() => setSummarySortMode('faturamento')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                summarySortMode === 'faturamento'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Faturamento: ordenar pelas lojas que mais faturaram (Top 1 em diante)"
            >
              <TrendingUp size={11} className={summarySortMode === 'faturamento' ? 'text-emerald-500' : 'text-slate-400'} />
              <span>Faturamento</span>
            </button>
          </div>

          {summaryStores.length > 0 && (
            <span id="summary-history-count" className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/10">
              {summaryStores.length} {summaryStores.length === 1 ? 'Loja' : 'Lojas'}
            </span>
          )}
        </div>
      </div>

      {summaryStores.length === 0 ? (
        <div id="summary-history-empty" className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider py-12">
          Nenhuma loja encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          <div id="summary-history-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isAllStoresExpanded ? summaryStores : summaryStores.slice(0, 5)).map((store, idx) => {
              // Determine styles based on rank (1st: Gold/Yellow, 2nd: Silver/Gray, 3rd: Bronze/Brown, others: Indigo)
              // Following the calendar pattern: clear/soft background, strong border, and matching text color
              let rankStyle = "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 dark:border-indigo-500/40";
              if (idx === 0) {
                rankStyle = "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 dark:border-amber-500/40";
              } else if (idx === 1) {
                rankStyle = "bg-slate-500/10 dark:bg-slate-400/10 text-slate-600 dark:text-slate-300 border border-slate-500/30 dark:border-slate-400/30";
              } else if (idx === 2) {
                rankStyle = "bg-amber-900/10 dark:bg-amber-700/15 text-amber-800 dark:text-amber-500 border border-amber-800/30 dark:border-amber-700/30";
              }

              const storeSlug = store.name.toLowerCase().replace(/\s+/g, '-');
              const isExpanded = !!expandedStores[store.name];

              return (
                <motion.div
                  key={store.name}
                  id={`summary-store-card-${storeSlug}`}
                  variants={itemVariants}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  onClick={() => {
                    setExpandedStores(prev => ({
                      ...prev,
                      [store.name]: !prev[store.name]
                    }));
                  }}
                  className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 transition-all flex flex-col gap-3 cursor-pointer select-none shadow-sm hover:shadow-md"
                >
                  {/* Cabeçalho do Card (Visível sempre) */}
                  <div className="w-full flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Ícone de Posição */}
                      <div id={`summary-store-rank-${storeSlug}`} className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${rankStyle}`}>
                        {idx + 1}
                      </div>
                      {/* Nome da Loja */}
                      <h4 id={`summary-store-title-${storeSlug}`} className="font-black text-sm sm:text-base truncate uppercase tracking-wider text-slate-800 dark:text-white transition-all">
                        {store.name}
                      </h4>
                    </div>

                    {/* Valor Faturado total da loja e Chevron de expansão */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-end">
                        <span id={`summary-store-gross-${storeSlug}`} className="font-mono-num text-xs sm:text-sm font-black whitespace-nowrap text-slate-800 dark:text-white transition-all">
                          {formatCurrency(store.gross)}
                        </span>
                        {store.pending > 0 && (
                          <span className="text-[9px] font-black text-rose-500 dark:text-rose-400 leading-none mt-0.5">
                            Pend: {formatCurrency(store.pending)}
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 dark:text-slate-500">
                        {isExpanded ? <ChevronUp size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo Expandido com Animação */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        id={`summary-store-expanded-${storeSlug}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Info Row: Entregas e Formas de Pagamento */}
                        <div className="flex items-center justify-between text-xs px-1 border-b border-slate-50 dark:border-slate-800/50 pb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Entregas</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {store.count} {store.count === 1 ? 'entrega' : 'entregas'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pgto</span>
                            <div className="flex flex-wrap gap-1">
                              {store.paymentMethods && store.paymentMethods.length > 0 ? (
                                store.paymentMethods.map(pm => (
                                  <span key={pm} className="text-[8px] font-black bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-lg uppercase tracking-wider border border-slate-100 dark:border-slate-800">
                                    {getPaymentLabel(pm)}
                                  </span>
                                ))
                              ) : (
                                <span className="font-bold text-slate-400">-</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stats Row: Recebido e Pendente lado a lado */}
                        <div className="grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-2xl border border-slate-100/50 dark:border-slate-800/40">
                          {/* Recebido */}
                          <div className="flex flex-col items-center justify-center text-center py-0.5 border-r border-slate-100 dark:border-slate-800/80">
                            <span className="text-[8px] font-black text-emerald-500/90 dark:text-emerald-400/90 uppercase tracking-wider">Recebido</span>
                            <span className="font-mono-num font-black text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                              {formatCurrency(store.paid)}
                            </span>
                          </div>

                          {/* Pendente */}
                          <div className="flex flex-col items-center justify-center text-center py-0.5">
                            <span className={`text-[8px] font-black uppercase tracking-wider ${store.pending > 0 ? 'text-rose-500/90 dark:text-rose-400/90' : 'text-slate-400 dark:text-slate-500'}`}>Pendente</span>
                            <span className={`font-mono-num font-black text-[11px] sm:text-xs mt-1 ${store.pending > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              {formatCurrency(store.pending)}
                            </span>
                          </div>
                        </div>

                        {/* Corridas da Loja (Cards compactos e fluidos expansíveis) */}
                        <div className="space-y-2 my-1">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Package size={12} className="text-indigo-500" /> Corridas no Período ({store.entries?.length || 0})
                            </span>
                            {store.entries && store.entries.some(e => e.kmDriven) && (
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                                Total KM: {store.entries.reduce((acc, curr) => acc + (curr.kmDriven || 0), 0).toFixed(1)} km
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                            {store.entries && store.entries.map((entry) => {
                              const isEntryExpanded = !!expandedSummaryEntries[entry.id];
                              const formattedDate = new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                              return (
                                <div 
                                  key={entry.id}
                                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                    isEntryExpanded
                                      ? 'bg-white dark:bg-slate-900 border-indigo-200/80 dark:border-indigo-800/80 shadow-xs'
                                      : 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/35 dark:hover:bg-slate-800/60 border-slate-150 dark:border-slate-800/60'
                                  }`}
                                >
                                  {/* Linha Resumida (Micro-Row clicável) */}
                                  <div 
                                    onClick={() => toggleSummaryEntry(entry.id)}
                                    className="p-2.5 flex items-center justify-between gap-2.5 cursor-pointer select-none"
                                  >
                                    {/* Lado Esquerdo: Indicador de status, Data/Hora e Tag Pgto */}
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div 
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          entry.isPaid ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                                        }`}
                                        title={entry.isPaid ? 'Pago' : 'Pendente'}
                                      />

                                      <div className="flex items-center gap-1.5 text-xs">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                          {formattedDate}
                                        </span>
                                        <span className="text-slate-300 dark:text-slate-600 font-bold">•</span>
                                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400 whitespace-nowrap">
                                          {entry.time}
                                        </span>
                                      </div>

                                      {entry.paymentMethod && (
                                        <span className="hidden sm:inline-flex text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                                          {getPaymentLabel(entry.paymentMethod)}
                                        </span>
                                      )}
                                    </div>

                                    {/* Lado Direito: Valor e Chevron suave */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`font-mono-num font-black text-xs sm:text-sm ${
                                        entry.isPaid 
                                          ? 'text-slate-800 dark:text-slate-100' 
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}>
                                        {formatCurrency(entry.grossAmount)}
                                      </span>

                                      <div className={`text-slate-400 transition-transform duration-200 ${isEntryExpanded ? 'rotate-180 text-indigo-500' : ''}`}>
                                        <ChevronDown size={14} strokeWidth={2.5} />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Detalhes e Opções da Corrida (Expansão fluida com Framer Motion) */}
                                  <AnimatePresence initial={false}>
                                    {isEntryExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.18 }}
                                        className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 px-3 py-2.5 space-y-2.5"
                                      >
                                        {/* Sub-informações da corrida */}
                                        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {/* Badge Status completo */}
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                              entry.isPaid
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20'
                                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20'
                                            }`}>
                                              {entry.isPaid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                              {entry.isPaid ? 'Pago' : 'Pendente'}
                                            </span>

                                            {/* Método de pagamento */}
                                            {entry.paymentMethod && (
                                              <span className="text-[9px] font-black bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 uppercase flex items-center gap-1">
                                                <CreditCard size={10} className="text-indigo-500" />
                                                {getPaymentLabel(entry.paymentMethod)}
                                              </span>
                                            )}

                                            {/* Quilometragem se houver */}
                                            {entry.kmDriven ? (
                                              <span className="text-[9px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                                                {entry.kmDriven} km
                                              </span>
                                            ) : null}
                                          </div>

                                          {/* Valor destacado */}
                                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                            Valor: <span className="font-mono-num font-black text-slate-700 dark:text-slate-200">{formatCurrency(entry.grossAmount)}</span>
                                          </div>
                                        </div>

                                        {/* Descrição / Observação */}
                                        {entry.description && (
                                          <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                                            "{entry.description}"
                                          </div>
                                        )}

                                        {/* Barra de Opções e Ações */}
                                        <div className="flex items-center justify-between gap-2 pt-1">
                                          {/* Botão de Alternar Status (Pago / Pendente) */}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onUpdate({ ...entry, isPaid: !entry.isPaid });
                                            }}
                                            className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                                              entry.isPaid
                                                ? 'bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                : 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500 shadow-rose-200/50 dark:shadow-none'
                                            }`}
                                          >
                                            {entry.isPaid ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                                            <span>{entry.isPaid ? 'Marcar Pendente' : 'Marcar Pago'}</span>
                                          </button>

                                          {/* Botões de Ação: Editar e Excluir */}
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit(entry);
                                              }}
                                              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400 text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                                              title="Editar Corrida"
                                            >
                                              <Edit3 size={11} />
                                              <span>Editar</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Tem certeza que deseja excluir esta corrida?')) {
                                                  onDelete(entry.id);
                                                }
                                              }}
                                              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60 shadow-2xs"
                                              title="Excluir Corrida"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Botões de Ação Inferiores: Cobrar e Status em Massa */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {/* Botão Pago/Pendente com 2 cliques para confirmação (à esquerda) */}
                          {confirmingStoreStatusName === store.name ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onBulkUpdatePaidStatus && store.entryIds && store.entryIds.length > 0) {
                                  onBulkUpdatePaidStatus(store.entryIds, store.pending > 0);
                                }
                                setConfirmingStoreStatusName(null);
                              }}
                              className="py-2 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all animate-pulse flex items-center justify-center gap-1.5 h-9 cursor-pointer w-full"
                            >
                              <Check size={12} strokeWidth={3} />
                              Confirmar?
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingStoreStatusName(store.name);
                              }}
                              className={`py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 h-9 border cursor-pointer w-full ${
                                store.pending > 0
                                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border-rose-200/50 dark:border-rose-500/10'
                                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border-emerald-200/50 dark:border-emerald-500/10'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${store.pending > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                              {store.pending > 0 ? 'Pendente' : 'Pago'}
                            </button>
                          )}

                          {/* Botão de Cobrar (à direita) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBillStore({
                                name: store.name,
                                totalDue: store.pending,
                                entryIds: store.entryIds
                              });
                            }}
                            disabled={store.pending <= 0}
                            className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 h-9 border border-indigo-100/50 dark:border-indigo-500/10 cursor-pointer w-full"
                          >
                            <Smartphone size={12} strokeWidth={2.5} />
                            Cobrar
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {summaryStores.length > 5 && (
            <div className="flex justify-center mt-4">
              {!isAllStoresExpanded ? (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setIsAllStoresExpanded(true)}
                  className="w-full py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  Ver Todas as Lojas ({summaryStores.length}) <ChevronRight size={14} />
                </motion.button>
              ) : (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setIsAllStoresExpanded(false)}
                  className="w-full py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Recolher Lojas <X size={12} />
                </motion.button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
