
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Bot, User, Loader2, AlertCircle, Paperclip } from 'lucide-react';
import { formatCurrency, generateId, getLocalDateStr } from '../utils/calculations';
import { DailyEntry } from '../types';

interface AIReportAssistantProps {
  reportData: any;
  onAddEntries: (entries: DailyEntry[]) => void;
  config: any;
  onClose: () => void;
}

const AIReportAssistant: React.FC<AIReportAssistantProps> = ({ reportData, onAddEntries, config, onClose }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ data: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('API_KEY_MISSING');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const context = `
        Você é o assistente de inteligência artificial do aplicativo RotaFinanceira.
        Seu objetivo é analisar os dados financeiros do usuário, fornecer insights e, PRINCIPALMENTE, ajudar a LANÇAR NOVOS DADOS a partir de textos ou imagens de relatórios de aplicativos de entrega (iFood, Uber, Rappi, etc.).
        
        DADOS DO RELATÓRIO ATUAL NO SISTEMA:
        - Período: ${reportData.startDate || 'Geral'} até ${reportData.endDate || 'Geral'}
        - Faturamento Bruto: ${formatCurrency(reportData.summary?.totalGross || 0)}
        - Lucro Líquido: ${formatCurrency(reportData.summary?.totalNet || 0)}
        
        INSTRUÇÕES DE IMPORTAÇÃO:
        Se o usuário enviar um texto ou imagem que pareça um relatório de ganhos ou taxas:
        1. Identifique cada entrega/taxa individualmente.
        2. Extraia: Data (YYYY-MM-DD), Valor Bruto (grossAmount), Nome da Loja/App (storeName) e Hora (HH:mm).
        3. Se a data não estiver clara, use a data atual: ${getLocalDateStr()}.
        4. Se a hora não estiver clara, use "12:00".
        5. Se o usuário pedir para "lançar" ou "importar", você DEVE responder com uma mensagem amigável E incluir no final da sua resposta EXATAMENTE este formato de comando (sem blocos de código markdown):
           ACTION:IMPORT:[{"date":"YYYY-MM-DD","time":"HH:mm","storeName":"Nome","grossAmount":10.50}]
        
        REGRAS PARA O JSON:
        - grossAmount deve ser um número.
        - storeName deve ser o nome do restaurante ou do app.
        - Você pode enviar múltiplos objetos no array.
        - NÃO use blocos de código markdown (\`\`\`) para o comando ACTION.
        
        Se for apenas uma pergunta sobre os dados, responda normalmente em português.
      `;

      const parts: any[] = [{ text: context + "\n\nPergunta/Relatório do usuário: " + userMessage }];
      
      if (currentImage) {
        parts.push({
          inlineData: {
            data: currentImage.data,
            mimeType: currentImage.mimeType
          }
        });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts }],
      });

      let modelText = response.text || "Desculpe, não consegui processar sua solicitação.";
      
      // Verifica se há comando de importação
      if (modelText.includes('ACTION:IMPORT:')) {
        const parts = modelText.split('ACTION:IMPORT:');
        const displayMessage = parts[0].trim();
        const jsonStr = parts[1].trim();

        try {
          const rawEntries = JSON.parse(jsonStr);
          const entriesToImport: DailyEntry[] = rawEntries.map((re: any) => {
            // Calcula os percentuais com base na config do usuário
            const fuel = re.grossAmount * (config.percFuel || 0.14);
            const food = re.grossAmount * (config.percFood || 0.08);
            const maintenance = re.grossAmount * (config.percMaintenance || 0.08);
            const netAmount = re.grossAmount - fuel - food - maintenance;

            return {
              id: generateId(),
              date: re.date || getLocalDateStr(),
              time: re.time || "12:00",
              storeName: re.storeName || "Importado via IA",
              grossAmount: re.grossAmount,
              fuel,
              food,
              maintenance,
              netAmount,
              paymentMethod: 'pix',
              isPaid: true,
              category: 'income'
            };
          });

          onAddEntries(entriesToImport);
          setMessages(prev => [...prev, { role: 'model', text: displayMessage || "Lançamentos processados com sucesso!" }]);
        } catch (e) {
          console.error("Erro ao processar JSON da IA:", e);
          setMessages(prev => [...prev, { role: 'model', text: "Consegui ler os dados, mas houve um erro ao formatar os lançamentos. Por favor, tente novamente ou cole o texto de forma mais clara." }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', text: modelText }]);
      }
    } catch (err: any) {
      console.error("Erro na IA:", err);
      if (err.message === 'API_KEY_MISSING') {
        setError("Chave da API não encontrada.");
      } else {
        setError("Ocorreu um erro ao consultar a inteligência artificial.");
      }
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
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[80vh] sm:h-[600px]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-indigo-600 dark:bg-indigo-500 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">IA Analista & Importação</h3>
              <p className="text-[10px] opacity-70 font-bold uppercase tracking-tight">Análise e lançamentos automáticos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
          >
            <AlertCircle size={20} className="rotate-45" />
          </button>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-slate-50/50 dark:bg-slate-950/20"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <Bot size={48} className="text-indigo-500" />
              <div className="max-w-xs">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Olá! Eu sou sua IA Analista.</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Cole o texto de um relatório ou envie um print para eu lançar as taxas automaticamente para você.</p>
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
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
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
                placeholder="Cole o relatório ou pergunte algo..."
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
