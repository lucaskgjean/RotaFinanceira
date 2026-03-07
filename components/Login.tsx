
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2, Sparkles, Settings } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      const getEnv = (key: string) => import.meta.env[key] || (process.env as any)[key] || '';
      const missing = [];
      if (!getEnv('VITE_FIREBASE_API_KEY')) missing.push('API Key');
      if (!getEnv('VITE_FIREBASE_AUTH_DOMAIN')) missing.push('Auth Domain');
      if (!getEnv('VITE_FIREBASE_PROJECT_ID')) missing.push('Project ID');
      
      setError(`Configuração do Firebase incompleta. Faltando: ${missing.join(', ') || 'Chaves principais'}. Verifique as variáveis de ambiente.`);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        await authService.signup(email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Ocorreu um erro ao processar sua solicitação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mx-auto mb-6">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase">
            Rota<span className="text-indigo-500">Financeira</span>
          </h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest">
            Gestão inteligente para sua rota
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
          {!isFirebaseConfigured && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-2xl flex flex-col gap-3 text-xs font-bold">
              <div className="flex items-center gap-3">
                <Settings size={16} className="shrink-0 animate-spin-slow" />
                <span>Configuração Pendente</span>
              </div>
              <p className="opacity-80 leading-relaxed font-medium">
                O sistema de login requer chaves do Firebase. Por favor, configure as variáveis de ambiente no painel do projeto.
              </p>
            </div>
          )}

          <div className="flex gap-2 mb-8 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-700 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-700 disabled:opacity-50"
                />
              </div>
              {isLogin && (
                <button 
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      setError('Digite seu e-mail para recuperar a senha.');
                      return;
                    }
                    try {
                      await authService.resetPassword(email);
                      setError('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
                    } catch (err) {
                      setError('Erro ao enviar e-mail de recuperação.');
                    }
                  }}
                  className="text-[9px] font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-widest ml-1 transition-colors"
                >
                  Esqueci minha senha
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-3"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {isLogin ? 'Entrar no Sistema' : 'Criar Minha Conta'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
              Seus dados serão sincronizados na nuvem
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
