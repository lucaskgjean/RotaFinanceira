import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  Cloud, 
  BarChart3, 
  Zap,
  ArrowRight,
  Lock
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface SubscriptionModalProps {
  onClose: () => void;
  onSubscribe: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, onSubscribe }) => {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await onSubscribe();
    } catch (error) {
      console.error("Erro ao iniciar assinatura:", error);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: <Cloud className="text-emerald-500" size={20} />,
      title: "Backup em Nuvem Real",
      description: "Seus dados sincronizados em tempo real. Troque de celular sem perder nada."
    },
    {
      icon: <BarChart3 className="text-indigo-500" size={20} />,
      title: "Relatórios Avançados",
      description: "Análise detalhada de lucro por loja, dia da semana e horários mais lucrativos."
    },
    {
      icon: <Zap className="text-amber-500" size={20} />,
      title: "Mestre das Rotas (IA)",
      description: "Converse com nossa IA veterana para obter insights, dicas de segurança e estratégias de ganho."
    },
    {
      icon: <ShieldCheck className="text-blue-500" size={20} />,
      title: "Sem Anúncios",
      description: "Uma experiência limpa e focada no que importa: seu dinheiro."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
      >
        {/* Header com Gradiente */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-4">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
              <Sparkles size={24} className="text-amber-300" fill="currentColor" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Rota<span className="text-amber-300">PRO</span></h2>
            <p className="text-indigo-100 font-medium leading-relaxed">
              Desbloqueie o poder total da sua gestão financeira e aumente seus lucros.
            </p>
          </div>

          {/* Elementos Decorativos */}
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl"></div>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
                <div className="mt-1">{benefit.icon}</div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{benefit.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Plano Mensal</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-800 dark:text-white">{formatCurrency(19.90)}</span>
                  <span className="text-sm font-bold text-slate-400">/mês</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-500/20">
                  7 dias grátis
                </span>
              </div>
            </div>

            <button 
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full group bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Assinar Agora
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            <p className="text-center mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
              <Lock size={10} /> Pagamento seguro via Stripe
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SubscriptionModal;
