
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2, Sparkles, Settings, CheckCircle2, Chrome } from 'lucide-react';
import { TERMS_OF_USE } from '../constants';
import CustomDialog from './CustomDialog';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
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

    if (!isLogin && (!firstName || !lastName || !phone)) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!isLogin && !acceptedTerms) {
      setError('Você precisa aceitar os termos de uso para criar uma conta.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        await authService.signup(email, password, {
          firstName,
          lastName,
          nickname,
          phone,
          acceptedMarketing
        });
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error("Erro no login/cadastro:", err.code, err);
      
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'E-mail não encontrado. Verifique se digitou corretamente ou crie uma conta.',
        'auth/wrong-password': 'Senha incorreta. Tente novamente ou use "Esqueci minha senha".',
        'auth/invalid-credential': 'E-mail ou senha incorretos. Por favor, verifique seus dados.',
        'auth/invalid-email': 'O formato do e-mail é inválido (ex: seu@email.com).',
        'auth/email-already-in-use': 'Este e-mail já está em uso por outra conta.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/too-many-requests': 'Muitas tentativas falhas. Sua conta foi temporariamente bloqueada. Tente mais tarde.',
        'auth/user-disabled': 'Esta conta foi desativada por um administrador.',
        'auth/network-request-failed': 'Erro de conexão. Verifique sua internet ou o servidor.',
        'auth/operation-not-allowed': 'O login por e-mail/senha não está habilitado no servidor.',
        'auth/popup-closed-by-user': 'A janela de autenticação foi fechada antes de concluir.',
        'auth/popup-blocked': 'O navegador bloqueou a janela de login. Por favor, permita popups para este site.',
        'auth/internal-error': 'Erro interno no servidor. Tente novamente em instantes.'
      };

      const friendlyMessage = errorMessages[err.code];
      setError(friendlyMessage || `Erro (${err.code}): ${err.message || 'Ocorreu um erro inesperado. Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) {
      setError('Configuração do Firebase incompleta.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.loginWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.error("Erro no login com Google:", err.code, err);
      setError('Ocorreu um erro ao entrar com o Google. Tente novamente.');
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
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome</label>
                    <input 
                      type="text" 
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="João"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-700 disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sobrenome</label>
                    <input 
                      type="text" 
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Silva"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-700 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Apelido (Opcional)</label>
                  <input 
                    type="text" 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Como quer ser chamado"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-700 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Celular</label>
                  <input 
                    type="tel" 
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-700 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-start gap-3 p-2">
                  <button
                    type="button"
                    onClick={() => setAcceptedTerms(!acceptedTerms)}
                    className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${acceptedTerms ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-800 bg-slate-950 text-transparent'}`}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                    Eu li e aceito os{' '}
                    <button 
                      type="button"
                      onClick={() => setShowTermsDialog(true)}
                      className="text-indigo-500 hover:text-indigo-400 underline"
                    >
                      Termos de Uso e Privacidade
                    </button>
                    {' '}do RotaFinanceira.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2">
                  <button
                    type="button"
                    onClick={() => setAcceptedMarketing(!acceptedMarketing)}
                    className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${acceptedMarketing ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-800 bg-slate-950 text-transparent'}`}
                  >
                    <CheckCircle2 size={14} />
                  </button>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                    Autorizo o envio de novidades, dicas financeiras e promoções exclusivas por e-mail e WhatsApp.
                  </p>
                </div>
              </>
            )}

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

            {isLogin && (
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                  <span className="bg-slate-950 px-4 text-slate-600">Ou</span>
                </div>
              </div>
            )}

            {isLogin && (
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Chrome size={18} />
                    Entrar com Google
                  </>
                )}
              </button>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
              Seus dados serão sincronizados na nuvem
            </p>
          </div>
        </div>
      </motion.div>

      <CustomDialog
        isOpen={showTermsDialog}
        onClose={() => setShowTermsDialog(false)}
        onConfirm={() => {
          setAcceptedTerms(true);
          setShowTermsDialog(false);
        }}
        title="Termos de Uso"
        message={TERMS_OF_USE}
        confirmText="Aceitar Termos"
        cancelText="Fechar"
        type="info"
      />
    </div>
  );
};

export default Login;
