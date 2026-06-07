import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const styles = type === 'error' 
    ? 'bg-rose-900 border-rose-800 text-rose-100' 
    : 'bg-slate-900 border-slate-800 text-emerald-400';

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all animate-in slide-in-from-bottom-5 ${styles}`}>
      {type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
      <span className="text-sm font-semibold tracking-wide text-white">{message}</span>
      <button onClick={onDismiss} className="ml-2 p-0.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}