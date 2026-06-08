import React from "react";
import { CheckCircle2, XCircle, Edit2, Trash2 } from "lucide-react";

const formatCurrency = (amount) => {
  const numericAmount = Number(amount || 0);
  return `${numericAmount.toLocaleString()} Ks`; 
};

export default function StudentTable({ students, onPayTuition, onPayBook, onEditStudent, onDeleteStudent }) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">Student Information</th>
                <th className="px-6 py-3.5">Registration Period</th>
                <th className="px-6 py-3.5">School Fee Status</th>
                <th className="px-6 py-3.5">Book Fee Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No active student records matched for this class filtering window.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isFullyPaid = student.tuition_paid && student.book_paid;

                  return (
                    <tr key={student.id} className={`hover:bg-slate-50/80 transition-colors ${isFullyPaid ? "bg-emerald-50/20" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{student.name}</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">{student.phone}</div>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                        <div>Start: {student.start_date}</div>
                        <div className="mt-0.5 text-slate-400">End: {student.end_date}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${student.tuition_paid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {formatCurrency(student.school_fee)}
                          </span>
                          <button
                            onClick={() => onPayTuition(student)}
                            disabled={student.tuition_paid}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${student.tuition_paid ? "text-emerald-600 bg-emerald-50/50 cursor-default" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95"}`}
                          >
                            {student.tuition_paid ? <CheckCircle2 size={14} /> : <XCircle size={14} className="text-slate-400" />}
                            {student.tuition_paid ? "Paid" : "Mark Paid"}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${student.book_paid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {formatCurrency(student.book_fee)}
                          </span>
                          <button
                            onClick={() => onPayBook(student)}
                            disabled={student.book_paid}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${student.book_paid ? "text-emerald-600 bg-emerald-50/50 cursor-default" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95"}`}
                          >
                            {student.book_paid ? <CheckCircle2 size={14} /> : <XCircle size={14} className="text-slate-400" />}
                            {student.book_paid ? "Paid" : "Mark Paid"}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onEditStudent(student)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Edit Student Profile">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => onDeleteStudent(student)} className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Delete Student">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}