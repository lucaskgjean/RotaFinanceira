import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let displayMessage = "Ocorreu um erro inesperado.";
      let details = "";

      try {
        // Tenta analisar se o erro é o JSON de erro do Firestore que definimos
        const errObj = JSON.parse(this.state.error?.message || "{}");
        if (errObj.error && errObj.operationType) {
          displayMessage = `Erro de permissão no Firestore: ${errObj.operationType} em ${errObj.path}`;
          details = JSON.stringify(errObj, null, 2);
        }
      } catch (e) {
        // Não é um JSON, usa a mensagem original
        details = this.state.error?.message || "";
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.27 0 2.09-1.383 1.45-2.42L13.45 3a2.03 2.03 0 00-3.5 0L2.55 15.58c-.64 1.037.18 2.42 1.45 2.42z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-4">Ops! Algo deu errado.</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">
            {displayMessage}
          </p>
          
          {details && (
            <div className="w-full max-w-2xl bg-slate-900 text-slate-300 p-4 rounded-xl text-left overflow-auto max-h-64 mb-8 font-mono text-xs">
              <pre>{details}</pre>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-200 dark:shadow-none"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
