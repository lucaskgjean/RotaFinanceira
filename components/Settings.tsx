
import React, { useState, useRef } from 'react';
import { AppConfig, DEFAULT_CONFIG, DailyEntry, TimeEntry } from '../types';
import { formatCurrency, entriesToCSV } from '../utils/calculations';
import { Sun, Moon, Monitor, Settings as SettingsIcon, Bell, Plus, Trash2, Clock } from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface SettingsProps {
  config: AppConfig;
  entries: DailyEntry[];
  timeEntries: TimeEntry[];
  onChange: (newConfig: AppConfig) => void;
  onImport: (entries: DailyEntry[], config?: AppConfig, timeEntries?: TimeEntry[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ config, entries, timeEntries, onChange, onImport }) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSliderChange = (key: keyof AppConfig, value: string) => {
    const num = parseFloat(value);
    if (key === 'dailyGoal') {
      onChange({ ...config, [key]: num });
    } else {
      onChange({ ...config, [key]: num / 100 });
    }
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'auto') => {
    onChange({ ...config, themeMode: mode });
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return alert("Nenhum dado para exportar.");
    const csvContent = entriesToCSV(entries);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ROTA_PLANILHA_${todayStr}.csv`);
    link.click();
  };

  const handleFullBackup = () => {
    // Backup completo: Dados + Configurações + Ponto
    const snapshot = {
      entries,
      timeEntries,
      config,
      version: "3.0",
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ROTA_BACKUP_COMPLETO.json`);
    link.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const data = JSON.parse(json);
        
        // Verifica se é o novo formato (Snapshot) ou o antigo (Array)
        if (data.entries && Array.isArray(data.entries)) {
          // Formato Novo
          if (window.confirm(`Detectado backup completo com ${data.entries.length} registros. Restaurar histórico e configurações?`)) {
            onImport(data.entries, data.config, data.timeEntries);
          }
        } else if (Array.isArray(data)) {
          // Formato Antigo (Apenas Array)
          if (window.confirm(`Detectado backup simples com ${data.length} registros. Restaurar histórico?`)) {
            onImport(data);
          }
        } else {
          alert("Arquivo inválido ou corrompido.");
        }
      } catch (err) {
        alert("Erro crítico ao ler backup. O arquivo pode estar mal formatado.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMaintenanceAlertChange = (id: string, field: 'description' | 'kmInterval', value: string) => {
    const alerts = (config.maintenanceAlerts || []).map(alert => {
      if (alert.id === id) {
        return { 
          ...alert, 
          [field]: field === 'kmInterval' ? parseInt(value) || 0 : value 
        };
      }
      return alert;
    });
    onChange({ ...config, maintenanceAlerts: alerts });
  };

  const addMaintenanceAlert = () => {
    const newAlert = {
      id: Math.random().toString(36).substr(2, 9),
      description: 'Novo Alerta',
      kmInterval: 10000,
      lastKm: 0
    };
    onChange({ ...config, maintenanceAlerts: [...(config.maintenanceAlerts || []), newAlert] });
  };

  const removeMaintenanceAlert = (id: string) => {
    onChange({ ...config, maintenanceAlerts: (config.maintenanceAlerts || []).filter(a => a.id !== id) });
  };

  const toggleNotifications = async () => {
    if (!config.notificationsEnabled) {
      const granted = await notificationService.requestPermission();
      if (granted) {
        onChange({ ...config, notificationsEnabled: true });
        notificationService.sendNotification("Notificações Ativadas!", {
          body: "Você agora receberá alertas do RotaFinanceira."
        });
      } else {
        alert("Para ativar as notificações, você precisa permitir nas configurações do seu navegador/celular.");
      }
    } else {
      onChange({ ...config, notificationsEnabled: false });
    }
  };

  const addCustomNotification = () => {
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Lembrete de Rota',
      message: 'Hora de começar os trabalhos!',
      time: '08:00',
      days: [1, 2, 3, 4, 5], // Seg-Sex
      enabled: true
    };
    onChange({ ...config, customNotifications: [...(config.customNotifications || []), newNotif] });
  };

  const updateCustomNotification = (id: string, updates: any) => {
    const newNotifs = (config.customNotifications || []).map(n => n.id === id ? { ...n, ...updates } : n);
    onChange({ ...config, customNotifications: newNotifs });
  };

  const removeCustomNotification = (id: string) => {
    onChange({ ...config, customNotifications: (config.customNotifications || []).filter(n => n.id !== id) });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-10">
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Configurações</h2>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gerencie sua conta e preferências</p>
        </div>
      </div>

      {/* CARD: APARÊNCIA (NOVO) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4">Aparência</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Diurno', icon: <Sun size={18} /> },
            { id: 'dark', label: 'Noturno', icon: <Moon size={18} /> },
            { id: 'auto', label: 'Auto', icon: <Monitor size={18} /> }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => handleThemeChange(mode.id as any)}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${config.themeMode === mode.id ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
            >
              {mode.icon}
              <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CARD: NOTIFICAÇÕES (NOVO) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-50 dark:bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Bell size={18} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Notificações</h3>
          </div>
          <button 
            onClick={toggleNotifications}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
            Se as notificações não estiverem aparecendo nas configurações do Android, clique no botão abaixo para forçar o registro no sistema.
          </p>
          <button 
            onClick={async () => {
              await notificationService.requestPermission();
              alert("Pedido de registro enviado ao sistema. Verifique as configurações do Android agora.");
            }}
            className="mt-3 w-full py-2 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-all"
          >
            Corrigir Notificações no Android
          </button>
        </div>

        {config.notificationsEnabled && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Lembretes Personalizados</p>
              <button 
                onClick={addCustomNotification}
                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> Novo
              </button>
            </div>

            <div className="space-y-4">
              {(config.customNotifications || []).map(notif => (
                <div key={notif.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <input 
                        type="text" 
                        placeholder="Título"
                        value={notif.title}
                        onChange={(e) => updateCustomNotification(notif.id, { title: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-sm font-black text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-0"
                      />
                      <input 
                        type="text" 
                        placeholder="Mensagem"
                        value={notif.message}
                        onChange={(e) => updateCustomNotification(notif.id, { message: e.target.value })}
                        className="w-full bg-transparent border-none p-0 text-xs font-bold text-slate-500 dark:text-slate-400 placeholder:text-slate-400 focus:ring-0"
                      />
                    </div>
                    <button 
                      onClick={() => removeCustomNotification(notif.id)}
                      className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Clock size={14} className="text-slate-400" />
                      <input 
                        type="time" 
                        value={notif.time}
                        onChange={(e) => updateCustomNotification(notif.id, { time: e.target.value })}
                        className="bg-transparent border-none p-0 text-xs font-black text-slate-700 dark:text-slate-200 focus:ring-0"
                      />
                    </div>

                    <div className="flex gap-1">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const newDays = notif.days.includes(idx) 
                              ? notif.days.filter(d => d !== idx)
                              : [...notif.days, idx];
                            updateCustomNotification(notif.id, { days: newDays });
                          }}
                          className={`w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center transition-all ${notif.days.includes(idx) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800'}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => updateCustomNotification(notif.id, { enabled: !notif.enabled })}
                      className={`ml-auto text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${notif.enabled ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                    >
                      {notif.enabled ? 'Ativo' : 'Pausado'}
                    </button>
                  </div>
                </div>
              ))}
              {(config.customNotifications || []).length === 0 && (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum lembrete criado</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CARD: SOBRE O APP E TUTORIAL */}
      <div className="bg-indigo-900 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border-4 border-indigo-500/30">
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-1">Sobre o RotaFinanceira</h3>
          <p className="text-sm opacity-80 mb-6 leading-relaxed">
            O RotaFinanceira é sua ferramenta definitiva para gestão de ganhos e gastos em rotas. 
            Controle seu faturamento, monitore manutenções e gerencie seu tempo de trabalho em um só lugar.
          </p>
          {!showTutorial ? (
            <button 
              onClick={() => setShowTutorial(true)} 
              className="w-full py-4 bg-white text-indigo-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-indigo-50 active:scale-95"
            >
              Ver tutorial de uso
            </button>
          ) : (
            <div className="bg-indigo-950/50 p-6 rounded-2xl border border-indigo-400/20 text-xs space-y-4 animate-in fade-in zoom-in-95">
              <div className="space-y-2">
                <p className="font-black text-indigo-300 uppercase tracking-wider">1. Lançamentos Inteligentes</p>
                <p>No "Lançamento Rápido", use o <b>carrossel de lojas</b> para selecionar estabelecimentos frequentes deslizando para os lados. Digite o valor e escolha o método de pagamento (PIX, Dinheiro ou Caderno).</p>
              </div>
              <div className="space-y-2">
                <p className="font-black text-indigo-300 uppercase tracking-wider">2. Gestão de Status</p>
                <p>No histórico, identifique dívidas rapidamente pela <b>barra lateral vermelha</b> (Pendente) ou <b>verde</b> (Pago). Clique no botão de status para alternar sem precisar editar.</p>
              </div>
              <div className="space-y-2">
                <p className="font-black text-indigo-300 uppercase tracking-wider">3. Relatórios e IA</p>
                <p>Na aba de Relatórios, use o <b>Filtro por Loja</b> para ver entregas específicas. No final da página, converse com nossa <b>IA Analista</b> para obter insights sobre seu lucro e desempenho.</p>
              </div>
              <div className="space-y-2">
                <p className="font-black text-indigo-300 uppercase tracking-wider">4. Manutenção e Alertas</p>
                <p>Configure seus alertas de KM aqui nas configurações. Acompanhe o progresso na aba "Manutenção" para saber exatamente quando revisar seu veículo.</p>
              </div>
              <div className="space-y-2">
                <p className="font-black text-indigo-300 uppercase tracking-wider">5. Backup e Segurança</p>
                <p>Seus dados ficam no seu celular. Use o <b>"Criar Backup"</b> regularmente para salvar um arquivo com tudo (lançamentos, ponto e configurações) e garantir que nunca perca nada.</p>
              </div>
              <button onClick={() => setShowTutorial(false)} className="w-full pt-2 font-black text-indigo-300 uppercase tracking-widest hover:text-white transition-colors">Entendi, fechar tutorial</button>
            </div>
          )}
        </div>
      </div>

      {/* CARD: META */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-black text-slate-800 dark:text-white">Meta diária</h3>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(config.dailyGoal)}</span>
        </div>
        <input 
          type="range" min="50" max="1000" step="10"
          value={config.dailyGoal}
          onChange={(e) => handleSliderChange('dailyGoal', e.target.value)}
          className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-400"
        />
      </div>

      {/* CARD: ALERTAS DE MANUTENÇÃO */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-black text-slate-800 dark:text-white">Alertas de manutenção</h3>
          <button onClick={addMaintenanceAlert} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
            + Adicionar
          </button>
        </div>
        <div className="space-y-4">
          {(config.maintenanceAlerts || []).map(alert => (
            <div key={alert.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={alert.description} 
                  onChange={(e) => handleMaintenanceAlertChange(alert.id, 'description', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Intervalo (KM)</label>
                <input 
                  type="number" 
                  value={alert.kmInterval} 
                  onChange={(e) => handleMaintenanceAlertChange(alert.id, 'kmInterval', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>
              <button onClick={() => removeMaintenanceAlert(alert.id)} className="p-2 text-rose-400 hover:text-rose-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
          {(config.maintenanceAlerts || []).length === 0 && (
            <p className="text-center text-xs text-slate-400 italic">Nenhum alerta configurado.</p>
          )}
        </div>
      </div>

      {/* CARD: BACKUP E RESTAURAÇÃO */}
      <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl">
        <h3 className="text-xl font-black mb-2 flex items-center gap-2">
          <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" /></svg>
          Snapshot do sistema
        </h3>
        <p className="text-xs opacity-50 mb-8 uppercase font-bold tracking-widest">Sincronização e Restauração</p>
        
        <div className="space-y-3">
          <button onClick={handleExportCSV} className="w-full flex items-center justify-between p-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase transition-all active:scale-95 shadow-lg">
            <span>Exportar Excel (CSV)</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleFullBackup} className="flex flex-col items-center justify-center p-5 bg-indigo-600/30 rounded-2xl border border-white/10 hover:bg-indigo-600/50 transition-all">
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="text-[10px] font-black uppercase">Criar Backup</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-5 bg-emerald-600/30 rounded-2xl border border-white/10 hover:bg-emerald-600/50 transition-all">
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-[10px] font-black uppercase">Restaurar</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" />
          </div>
        </div>
      </div>

      {/* CARD: RESERVAS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4">Taxas de reserva</h3>
        <div className="space-y-6">
          {[
            { id: 'percFuel', label: 'Gasolina', color: 'red', val: config.percFuel },
            { id: 'percFood', label: 'Comida', color: 'orange', val: config.percFood },
            { id: 'percMaintenance', label: 'Manutenção', color: 'blue', val: config.percMaintenance }
          ].map(item => (
            <div key={item.id} className="space-y-2">
              <div className="flex justify-between font-black text-[10px] uppercase text-slate-400 dark:text-slate-500">
                <span>{item.label}</span>
                <span className={`text-sm text-${item.color}-600 dark:text-${item.color}-400`}>{(item.val * 100).toFixed(1)}%</span>
              </div>
              <input type="range" min="0" max="40" step="0.5" value={item.val * 100} onChange={(e) => handleSliderChange(item.id as any, e.target.value)} className={`w-full accent-${item.color}-500 dark:accent-${item.color}-400`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
