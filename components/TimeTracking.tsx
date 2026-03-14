
import React, { useState, useMemo, useEffect } from 'react';
import { TimeEntry } from '../types';
import { generateId, calculateDuration, formatDuration, getLocalDateStr } from '../utils/calculations';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';
import { 
  Clock, 
  Play, 
  Square, 
  Coffee, 
  FileText, 
  Trash2, 
  Calendar, 
  ChevronRight,
  Timer,
  Plus,
  Edit2,
  X,
  Save
} from 'lucide-react';

interface TimeTrackingProps {
  timeEntries: TimeEntry[];
  onAdd: (entry: TimeEntry) => void;
  onUpdate: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
}

const TimeTracking: React.FC<TimeTrackingProps> = ({ timeEntries, onAdd, onUpdate, onDelete }) => {
  const today = getLocalDateStr();
  const [now, setNow] = useState(new Date());
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Form states for manual/edit
  const [formDate, setFormDate] = useState(today);
  const [formStart, setFormStart] = useState('08:00');
  const [formEnd, setFormEnd] = useState('18:00');
  const [formBreak, setFormBreak] = useState('60');
  const [formNotes, setFormNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000); // Atualiza a cada 1 segundo para precisão visual
    return () => clearInterval(interval);
  }, []);

  const currentTime = now.toTimeString().slice(0, 8); // HH:mm:ss

  const activeEntry = useMemo(() => 
    timeEntries.find(e => e.date === today && !e.endTime),
    [timeEntries, today]
  );

  const activeDuration = useMemo(() => {
    if (!activeEntry) return 0;
    return calculateDuration(activeEntry.startTime, currentTime, 0);
  }, [activeEntry, currentTime]);

  const [breakInput, setBreakInput] = useState<string>('0');
  const [notesInput, setNotesInput] = useState<string>('');

  const handleClockIn = () => {
    const newEntry: TimeEntry = {
      id: generateId(),
      date: today,
      startTime: currentTime,
      notes: ''
    };
    onAdd(newEntry);
  };

  const handleClockOut = () => {
    if (!activeEntry) return;
    const updatedEntry: TimeEntry = {
      ...activeEntry,
      endTime: currentTime,
      breakDuration: parseInt(breakInput) || 0,
      notes: notesInput
    };
    onUpdate(updatedEntry);
    setBreakInput('0');
    setNotesInput('');
  };

  const openManualEntry = () => {
    setEditingEntry(null);
    setFormDate(today);
    setFormStart('08:00');
    setFormEnd('18:00');
    setFormBreak('60');
    setFormNotes('');
    setIsManualModalOpen(true);
  };

  const openEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormStart(entry.startTime);
    setFormEnd(entry.endTime || currentTime);
    setFormBreak((entry.breakDuration || 0).toString());
    setFormNotes(entry.notes || '');
    setIsManualModalOpen(true);
  };

  const handleSaveManual = () => {
    const entryData: TimeEntry = {
      id: editingEntry ? editingEntry.id : generateId(),
      date: formDate,
      startTime: formStart,
      endTime: formEnd,
      breakDuration: parseInt(formBreak) || 0,
      notes: formNotes
    };

    if (editingEntry) {
      onUpdate(entryData);
    } else {
      onAdd(entryData);
    }
    setIsManualModalOpen(false);
  };

  const dailyTotals = useMemo(() => {
    const totals: { [key: string]: number } = {};
    timeEntries.forEach(e => {
      if (e.startTime && e.endTime) {
        const duration = calculateDuration(e.startTime, e.endTime, e.breakDuration || 0);
        totals[e.date] = (totals[e.date] || 0) + duration;
      }
    });
    return totals;
  }, [timeEntries]);

  const sortedDates = Object.keys(dailyTotals).sort((a, b) => b.localeCompare(a));

  const timeSummary = useMemo(() => {
    const todaySeconds = (dailyTotals[today] || 0) + activeDuration;
    
    // Início da semana (Segunda-feira)
    const getStartOfWeek = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    };
    const startOfWeek = getStartOfWeek(new Date());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    // Início do mês
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

    const weekSeconds = timeEntries.reduce((acc, curr) => {
      if (curr.date >= startOfWeekStr && curr.startTime && curr.endTime) {
        return acc + calculateDuration(curr.startTime, curr.endTime, curr.breakDuration || 0);
      }
      return acc;
    }, 0) + activeDuration;

    const monthSeconds = timeEntries.reduce((acc, curr) => {
      if (curr.date >= startOfMonthStr && curr.startTime && curr.endTime) {
        return acc + calculateDuration(curr.startTime, curr.endTime, curr.breakDuration || 0);
      }
      return acc;
    }, 0) + activeDuration;

    return {
      today: todaySeconds,
      week: weekSeconds,
      month: monthSeconds
    };
  }, [timeEntries, dailyTotals, today, activeDuration, now]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-24"
    >
      {/* Status de Ponto Atual */}
      <motion.div 
        variants={itemVariants}
        className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div className="text-center md:text-left">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-3">Controle de Ponto</h2>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className={`w-3 h-3 rounded-full ${activeEntry ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
              <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                {activeEntry ? `Trabalhando desde ${activeEntry.startTime}` : 'Fora de Serviço'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3 justify-center md:justify-start">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">Hoje acumulado:</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono-num">{formatDuration((dailyTotals[today] || 0) + activeDuration)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            {!activeEntry ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClockIn}
                  className="flex-1 bg-emerald-600 dark:bg-emerald-500 text-white font-black py-5 px-10 rounded-2xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 dark:shadow-none flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                >
                  <Play size={18} fill="currentColor" /> Iniciar Turno
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={openManualEntry}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black py-5 px-10 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                >
                  <Plus size={18} /> Lançar Manual
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                      <Coffee size={10} /> Pausa (min)
                    </label>
                    <input 
                      type="number" 
                      value={breakInput} 
                      onChange={(e) => setBreakInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white font-mono-num"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                      <FileText size={10} /> Notas
                    </label>
                    <input 
                      type="text" 
                      value={notesInput} 
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="Opcional..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                    />
                  </div>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClockOut}
                  className="bg-rose-600 dark:bg-rose-500 text-white font-black py-5 px-10 rounded-2xl hover:bg-rose-700 dark:hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 dark:shadow-none flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                >
                  <Square size={18} fill="currentColor" /> Finalizar Turno
                </motion.button>
              </div>
            )}
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
          <Timer size={200} />
        </div>
      </motion.div>

      {/* Resumo de Horas Trabalhadas */}
      <motion.div 
        variants={itemVariants}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Clock size={18} strokeWidth={2.5} />
            </div>
            <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Resumo de Horas Trabalhadas</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Hoje</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter font-mono-num">{formatDuration(timeSummary.today)}</div>
            </div>
            
            <div className="flex flex-col md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Esta Semana</span>
              <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter font-mono-num">{formatDuration(timeSummary.week)}</div>
            </div>

            <div className="flex flex-col md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Este Mês</span>
              <div className="text-xl font-black text-slate-800 dark:text-white tracking-tighter font-mono-num">{formatDuration(timeSummary.month)}</div>
            </div>
          </div>
        </div>
        
        <div className="absolute -right-6 -bottom-6 opacity-[0.02] dark:opacity-[0.04] group-hover:scale-110 transition-transform duration-700">
          <Clock size={150} />
        </div>
      </motion.div>

      {/* Relatório de Horas */}
      <motion.div variants={itemVariants} className="space-y-6 pt-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-white px-2 flex items-center gap-3 uppercase tracking-widest">
          <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
          Histórico de Ponto
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedDates.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
               <p className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest">Nenhum registro encontrado</p>
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-emerald-100 dark:hover:border-emerald-500 transition-colors">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Data</span>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200 capitalize">
                        {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-emerald-400 dark:text-emerald-500 uppercase tracking-widest block">Total</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num">{formatDuration(dailyTotals[date])}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {timeEntries
                    .filter(e => e.date === date)
                    .sort((a, b) => b.startTime.localeCompare(a.startTime))
                    .map(entry => (
                      <div key={entry.id} className="group/item flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center shadow-sm text-slate-300 dark:text-slate-600">
                            <Clock size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono-num">
                              {entry.startTime} — {entry.endTime || 'Em aberto'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {entry.breakDuration ? (
                                <span className="text-[8px] text-rose-500 font-black uppercase bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-md">Pausa: {entry.breakDuration}m</span>
                              ) : null}
                              {entry.notes && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 italic truncate max-w-[120px]">{entry.notes}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                          <button 
                            onClick={() => openEditEntry(entry)}
                            className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onDelete(entry.id)}
                            className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Modal de Lançamento Manual / Edição */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsManualModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-indigo-600 dark:bg-indigo-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    {editingEntry ? <Edit2 size={20} /> : <Plus size={20} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">{editingEntry ? 'Editar Ponto' : 'Lançar Ponto'}</h3>
                    <p className="text-[10px] opacity-70 font-bold uppercase tracking-tight">Preencha os horários manualmente</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsManualModalOpen(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data do Turno</label>
                  <button 
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  >
                    <Calendar className="text-slate-300 dark:text-slate-600" size={18} />
                    <span>{new Date(formDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Entrada</label>
                    <button 
                      type="button"
                      onClick={() => setShowStartTimePicker(true)}
                      className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono-num"
                    >
                      <Clock className="text-slate-300 dark:text-slate-600" size={18} />
                      <span>{formStart}</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Saída</label>
                    <button 
                      type="button"
                      onClick={() => setShowEndTimePicker(true)}
                      className="w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono-num"
                    >
                      <Clock className="text-slate-300 dark:text-slate-600" size={18} />
                      <span>{formEnd}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Pausa (minutos)</label>
                    <input 
                      type="number" 
                      value={formBreak}
                      onChange={(e) => setFormBreak(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-mono-num"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Notas</label>
                    <input 
                      type="text" 
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Ex: Turno extra..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveManual}
                  className="w-full bg-indigo-600 dark:bg-indigo-500 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3 uppercase text-xs tracking-widest mt-4"
                >
                  <Save size={18} /> {editingEntry ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                </button>
              </div>

              <AnimatePresence>
                {showDatePicker && (
                  <CustomDatePicker 
                    value={formDate} 
                    onChange={setFormDate} 
                    onClose={() => setShowDatePicker(false)} 
                  />
                )}
                {showStartTimePicker && (
                  <CustomTimePicker 
                    value={formStart} 
                    onChange={setFormStart} 
                    onClose={() => setShowStartTimePicker(false)} 
                  />
                )}
                {showEndTimePicker && (
                  <CustomTimePicker 
                    value={formEnd} 
                    onChange={setFormEnd} 
                    onClose={() => setShowEndTimePicker(false)} 
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TimeTracking;
