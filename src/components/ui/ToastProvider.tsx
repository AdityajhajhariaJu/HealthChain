import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextType {
  toast: (title: string, message?: string, type?: ToastType) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  toastWithAction: (title: string, message: string, actionLabel: string, onAction: () => void, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((title: string, message?: string, type: ToastType = 'info', actionLabel?: string, onAction?: () => void, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-3), { id, title, message, type, actionLabel, onAction }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => addToast(title, message, 'success'), [addToast]);
  const error = useCallback((title: string, message?: string) => addToast(title, message, 'error'), [addToast]);
  const info = useCallback((title: string, message?: string) => addToast(title, message, 'info'), [addToast]);
  const toastWithAction = useCallback((title: string, message: string, actionLabel: string, onAction: () => void, type: ToastType = 'info', duration = 5000) => {
    addToast(title, message, type, actionLabel, onAction, duration);
  }, [addToast]);

  React.useEffect(() => {
    const handleCustomToast = (e: any) => {
      const { title, message, type, actionLabel, onAction, duration } = e.detail || {};
      if (title) {
        addToast(title, message, type || 'info', actionLabel, onAction, duration || 4000);
      }
    };
    window.addEventListener('hc_toast', handleCustomToast);
    return () => window.removeEventListener('hc_toast', handleCustomToast);
  }, [addToast]);

  const contextValue = React.useMemo(() => ({ toast: addToast, success, error, info, toastWithAction }), [addToast, success, error, info, toastWithAction]);
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                width: '320px',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                pointerEvents: 'auto',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Left Accent Bar */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background:
                    t.type === 'success' ? '#10B981' : t.type === 'error' ? '#EF4444' : '#3B82F6',
                }}
              />

              <div style={{ marginTop: '2px' }}>
                {t.type === 'success' && <CheckCircle size={20} color="#10B981" />}
                {t.type === 'error' && <AlertCircle size={20} color="#EF4444" />}
                {t.type === 'info' && <Info size={20} color="#3B82F6" />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>
                  {t.title}
                </div>
                {t.message && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                    {t.message}
                  </div>
                )}
                {t.actionLabel && t.onAction && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      t.onAction?.();
                      removeToast(t.id);
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      background: '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)'
                    }}
                  >
                    {t.actionLabel}
                  </button>
                )}
              </div>

              <button
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '12px',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '-8px -8px 0 0'
                }}
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
