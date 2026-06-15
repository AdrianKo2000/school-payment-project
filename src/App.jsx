import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as syncService from "./syncService";
import { MONTHS, getNextWeekendStartDate } from "./utils/constants";
import StudentTable from "./components/StudentTable";
import AddStudentModal from "./components/AddStudentModal";
import PaymentHistoryView from "./components/PaymentHistoryView";
import SettingsView from "./components/SettingsView";
import Toast from "./components/Toast";
import ConfirmModal from "./components/ConfirmModal";
import {
  Users,
  History,
  CloudLightning,
  Download,
  UserPlus,
  ChevronDown,
  Trash2,
  Users2,
  CheckCircle2,
  XCircle,
  Settings,
  Search,
} from "lucide-react";
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

// Levenshtein Distance Matrix for approximate typo-matching
const getLevenshteinDistance = (a, b) => {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1,
        );
      }
    }
  }
  return matrix[a.length][b.length];
};

// Shared Fuzzy Search match algorithm
const isFuzzyMatch = (studentName, searchQuery) => {
  if (!studentName) return false;

  const cleanName = studentName.toLowerCase().trim();
  const cleanQuery = searchQuery.toLowerCase().trim();

  if (cleanName.includes(cleanQuery)) return true;
  if (cleanQuery.length < 3) return false;

  const nameTokens = cleanName.split(/\s+/);
  for (const token of nameTokens) {
    const distance = getLevenshteinDistance(token, cleanQuery);
    const allowedTypos = cleanQuery.length <= 4 ? 1 : 2;
    if (distance <= allowedTypos) return true;
  }
  return false;
};

export default function App() {
  const currentCalendarDate = new Date();

  const [currentView, setCurrentView] = useState(
    () => localStorage.getItem("academy_active_view_tab") || "tracking",
  );
  const [selectedClass, setSelectedClass] = useState(
    () => localStorage.getItem("academy_active_class_tab") || "all",
  );
  const [selectedMonth, setSelectedMonth] = useState(
    currentCalendarDate.getMonth(),
  );
  const [selectedYear, setSelectedYear] = useState(
    currentCalendarDate.getFullYear(),
  );

  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [students, setStudents] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [dynamicClasses, setDynamicClasses] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showToast = useCallback(
    (message, type = "success") => setToast({ message, type }),
    [],
  );
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(
    () => localStorage.setItem("academy_active_view_tab", currentView),
    [currentView],
  );
  useEffect(
    () => localStorage.setItem("academy_active_class_tab", selectedClass),
    [selectedClass],
  );

  const loadDatabase = useCallback(async () => {
    try {
      await syncService.openDB();
      const [localStudents, localHistory, localClasses] = await Promise.all([
        syncService.getStudents(),
        syncService.getPaymentHistory(),
        syncService.getClasses(),
      ]);
      setStudents(localStudents);
      setPaymentHistory(localHistory);
      setDynamicClasses(localClasses);
    } catch (err) {
      console.error(err);
      showToast("Storage initialization failed", "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  const triggerSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncService.syncWithCloud();
      await loadDatabase();
      showToast("Database synchronized cleanly!");
    } catch (err) {
      console.error("Sync error:", err);
      showToast("Network sync failed. Check connection.", "error");
    } finally {
      setSyncing(false);
    }
  }, [syncing, loadDatabase, showToast]);

  const executeWithSync = async (dbOperation, successMessage) => {
    try {
      await dbOperation();
      if (successMessage) showToast(successMessage);
      await loadDatabase();
      await triggerSync();
    } catch (err) {
      console.error("Operation failed:", err);
      showToast("An error occurred during the operation.", "error");
    }
  };

  const handleAddStudent = (formData) => {
    executeWithSync(
      () =>
        syncService.addStudent({
          tuition_paid: false,
          book_paid: false,
          ...formData,
        }),
      "Student profile logged successfully!",
    );
  };

  const handleUpdateStudent = (id, changes) => {
    executeWithSync(
      () => syncService.updateStudent(id, changes),
      "Student profile updated",
    );
  };

  const handleDeleteStudent = (student) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Remove Student Enrollment",
      message: `Permanently remove ${student.name}? This will cascade to the cloud mirror.`,
      onConfirm: () =>
        executeWithSync(
          () => syncService.deleteStudent(student.id),
          `Removed student profile: ${student.name}`,
        ),
    });
  };

  const handleDeleteHistoryRow = (record) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Delete History Entry",
      message: `Permanently remove payment log for ${record.student_name || record.name}?`,
      onConfirm: () =>
        executeWithSync(
          () => syncService.deletePaymentHistoryRow(record.id),
          "Payment record scheduled for deletion",
        ),
    });
  };

  const handleClearHistory = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: "CRITICAL: Database Purge Sequence",
      message:
        "WARNING: This will permanently wipe out ALL payment history ledger records globally. Proceed?",
      isDanger: true,
      onConfirm: () =>
        executeWithSync(
          () => syncService.clearAllPaymentHistory(),
          "History records wiped",
        ),
    });
  };

  const handleSaveClasses = (updatedClasses) => {
    executeWithSync(
      () => syncService.saveClasses(updatedClasses),
      "Class catalogue updated and synced to cloud!",
    );
  };

  const completeFullPaymentCycle = (student) => {
    executeWithSync(async () => {
      await syncService.archivePayment({
        ...student,
        archived_at: new Date().toISOString(),
      });
      const nextStart = getNextWeekendStartDate(student.end_date);
      await syncService.addStudent({
        ...student,
        id: undefined,
        start_date: nextStart,
        end_date: calculateEndDate(nextStart),
        tuition_paid: false,
        book_paid: false,
        is_copy: true,
      });
      await syncService.updateStudent(student.id, {
        tuition_paid: true,
        book_paid: true,
      });
    }, `Cycle complete! New month created.`);
  };

  const handlePayTuition = (student) => {
    if (student.book_paid || Number(student.book_fee || 0) === 0)
      completeFullPaymentCycle(student);
    else
      executeWithSync(
        () => syncService.updateStudent(student.id, { tuition_paid: true }),
        `Tuition cleared for ${student.name}. Book fee outstanding.`,
      );
  };

  const handlePayBook = (student) => {
    if (student.tuition_paid) completeFullPaymentCycle(student);
    else
      executeWithSync(
        () => syncService.updateStudent(student.id, { book_paid: true }),
        `Book fee cleared for ${student.name}. Tuition outstanding.`,
      );
  };

  const baseFilteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchClass =
        selectedClass === "all" || student.class_key === selectedClass;
      const start = new Date(student.start_date);
      const matchDate =
        selectedMonth === start.getMonth() &&
        selectedYear === start.getFullYear();
      return matchClass && matchDate;
    });
  }, [students, selectedClass, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    const total = baseFilteredStudents.length;
    let paid = 0;
    baseFilteredStudents.forEach((s) => {
      const isFullyPaid =
        s.tuition_paid && (s.book_paid || Number(s.book_fee || 0) === 0);
      if (isFullyPaid) paid++;
    });
    return { total, paid, unpaid: total - paid };
  }, [baseFilteredStudents]);

  const finalFilteredStudents = useMemo(() => {
    return baseFilteredStudents.filter((student) => {
      if (paymentFilter !== "all") {
        const isFullyPaid =
          student.tuition_paid &&
          (student.book_paid || Number(student.book_fee || 0) === 0);
        if (paymentFilter === "paid" && !isFullyPaid) return false;
        if (paymentFilter === "unpaid" && isFullyPaid) return false;
      }

      if (searchQuery.trim() !== "") {
        const matchName = isFuzzyMatch(student.name, searchQuery);
        const matchPhone = student.phone
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase().trim());
        if (!matchName && !matchPhone) return false;
      }

      return true;
    });
  }, [baseFilteredStudents, paymentFilter, searchQuery]);

  // NEW: Filtering logic pipeline applied cleanly to paymentHistory store array
  const filteredPaymentHistory = useMemo(() => {
    return paymentHistory.filter((record) => {
      // 1. Class Check
      const matchClass =
        selectedClass === "all" || record.class_key === selectedClass;

      // 2. Cycle Date Context Check (checks registration period match)
      const start = new Date(record.start_date);
      const matchDate =
        selectedMonth === start.getMonth() &&
        selectedYear === start.getFullYear();

      // 3. Typo-tolerant Fuzzy Search check
      let matchSearch = true;
      if (searchQuery.trim() !== "") {
        const targetName = record.student_name || record.name || "";
        const matchName = isFuzzyMatch(targetName, searchQuery);
        const matchPhone = record.phone
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase().trim());
        matchSearch = matchName || matchPhone;
      }

      return matchClass && matchDate && matchSearch;
    });
  }, [paymentHistory, selectedClass, selectedMonth, selectedYear, searchQuery]);

  const activeClassName = useMemo(() => {
    if (selectedClass === "all") return "All Students";
    return (
      dynamicClasses.find((c) => c.id === selectedClass)?.name || selectedClass
    );
  }, [selectedClass, dynamicClasses]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 antialiased font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-900">
            YLE
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide uppercase">
              Campus Class
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Student Payment Data
            </p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <button
            onClick={() => setCurrentView("tracking")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentView === "tracking" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <Users size={18} /> Student Data
          </button>
          <button
            onClick={() => setCurrentView("history")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentView === "history" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <History size={18} /> Payment History
          </button>
          <button
            onClick={() => setCurrentView("settings")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentView === "settings" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "hover:bg-slate-800 hover:text-white"}`}
          >
            <Settings size={18} /> Settings
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs font-medium space-y-2">
          {currentView === "history" && (
            <button
              onClick={handleClearHistory}
              className="w-full flex items-center gap-2 px-3 py-2 border border-rose-900/50 bg-rose-950/20 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
            >
              <Trash2 size={14} /> Wipe All History Records
            </button>
          )}
          <button
            onClick={() => {
              syncService.exportToJSON();
              showToast("Clean backup file generated!");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Download size={14} /> Export JSON Data
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* GLOBAL HEADER: Holds global persistent filter parameters */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4 relative">
            <button
              onClick={() => setClassDropdownOpen(!classDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded-lg text-sm font-bold text-slate-900"
            >
              Class: {activeClassName} <ChevronDown size={14} />
            </button>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold px-2 py-1 border-none outline-none text-slate-700"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-16 bg-transparent text-xs font-bold text-center border-none outline-none text-slate-700"
              />
            </div>

            {classDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-xl shadow-xl z-50 p-2 max-h-[80vh] overflow-y-auto">
                <div className="pb-1.5 mb-1.5 border-b border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedClass("all");
                      setClassDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${selectedClass === "all" ? "bg-emerald-50 text-emerald-700 font-bold" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    All Students (Overview)
                  </button>
                </div>
                {["Lower Levels", "Intermediate Levels", "Advanced Levels"].map(
                  (category) => (
                    <div key={category} className="py-1.5 first:pt-0 last:pb-0">
                      <span className="block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {category}
                      </span>
                      {dynamicClasses
                        .filter((c) => c.category === category)
                        .map((cls) => (
                          <button
                            key={cls.id}
                            onClick={() => {
                              setSelectedClass(cls.id);
                              setClassDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold ${selectedClass === cls.id ? "bg-emerald-50 text-emerald-700 font-bold" : "text-slate-600 hover:bg-slate-50"}`}
                          >
                            {cls.name}
                          </button>
                        ))}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* NEW: Globalized Input Box inside header layout strip */}
          <div className="relative flex-1 max-w-xs mx-4 hidden sm:block">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Fuzzy search name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl text-xs font-semibold text-slate-700 transition-all focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <CloudLightning
                size={14}
                className={
                  syncing ? "animate-spin text-amber-500" : "text-slate-400"
                }
              />
              {syncing ? "Syncing..." : "Cloud Sync"}
            </button>
            <button
              onClick={() => {
                setEditingStudent(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase"
            >
              <UserPlus size={14} /> Add Student
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50/60 flex flex-col">
          {currentView === "tracking" && (
            <div className="p-6 pb-0 flex flex-col gap-4">
              {/* Responsive fallback for mobile search input configuration */}
              <div className="relative w-full sm:hidden">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Fuzzy search name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                      <Users2 size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Total in View
                      </p>
                      <p className="text-sm font-black text-slate-800 leading-none mt-0.5">
                        {stats.total}
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider">
                        Fully Paid
                      </p>
                      <p className="text-sm font-black text-emerald-700 leading-none mt-0.5">
                        {stats.paid}
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-100"></div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                      <XCircle size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-600/70 tracking-wider">
                        Unpaid / Partial
                      </p>
                      <p className="text-sm font-black text-rose-700 leading-none mt-0.5">
                        {stats.unpaid}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl w-full xl:w-auto">
                  {["all", "paid", "unpaid"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setPaymentFilter(f)}
                      className={`flex-1 xl:flex-none px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${paymentFilter === f ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <StudentTable
                students={finalFilteredStudents}
                onPayTuition={handlePayTuition}
                onPayBook={handlePayBook}
                onEditStudent={(s) => {
                  setEditingStudent(s);
                  setModalOpen(true);
                }}
                onDeleteStudent={handleDeleteStudent}
              />
            </div>
          )}

          {currentView === "history" && (
            <div className="flex flex-col flex-1">
              {/* Responsive fallback for mobile search input configuration inside history */}
              <div className="p-6 pb-0 sm:hidden">
                <div className="relative w-full">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Fuzzy search name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* Passing the newly structured dataset stream component prop directly */}
              <PaymentHistoryView
                history={filteredPaymentHistory}
                onDeleteHistoryRow={handleDeleteHistoryRow}
              />
            </div>
          )}

          {currentView === "settings" && (
            <SettingsView
              classes={dynamicClasses}
              onSaveClasses={handleSaveClasses}
            />
          )}
        </main>
      </div>

      {modalOpen && (
        <AddStudentModal
          key={editingStudent?.id ?? "new"}
          student={editingStudent}
          selectedClass={selectedClass === "all" ? "beginner-1" : selectedClass}
          classes={dynamicClasses}
          calculateEndDate={calculateEndDate}
          onAdd={handleAddStudent}
          onUpdate={handleUpdateStudent}
          onClose={() => {
            setModalOpen(false);
            setEditingStudent(null);
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        isDanger={confirmModalConfig.isDanger}
        onConfirm={confirmModalConfig.onConfirm}
        onClose={() =>
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))
        }
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}
