import React from "react";
import { Calendar, Phone, Trash2, ShieldCheck } from "lucide-react";
import { CLASS_CATALOGUE } from "../utils/constants";

const formatCurrency = (amount) => {
  const numericAmount = Number(amount || 0);
  return `${numericAmount.toLocaleString()} Ks`; 
};

export default function PaymentHistoryView({ history, onDeleteHistoryRow }) {
  const getClassName = (classKey) => {
    return CLASS_CATALOGUE.find((c) => c.id === classKey)?.name || classKey;
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Archived Payment Audit Ledger</h2>
        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
          Total Cycles Logged: {history.length}
        </span>
      </div>

      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 font-medium shadow-xs">
            No archived cycle logs found in the selected lookup timeline.
          </div>
        ) : (
          history.map((record) => (
            <div key={record.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex items-center justify-between gap-4 group">
              
              {/* Note the fix here: record.student_name */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="font-bold text-slate-900 truncate">{record.student_name}</h4>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                    {getClassName(record.class_key)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><Phone size={13} className="text-slate-400" />{record.phone || "No phone"}</span>
                  <span className="flex items-center gap-1"><Calendar size={13} className="text-slate-400" />Cycle: {record.start_date} → {record.end_date}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-right">
                <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 flex justify-between gap-4">
                    <span className="font-medium text-slate-400">School Fee:</span>{formatCurrency(record.school_fee)}
                  </div>
                  <div className="text-xs font-bold text-slate-800 flex justify-between gap-4">
                    <span className="font-medium text-slate-400">Book Fee:</span>{formatCurrency(record.book_fee)}
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md mb-1">
                    <ShieldCheck size={12} /> Archived
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">{formatTimestamp(record.archived_at)}</p>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                <button onClick={() => onDeleteHistoryRow(record)} className="p-2 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all" title="Permanently remove line item">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}