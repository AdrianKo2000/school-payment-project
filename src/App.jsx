import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as syncService from "./syncService";
import { CLASS_CATALOGUE, MONTHS, getNextWeekendStartDate } from "./utils/constants";
import StudentTable from "./components/StudentTable";
import AddStudentModal from "./components/AddStudentModal";
import PaymentHistoryView from "./components/PaymentHistoryView";
import Toast from "./components/Toast";
import ConfirmModal from "./components/ConfirmModal";
import { Users, History, CloudLightning, Download, UserPlus, ChevronDown, Trash2 } from "lucide-react";
import Skeleton from "./components/Skeleton";


const calculateEndDate = (startDateStr) => {
  if (!startDateStr) return "";
  let d = new Date(startDateStr + "T12:00:00");
  let sessions = 0;
  while (sessions < 16) {
    const day = d.getDay();
    if (day === 0 || day === 6) sessions++;
    if (sessions === 16) break;
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split("T")[0];
};

export default function App() {
  const currentCalendarDate = new Date();

  // State Management with Persistence
  const [currentView, setCurrentView] = useState(() => localStorage.getItem("academy_active_view_tab") || "tracking");
  
  // FIXED HERE: Added lazy initialization from localStorage for the active class tab
  const [selectedClass, setSelectedClass] = useState(() => {
    return localStorage.getItem("academy_active_class_tab") || "beginner-1";
  });
  
  const [selectedMonth, setSelectedMonth] = useState(currentCalendarDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentCalendarDate.getFullYear());

  const [students, setStudents] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false, title: "", message: "", onConfirm: () => {},
  });

  

  const showToast = useCallback((message, type = "success") => setToast({ message, type }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  // Sync state modifications out to localStorage
  useEffect(() => localStorage.setItem("academy_active_view_tab", currentView), [currentView]);
  
  // FIXED HERE: Added effect hook to save the selected class to localStorage when altered
  useEffect(() => {
    localStorage.setItem("academy_active_class_tab", selectedClass);
  }, [selectedClass]);

  // Database Handlers
  const loadDatabase = useCallback(async () => {
    try {
      const [localStudents, localHistory] = await Promise.all([
        syncService.getStudents(),
        syncService.getPaymentHistory()
      ]);
      setStudents(localStudents);
      setPaymentHistory(localHistory);
    } catch (err) {
      showToast("Storage initialization failed", "error");
    }
  }, [showToast]);

  useEffect(() => { loadDatabase(); }, [loadDatabase]);

  const triggerSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncService.syncWithCloud();
      const [localStudents, localHistory] = await Promise.all([
        syncService.getStudents(),
        syncService.getPaymentHistory()
      ]);
      setStudents(localStudents);
      setPaymentHistory(localHistory);
      showToast("Database synchronized cleanly!");
    } catch (err) {
      console.error("Sync error:", err);
      showToast("Network sync failed. Check connection.", "error");
    } finally {
      setSyncing(false);
    }
  }, [syncing, showToast]);

  const handleAddStudent = async (formData) => {
    try {
      await syncService.addStudent({ 
        tuition_paid: false, 
        book_paid: false,
        ...formData 
      });
      showToast("Student profile logged successfully!");
      await loadDatabase();
      setTimeout(() => triggerSync(), 100);
    } catch (err) {
      showToast("Could not save student", "error");
    }
  };

  const handleUpdateStudent = async (id, changes) => {
    try {
      await syncService.updateStudent(id, changes);
      showToast("Student profile updated");
      await loadDatabase();
      setTimeout(() => triggerSync(), 100);
    } catch (err) {
      showToast("Update rejected", "error");
    }
  };

  const handleDeleteStudent = (student) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Remove Student Enrollment",
      message: `Permanently remove ${student.name}? This will cascade to the cloud mirror.`,
      onConfirm: async () => {
        await syncService.deleteStudent(student.id);
        showToast(`Removed student profile: ${student.name}`);
        await loadDatabase();
        setTimeout(() => triggerSync(), 100);
      },
    });
  };

  const handleDeleteHistoryRow = (record) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Delete History Entry",
      message: `Permanently remove payment log for ${record.student_name}?`,
      onConfirm: async () => {
        await syncService.deletePaymentHistoryRow(record.id);
        showToast("Payment record scheduled for deletion");
        await loadDatabase();
        setTimeout(() => triggerSync(), 100);
      },
    });
  };

  const handleClearHistory = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: "CRITICAL: Database Purge Sequence",
      message: "WARNING: This will permanently wipe out ALL payment history ledger records globally. Proceed?",
      isDanger: true,
      onConfirm: async () => {
        await syncService.clearAllPaymentHistory();
        showToast("History records wiped");
        await loadDatabase();
        setTimeout(() => triggerSync(), 100);
      },
    });
  };

  const completeFullPaymentCycle = async (student) => {
    try {
      await syncService.archivePayment({ 
        ...student, 
        archived_at: new Date().toISOString() 
      });
      
      const nextStart = getNextWeekendStartDate(student.end_date);
      await syncService.addStudent({
        name: student.name,
        phone: student.phone,
        class_key: student.class_key,
        school_fee: student.school_fee,
        book_fee: student.book_fee,
        start_date: nextStart,
        end_date: calculateEndDate(nextStart),
        tuition_paid: false,
        book_paid: false,
        is_copy: true,
      });

      await syncService.updateStudent(student.id, { tuition_paid: true, book_paid: true });
      showToast(`Cycle complete! New month created.`);
      await loadDatabase();
      
      setTimeout(() => {
        triggerSync();
      }, 150);

    } catch (err) {
      console.error(err);
      showToast("Payment cycle processing failed", "error");
    }
  };

  const handlePayTuition = async (student) => {
    if (student.book_paid || Number(student.book_fee || 0) === 0) {
      await completeFullPaymentCycle(student);
    } else {
      await syncService.updateStudent(student.id, { tuition_paid: true });
      showToast(`Tuition cleared for ${student.name}. Book fee outstanding.`);
      await loadDatabase();
      setTimeout(() => triggerSync(), 100);
    }
  };

  const handlePayBook = async (student) => {
    if (student.tuition_paid) {
      await completeFullPaymentCycle(student);
    } else {
      await syncService.updateStudent(student.id, { book_paid: true });
      showToast(`Book fee cleared for ${student.name}. Tuition outstanding.`);
      await loadDatabase();
      setTimeout(() => triggerSync(), 100);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (student.class_key !== selectedClass) return false;
      const start = new Date(student.start_date);
      return selectedMonth === start.getMonth() && selectedYear === start.getFullYear();
    });
  }, [students, selectedClass, selectedMonth, selectedYear]);

  const activeClassName = useMemo(() => {
    return CLASS_CATALOGUE.find((c) => c.id === selectedClass)?.name || selectedClass;
  }, [selectedClass]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-900">YLE</div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide uppercase">Campus Class</h1>
            <p className="text-xs text-slate-500 font-medium">Student Payment Data</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5">
          <button onClick={() => setCurrentView("tracking")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentView === "tracking" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "hover:bg-slate-800 hover:text-white"}`}>
            <Users size={18} /> Student Data
          </button>
          <button onClick={() => setCurrentView("history")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentView === "history" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "hover:bg-slate-800 hover:text-white"}`}>
            <History size={18} /> Payment History
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs font-medium space-y-2">
          {currentView === "history" && (
            <button onClick={handleClearHistory} className="w-full flex items-center gap-2 px-3 py-2 border border-rose-900/50 bg-rose-950/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors">
              <Trash2 size={14} /> Wipe All History Records
            </button>
          )}
          <button onClick={() => { syncService.exportToJSON(); showToast("Clean backup file generated!"); }} className="w-full flex items-center gap-2 px-3 py-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <Download size={14} /> Export JSON Data
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4 relative">
            <button onClick={() => setClassDropdownOpen(!classDropdownOpen)} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded-lg text-sm font-bold text-slate-900">
              Class: {activeClassName} <ChevronDown size={14} />
            </button>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border">
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-xs font-bold px-2 py-1 border-none outline-none text-slate-700">
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <input type="number" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="w-16 bg-transparent text-xs font-bold text-center border-none outline-none text-slate-700" />
            </div>

            {classDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-xl shadow-xl z-50 p-2 divide-y divide-slate-100">
                {["Lower Levels", "Intermediate Levels", "Advanced Levels"].map((category) => (
                  <div key={category} className="py-1.5 first:pt-0 last:pb-0">
                    <span className="block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{category}</span>
                    {CLASS_CATALOGUE.filter((c) => c.category === category).map((cls) => (
                      <button key={cls.id} onClick={() => { setSelectedClass(cls.id); setClassDropdownOpen(false); }} className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold ${selectedClass === cls.id ? "bg-emerald-50 text-emerald-700 font-bold" : "text-slate-600 hover:bg-slate-50"}`}>
                        {cls.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={triggerSync} disabled={syncing} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">
              <CloudLightning size={14} className={syncing ? "animate-spin text-amber-500" : "text-slate-400"} />
              {syncing ? "Syncing..." : "Cloud Sync"}
            </button>
            <button onClick={() => { setEditingStudent(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase">
              <UserPlus size={14} /> Add Student
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50/60">
          {currentView === "tracking" ? (
            <StudentTable students={filteredStudents} selectedClass={selectedClass} onPayTuition={handlePayTuition} onPayBook={handlePayBook} onEditStudent={(s) => { setEditingStudent(s); setModalOpen(true); }} onDeleteStudent={handleDeleteStudent} />
          ) : (
            <PaymentHistoryView history={paymentHistory} onDeleteHistoryRow={handleDeleteHistoryRow} />
          )}
        </main>
      </div>

      {modalOpen && (
        <AddStudentModal key={editingStudent?.id ?? "new"} student={editingStudent} selectedClass={selectedClass} calculateEndDate={calculateEndDate} onAdd={handleAddStudent} onUpdate={handleUpdateStudent} onClose={() => { setModalOpen(false); setEditingStudent(null); }} />
      )}

      <ConfirmModal isOpen={confirmModalConfig.isOpen} title={confirmModalConfig.title} message={confirmModalConfig.message} isDanger={confirmModalConfig.isDanger} onConfirm={confirmModalConfig.onConfirm} onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))} />
      
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  );
}