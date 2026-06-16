import React from "react";
import {
  Calendar,
  Phone,
  Trash2,
  Receipt,
  BookmarkCheck,
  CalendarRange,
  Inbox,
  GraduationCap,
} from "lucide-react";

export default function PaymentHistoryView({
  history,
  classes = [],
  onDeleteHistoryRow,
}) {
  const formatTimestamp = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateRange = (startStr, endStr) => {
    if (!startStr || !endStr) return "";
    const start = new Date(startStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const end = new Date(endStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${start} — ${end}`;
  };

  const getClassName = (classKey) => {
    const cls = classes.find((c) => c.id === classKey);
    return cls ? cls.name : "Unknown Class";
  };

  if (!history || history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100">
          <Inbox size={28} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">
          No Archive Logs Found
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          There are no recorded transactions matching the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 flex-1 overflow-auto bg-slate-50/30">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-4">
          <span>Historical Statement Ledger</span>
          <span>{history.length} Total Records</span>
        </div>

        <div className="space-y-3">
          {history.map((record) => {
            const studentName =
              record.student_name || record.name || "Unknown Student";
            const tuitionAmt = Number(record.school_fee || 0);
            const bookAmt = Number(record.book_fee || 0);
            const totalTransaction = tuitionAmt + bookAmt;

            return (
              <div
                key={record.id}
                className="group relative bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm transition-all hover:shadow-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-2xl group-hover:bg-indigo-600 transition-colors"></div>

                <div className="flex items-start gap-3 pl-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                    <Receipt size={18} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-indigo-900 transition-colors">
                      {studentName}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                      {record.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-slate-400" />{" "}
                          {record.phone}
                        </span>
                      )}
                      {record.phone2 && (
                        <span className="text-slate-300">|</span>
                      )}
                      {record.phone2 && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-slate-400" />{" "}
                          {record.phone2}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md w-fit">
                        <GraduationCap size={12} />
                        <span>{getClassName(record.class_key)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md w-fit">
                        <CalendarRange size={12} />
                        <span>
                          Term:{" "}
                          {formatDateRange(record.start_date, record.end_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 pl-2 sm:pl-0">
                  <div className="flex items-center gap-4 sm:text-right">
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        Ledger Distribution
                      </p>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <span className="flex items-center gap-1">
                          <BookmarkCheck
                            size={13}
                            className="text-indigo-400"
                          />{" "}
                          Tuition: ${tuitionAmt}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="flex items-center gap-1">
                          <BookmarkCheck
                            size={13}
                            className="text-violet-400"
                          />{" "}
                          Material: ${bookAmt}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-center min-w-[85px]">
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wide">
                        Paid Vol
                      </p>
                      <p className="text-sm font-black text-slate-800 tracking-tight">
                        ${totalTransaction}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden lg:block text-right space-y-0.5">
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1 justify-end">
                        <Calendar size={10} /> Archived Stamp
                      </p>
                      <p className="text-xs font-bold text-slate-500 whitespace-nowrap">
                        {formatTimestamp(record.archived_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteHistoryRow(record)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
