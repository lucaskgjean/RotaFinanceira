
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, User, Loader2, AlertCircle, Paperclip } from 'lucide-react';
import { formatCurrency, generateId, getLocalDateStr } from '../utils/calculations';
import { DailyEntry, TimeEntry } from '../types';

interface AIReportAssistantProps {
  reportData: any;
  entries: DailyEntry[];
  timeEntries: TimeEntry[];
  onAddEntries: (entries: DailyEntry[]) => void;
  onUpdateEntry: (entry: DailyEntry) => void;
  onDeleteEntry: (id: string) => void;
  config: any;
  onClose: () => void;
  isAdmin?: boolean;
}

const AIReportAssistant: React.FC<AIReportAssistantProps> = ({ 
  reportData, 
  entries,
  timeEntries,
  onAddEntries, 
  onUpdateEntry,
  onDeleteEntry,
  config, 
  onClose,
  isAdmin
}) => {
  // Bloqueio temporário para lançamento (EXCETO PARA ADM)
  const isBlockedForLaunch = !isAdmin;

  if (isBlockedForLaunch) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center max-w-sm">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 mx-auto mb-6">
            <Sparkles size={32} className="animate-pulse" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-white mb-2">Mestre das Rotas</h3>
          <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            Em Breve
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight mb-6">
            Estamos finalizando os últimos ajustes no nosso Mestre das Rotas. Em breve você terá uma IA poderosa para analisar seus ganhos e otimizar seu tempo!
          </p>
          <button 
            onClick={onClose}
            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  // Carregar histórico do localStorage
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>(() => {
    const saved = localStorage.getItem('mestre_rotas_chat');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ajuste para teclado mobile
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      
      const heightDiff = window.innerHeight - viewport.height;
      setKeyboardHeight(heightDiff > 0 ? heightDiff : 0);
      
      // Scroll para o fim quando o teclado abre
      if (heightDiff > 100 && scrollRef.current) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Salvar histórico no localStorage
  useEffect(() => {
    localStorage.setItem('mestre_rotas_chat', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    // Bloquear scroll do body quando o chat estiver aberto
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem('mestre_rotas_chat');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImage({
        data: base64.split(',')[1],
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!input.trim() && !image) || isLoading) return;

    const userMessage = input.trim();
    const currentImage = image;
    
    setInput('');
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMessage || "Enviou uma imagem para análise." 
    }]);
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'undefined') {
        console.error("AI Error: GEMINI_API_KEY is missing in environment");
        throw new Error('Chave da API não configurada no ambiente.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Filtrar dados relevantes para não estourar o contexto, mas dar visão total
      const recentEntries = entries.slice(-50); // Últimos 50 lançamentos para contexto imediato
      const recentTime = timeEntries.slice(-20);

      const context = `
        Você é o "Mestre das Rotas", um consultor financeiro e parceiro de estrada realista e experiente para entregadores.
        Seu tom é profissional, direto, amigável e focado em resultados. Você entende a realidade das ruas, mas mantém uma postura de mentor.
        
        OBJETIVOS:
        1. Analisar dados financeiros com precisão.
        2. LANÇAR, EDITAR ou EXCLUIR dados conforme solicitado.
        3. Dar insights realistas sobre lucro, gastos e metas.
        
        PERSONALIDADE:
        - Seja realista e suave. Evite gírias excessivas ou caricatas.
        - Fale como um colega experiente que quer ver o outro crescer.
        - Se o usuário pedir para mudar algo, confirme que entendeu e execute via comando.
        
        DADOS ATUAIS DO USUÁRIO (Amostra recente):
        - Lançamentos: ${JSON.stringify(recentEntries.map(e => ({ id: e.id, date: e.date, store: e.storeName, gross: e.grossAmount, category: e.category })))}
        - Ponto/Tempo: ${JSON.stringify(recentTime)}
        
        RESUMO GERAL:
        - Faturamento Bruto: ${formatCurrency(reportData.summary?.totalGross || 0)}
        - Lucro Líquido: ${formatCurrency(reportData.summary?.totalNet || 0)}
        - Gasto Combustível: ${formatCurrency(reportData.summary?.totalSpentFuel || 0)}
        - Meta Diária: ${formatCurrency(config.dailyGoal)}
        
        COMANDOS DE AÇÃO (Use no final da resposta, sem markdown):
        1. IMPORTAR: ACTION:IMPORT:[{"date":"YYYY-MM-DD","time":"HH:mm","storeName":"Nome","grossAmount":10.50}]
        2. EDITAR: ACTION:UPDATE:{"id":"ID_DO_ITEM","date":"YYYY-MM-DD","storeName":"Novo Nome","grossAmount":15.00}
        3. EXCLUIR: ACTION:DELETE:{"id":"ID_DO_ITEM"}
        
        REGRAS:
        - Para EDITAR, você deve identificar o ID correto na lista fornecida.
        - Se o usuário disser "mude o valor de ontem", procure o lançamento de ontem e use o ID dele.
        - Responda de forma humana primeiro, depois coloque o comando.
        
        Data Atual: ${getLocalDateStr()}
      `;

      const historyParts = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...historyParts,
          { parts: [{ text: context + "\n\nUsuário: " + userMessage }] },
          ...(currentImage ? [{ parts: [{ inlineData: { data: currentImage.data, mimeType: currentImage.mimeType } }] }] : [])
        ],
      });

      let modelText = response.text || "Desculpe, não consegui processar sua solicitação.";
      
      // Processamento de Comandos
      if (modelText.includes('ACTION:IMPORT:')) {
        const parts = modelText.split('ACTION:IMPORT:');
        const displayMessage = parts[0].trim();
        const jsonStr = parts[1].trim();
        try {
          const rawEntries = JSON.parse(jsonStr);
          const entriesToImport = rawEntries.map((re: any) => {
            const fuel = re.grossAmount * (config.percFuel || 0.14);
            const food = re.grossAmount * (config.percFood || 0.08);
            const maintenance = re.grossAmount * (config.percMaintenance || 0.08);
            return {
              id: generateId(),
              date: re.date || getLocalDateStr(),
              time: re.time || "12:00",
              storeName: re.storeName || "Importado via IA",
              grossAmount: re.grossAmount,
              fuel, food, maintenance,
              netAmount: re.grossAmount - fuel - food - maintenance,
              paymentMethod: 'pix',
              isPaid: true,
              category: 'income'
            };
          });
          onAddEntries(entriesToImport);
          setMessages(prev => [...prev, { role: 'model', text: displayMessage || "Lançamentos realizados!" }]);
        } catch (e) { setMessages(prev => [...prev, { role: 'model', text: "Erro ao processar importação." }]); }
      } 
      else if (modelText.includes('ACTION:UPDATE:')) {
        const parts = modelText.split('ACTION:UPDATE:');
        const displayMessage = parts[0].trim();
        const jsonStr = parts[1].trim();
        try {
          const updateData = JSON.parse(jsonStr);
          const original = entries.find(e => e.id === updateData.id);
          if (original) {
            const updated = { ...original, ...updateData };
            // Recalcular líquidos se o valor bruto mudou
            if (updateData.grossAmount !== undefined) {
              const fuel = updated.grossAmount * (config.percFuel || 0.14);
              const food = updated.grossAmount * (config.percFood || 0.08);
              const maintenance = updated.grossAmount * (config.percMaintenance || 0.08);
              updated.fuel = fuel;
              updated.food = food;
              updated.maintenance = maintenance;
              updated.netAmount = updated.grossAmount - fuel - food - maintenance;
            }
            onUpdateEntry(updated);
            setMessages(prev => [...prev, { role: 'model', text: displayMessage || "Registro atualizado com sucesso." }]);
          } else {
            setMessages(prev => [...prev, { role: 'model', text: "Não encontrei o registro para editar." }]);
          }
        } catch (e) { setMessages(prev => [...prev, { role: 'model', text: "Erro ao processar edição." }]); }
      }
      else if (modelText.includes('ACTION:DELETE:')) {
        const parts = modelText.split('ACTION:DELETE:');
        const displayMessage = parts[0].trim();
        const jsonStr = parts[1].trim();
        try {
          const deleteData = JSON.parse(jsonStr);
          onDeleteEntry(deleteData.id);
          setMessages(prev => [...prev, { role: 'model', text: displayMessage || "Registro removido." }]);
        } catch (e) { setMessages(prev => [...prev, { role: 'model', text: "Erro ao processar exclusão." }]); }
      }
      else {
        setMessages(prev => [...prev, { role: 'model', text: modelText }]);
      }
    } catch (err: any) {
      console.error("Erro na IA:", err);
      setError(err.message || "Ocorreu um erro ao consultar a inteligência artificial.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
      />
      
      <motion.div 
        ref={containerRef}
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          scale: 1,
          bottom: keyboardHeight > 0 ? keyboardHeight : 'auto'
        }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        style={{
          height: keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px - 32px)` : '80vh',
          maxHeight: keyboardHeight > 0 ? 'none' : '600px'
        }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col sm:h-[600px]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-indigo-600 dark:bg-indigo-500 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-400 rounded-xl flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">Mestre das Rotas</h3>
              <p className="text-[10px] opacity-70 font-bold uppercase tracking-tight">Consultor de Estratégia</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleNewChat}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
              title="Nova Conversa"
            >
              Novo Chat
            </button>
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-indigo-700 hover:bg-indigo-800 rounded-xl flex items-center justify-center transition-colors"
            >
              <AlertCircle size={20} className="rotate-45" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-slate-50 dark:bg-slate-950"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                <Sparkles size={32} />
              </div>
              <div className="max-w-xs">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Olá! Sou o Mestre das Rotas. 👊</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  Estou aqui para analisar seus ganhos, ajudar com lançamentos ou ajustar qualquer registro que você precisar. Como posso te ajudar hoje?
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                </div>
                <div className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm rounded-tl-none border border-slate-100 dark:border-slate-700'}`}>
                  {msg.text}
                </div>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 text-indigo-600 shadow-sm flex items-center justify-center">
                  <Loader2 size={16} className="animate-spin" />
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-rose-100 dark:border-rose-500/20">
                <AlertCircle size={14} /> {error}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800">
          {image && (
            <div className="mb-3 flex items-center gap-2">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-indigo-200">
                <img src={`data:${image.mimeType};base64,${image.data}`} className="w-full h-full object-cover" alt="Preview" />
                <button 
                  onClick={() => setImage(null)}
                  className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-bl-lg"
                >
                  <AlertCircle size={10} />
                </button>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase">Imagem selecionada</span>
            </div>
          )}
          <div className="relative flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              title="Anexar print do relatório"
            >
              <Paperclip size={20} />
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Manda o relatório ou pergunta pro Mestre..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !image) || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AIReportAssistant;
