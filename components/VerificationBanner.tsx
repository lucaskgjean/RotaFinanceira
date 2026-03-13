
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, AlertCircle, CheckCircle2, RefreshCw, LogOut, ArrowRight } from 'lucide-react';
import { authService } from '../services/authService';

interface VerificationBannerProps {
  createdAt: string;
  onLogout: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const VerificationBanner: React.FC<VerificationBannerProps> = ({ createdAt, onLogout, showToast }) => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    console.log("VerificationBanner mounted with createdAt:", createdAt);
    const calculateTime = () => {
      if (!createdAt || createdAt === '') return;
      const createdDate = new Date(createdAt);
      const now = new Date();
      const diffTime = now.getTime() - createdDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      const remaining = 3 - diffDays;
      setDaysLeft(Math.max(0, Math.ceil(remaining)));
      setIsExpired(remaining <= 0);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [createdAt]);

  const handleResend = async () => {
    setLoading(true);
    try {
      await authService.sendVerificationEmail();
      showToast("E-mail de verificação reenviado!");
    } catch (error) {
      showToast("Erro ao reenviar e-mail.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const user = await authService.reloadUser();
      if (user?.emailVerified) {
        showToast("E-mail verificado com sucesso!", "success");
        window.location.reload(); // Force refresh to update UI state
      } else {
        showToast("E-mail ainda não verificado.", "error");
      }
    } catch (error) {
      showToast("Erro ao verificar status.", "error");
    } finally {
      setIsChecking(false);
    }
  };

  if (isExpired) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-rose-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl relative z-10 text-center"
        >
          <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
            <AlertCircle className="text-rose-500 w-10 h-10" />
          </div>
          
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Acesso Bloqueado</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
            O prazo de 3 dias para verificação do seu e-mail expirou. Por favor, confirme seu e-mail para continuar usando o RotaFinanceira.
          </p>

          <div className="space-y-3">
            <button 
              onClick={handleCheck}
              disabled={isChecking}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
            >
              {isChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={16} />}
              Já verifiquei meu e-mail
            </button>

            <button 
              onClick={handleResend}
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all active:scale-95 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail size={16} />}
              Reenviar Link de Confirmação
            </button>

            <button 
              onClick={onLogout}
              className="w-full py-4 text-slate-500 hover:text-slate-300 font-black uppercase text-[10px] tracking-widest transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              Sair da Conta
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20">
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
            <Mail size={16} />
          </div>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tight leading-tight">
            Verifique seu e-mail! Você tem <span className="text-amber-600 font-black">{daysLeft ?? 3} {daysLeft === 1 ? 'dia' : 'dias'}</span> de carência restantes.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleResend}
            disabled={loading}
            className="text-[9px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw size={12} />}
            Reenviar Link
          </button>
          <button 
            onClick={handleCheck}
            disabled={isChecking}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            {isChecking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRight size={12} />}
            Já Verifiquei
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationBanner;
