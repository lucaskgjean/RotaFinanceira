import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  onSubscribe: (planType: 'monthly' | 'yearly') => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose, onSubscribe }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await onSubscribe(selectedPlan);
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
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] pointer-events-auto"
        >
          {/* Header com Gradiente */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-4">
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-indigo-400 rounded-2xl flex items-center justify-center mb-4">
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
            {/* Seleção de Plano */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
              <button 
                onClick={() => setSelectedPlan('monthly')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedPlan === 'monthly' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Mensal
              </button>
              <button 
                onClick={() => setSelectedPlan('yearly')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${selectedPlan === 'yearly' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Anual
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-emerald-500 text-white text-[7px] rounded-full">ECONOMIZE</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                  <div className="mt-1">{benefit.icon}</div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{benefit.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-6 text-center mb-6">
                <Sparkles size={32} className="text-amber-500 mx-auto mb-3 animate-pulse" fill="currentColor" />
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-1">Assinaturas em Breve!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Estamos finalizando os últimos detalhes para oferecer a melhor experiência PRO. Fique atento!
                </p>
              </div>

              <button 
                disabled={true}
                className="w-full bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest cursor-not-allowed"
              >
                <Lock size={18} />
                Indisponível no Momento
              </button>
              
              <p className="text-center mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                <Sparkles size={10} className="text-amber-500" fill="currentColor" /> Em breve: Backup na Nuvem e IA
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default SubscriptionModal;
