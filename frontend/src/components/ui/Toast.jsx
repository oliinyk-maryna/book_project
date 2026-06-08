import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Розміщення: над нижньою навігацією на мобільних, справа знизу на desktop */}
      <div className="fixed bottom-24 md:bottom-6 right-4 z-[500] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }) {
  const config = {
    success: { cls: 'bg-[#2C5234] text-white', Icon: CheckCircle2 },
    error:   { cls: 'bg-red-600 text-white',   Icon: AlertCircle },
    info:    { cls: 'bg-stone-800 text-white',  Icon: Info },
  };
  const { cls, Icon } = config[toast.type] || config.info;

  return (
    <div
      className={`${cls} px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 max-w-xs sm:max-w-sm pointer-events-auto animate-in slide-in-from-right-4 duration-200`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="opacity-60 hover:opacity-100 transition-opacity ml-1 shrink-0"
        aria-label="Закрити"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}