'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', duration = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-md border transition-all transform translate-y-0 animate-in fade-in slide-in-from-bottom-2 bg-[#FFFFFF] ${
              toast.type === 'success'
                ? 'border-[#5EF2D5]'
                : toast.type === 'error'
                ? 'border-[#F35252]'
                : 'border-[#60B5FF]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && (
                <div className="w-6 h-6 rounded-full bg-[#5EF2D5] flex items-center justify-center flex-shrink-0 text-[#1C1D1F]">
                  <CheckCircle2 className="w-4 h-4 text-[#1C1D1F]" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-6 h-6 rounded-full bg-[#F35252] flex items-center justify-center flex-shrink-0 text-[#FFFFFF]">
                  <AlertCircle className="w-4 h-4 text-[#FFFFFF]" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-6 h-6 rounded-full bg-[#60B5FF] flex items-center justify-center flex-shrink-0 text-[#FFFFFF]">
                  <Info className="w-4 h-4 text-[#FFFFFF]" />
                </div>
              )}
              <span className="text-xs font-semibold text-[#1C1D1F] leading-tight">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-[#64666E] hover:text-[#1C1D1F] hover:bg-[#FAFAF8] transition-colors cursor-pointer flex-shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
