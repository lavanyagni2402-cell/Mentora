import { createContext, useCallback, useContext, useState } from 'react';

const ToastCtx = createContext(() => {});
let id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, action) => {
    const t = { id: ++id, message, action };
    setToasts((x) => [...x, t]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div role="status" aria-live="polite" className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-max max-w-[calc(100%-32px)]">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl bg-ink text-bg px-4 py-2.5 shadow-lg font-medium">
            <span>{t.message}</span>
            {t.action && (
              <button className="font-bold text-accent px-1" onClick={() => { t.action.fn(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
