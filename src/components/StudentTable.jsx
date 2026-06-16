import React from "react";
import { Phone, CalendarRange, Edit, Trash2, CheckCircle2, Circle, GraduationCap } from "lucide-react";

export default function StudentTable({ students, classes = [], onPayTuition, onPayBook, onEditStudent, onDeleteStudent }) {
  
  const getClassName = (classKey) => {
    const cls = classes.find((c) => c.id === classKey);
    return cls ? cls.name : classKey;
  };

  const formatDateRange = (startStr, endStr) => {
    if (!startStr || !endStr) return "";
    const start = new Date(startStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const end = new Date(endStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${start} — ${end}`;
  };

  if (!students || students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col items-center justify-center p-12 text-center">
        <h3 className="text-sm font-bold text-slate-800">No Students Found</h3>
        <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4 pl-6">Student Name</th>
              <th className="p-4">Class</th>
              <th className="p-4">Term Cycle</th>
              <th className="p-4">Payment Actions</th>
              <th className="p-4 pr-6 text-right">Settings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => {
              const bookFeeNum = Number(student.book_fee || 0);
              const tuitionFeeNum = Number(student.school_fee || 0);
              
              const isTuitionPaid = student.tuition_paid;
              const isBookPaid = student.book_paid;

              return (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{student.name}</span>
                      {student.phone && (
                        <span className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                          <Phone size={10} /> {student.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-slate-400" />
                      {getClassName(student.class_key)}
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <CalendarRange size={14} className="text-slate-400" />
                      {formatDateRange(student.start_date, student.end_date)}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => !isTuitionPaid && onPayTuition(student)}
                        disabled={isTuitionPaid}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
                          isTuitionPaid 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-not-allowed opacity-70" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        {isTuitionPaid ? <CheckCircle2 size={14} /> : <Circle size={14} className="text-slate-300" />}
                        School Fee (${tuitionFeeNum})
                      </button>

                      <button
                        onClick={() => !isBookPaid && onPayBook(student)}
                        disabled={isBookPaid}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
                          isBookPaid 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-not-allowed opacity-70" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        {isBookPaid ? <CheckCircle2 size={14} /> : <Circle size={14} className="text-slate-300" />}
                        Material (${bookFeeNum})
                      </button>
                    </div>
                  </td>

                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditStudent(student)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Student"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteStudent(student)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Student"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}