import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onClose, isDanger = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header split */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isDanger && (
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle size={18} />
              </div>
            )}
            <h3 className="text-sm font-bold text-slate-950">{title || 'Confirm Action'}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body content block */}
        <div className="p-6">
          <p className="text-sm font-medium leading-relaxed text-slate-600">
            {message || 'Are you absolutely sure you want to proceed with this operation?'}
          </p>
        </div>

        {/* Action Triggers */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel Actions
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-colors ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700 border border-rose-700' 
                : 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-700'
            }`}
          >
            Confirm & Execute
          </button>
        </div>

      </div>
    </div>
  );
}