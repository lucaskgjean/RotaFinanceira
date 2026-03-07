
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle2, XCircle, X } from 'lucide-react';

interface CustomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void | Promise<void>;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  confirmText?: string;
  cancelText?: string;
  showInput?: boolean;
  inputPlaceholder?: string;
  inputValidation?: string; // Text that must match to enable confirm
}

const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  showInput = false,
  inputPlaceholder = '',
  inputValidation = ''
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const isConfirmDisabled = (showInput && inputValidation !== '' && inputValue.trim().toLowerCase() !== inputValidation.trim().toLowerCase()) || isLoading;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(inputValue);
    } catch (error) {
      console.error("Dialog confirm error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle className="text-amber-500" size={24} />,
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          button: 'bg-amber-500 hover:bg-amber-600 text-white'
        };
      case 'danger':
        return {
          icon: <XCircle className="text-rose-500" size={24} />,
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/20',
          button: 'bg-rose-500 hover:bg-rose-600 text-white'
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="text-emerald-500" size={24} />,
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          button: 'bg-emerald-600 hover:bg-emerald-700 text-white'
        };
      default:
        return {
          icon: <Info className="text-indigo-500" size={24} />,
          bg: 'bg-indigo-500/10',
          border: 'border-indigo-500/20',
          button: 'bg-indigo-600 hover:bg-indigo-700 text-white'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className={`p-3 rounded-2xl ${styles.bg} ${styles.border}`}>
                  {styles.icon}
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">
                {title}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {message}
              </p>

              {showInput && (
                <div className="mb-6">
                  {inputValidation && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Digite <span className="text-indigo-600 dark:text-indigo-400">"{inputValidation}"</span> para confirmar
                    </p>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={inputPlaceholder}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 transition-all ${
                        inputValue.trim() !== '' && !isConfirmDisabled 
                          ? 'border-emerald-500/50 ring-emerald-500/10' 
                          : 'border-slate-100 dark:border-slate-700 focus:ring-indigo-500/20'
                      }`}
                      autoFocus
                    />
                    {inputValue.trim() !== '' && !isConfirmDisabled && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-in fade-in zoom-in">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {cancelText && (
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  disabled={isConfirmDisabled}
                  onClick={handleConfirm}
                  className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 ${styles.button}`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CustomDialog;
