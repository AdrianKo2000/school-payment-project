import React, { useState, useRef } from "react";
import {
  X,
  Calendar,
  User,
  Phone,
  DollarSign,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
} from "lucide-react";

export default function AddStudentModal({
  student,
  selectedClass,
  classes,
  calculateEndDate,
  onAdd,
  onUpdate,
  onClose,
}) {
  const isEditMode = !!student;
  const modalRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState(() => {
    if (isEditMode && student) {
      return {
        name: student.name || "",
        phone: student.phone || "",
        phone2: student.phone2 || "", // Added phone2 field support
        class_key: student.class_key || selectedClass,
        start_date: student.start_date || "",
        end_date: student.end_date || "",
        school_fee: student.school_fee || "",
        book_fee: student.book_fee || "",
        tuition_paid: !!student.tuition_paid,
        book_paid: !!student.book_paid,
      };
    } else {
      const defaultStart = new Date().toISOString().split("T")[0];
      const autoEnd = calculateEndDate ? calculateEndDate(defaultStart) : "";
      return {
        name: "",
        phone: "",
        phone2: "", // Added default empty phone2 field
        class_key: selectedClass,
        start_date: defaultStart,
        end_date: autoEnd,
        school_fee: "",
        book_fee: "",
        tuition_paid: false,
        book_paid: false,
      };
    }
  });

  const [isDateOverridden, setIsDateOverridden] = useState(isEditMode);

  // Strict Phone Formatter (No Hyphens, Max 11 Digits)
  const handlePhoneChange = (e) => {
    let rawDigits = e.target.value.replace(/\D/g, "");
    if (rawDigits.length > 11) rawDigits = rawDigits.slice(0, 11);
    setFormData((prev) => ({ ...prev, phone: rawDigits }));
    if (errors.phone) setErrors((p) => ({ ...p, phone: null }));
  };

  // NEW: Strict Secondary Phone Formatter (No Hyphens, Max 11 Digits)
  const handlePhone2Change = (e) => {
    let rawDigits = e.target.value.replace(/\D/g, "");
    if (rawDigits.length > 11) rawDigits = rawDigits.slice(0, 11);
    setFormData((prev) => ({ ...prev, phone2: rawDigits }));
    if (errors.phone2) setErrors((p) => ({ ...p, phone2: null }));
  };

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setFormData((prev) => {
      const updated = { ...prev, start_date: newStart };
      if (!isDateOverridden && newStart && calculateEndDate) {
        updated.end_date = calculateEndDate(newStart);
      }
      return updated;
    });
    if (errors.start_date) setErrors((p) => ({ ...p, start_date: null }));
  };

  const handleEndDateChange = (e) => {
    setFormData((prev) => ({ ...prev, end_date: e.target.value }));
    setIsDateOverridden(e.target.value !== "");
    if (errors.end_date) setErrors((p) => ({ ...p, end_date: null }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Student name is required";

    if (formData.phone && formData.phone.length < 9) {
      errs.phone = "Enter a complete primary phone number";
    }

    // Optional phone2 length verification
    if (formData.phone2 && formData.phone2.length < 9) {
      errs.phone2 = "Enter a complete secondary phone number";
    }

    if (!formData.start_date)
      errs.start_date = "Start session date is required";
    if (!formData.end_date) errs.end_date = "End target date is required";
    if (!formData.school_fee || Number(formData.school_fee) < 0)
      errs.school_fee = "Enter valid tuition rate";
    if (formData.book_fee !== "" && Number(formData.book_fee) < 0)
      errs.book_fee = "Fee cannot be negative";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || submitting) return;

    setSubmitting(true);
    try {
      const cleanPayload = {
        ...formData,
        school_fee: Number(formData.school_fee),
        book_fee: formData.book_fee ? Number(formData.book_fee) : 0,
      };

      if (isEditMode) await onUpdate(student.id, cleanPayload);
      else await onAdd(cleanPayload);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const availableClasses = Array.isArray(classes) ? classes : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditMode ? "Modify Student Profile" : "Enroll New Student"}
            </h2>
            <p className="text-xs text-slate-500">
              Configure administrative details and billing periods.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, name: e.target.value }));
                    if (errors.name) setErrors((x) => ({ ...x, name: null }));
                  }}
                  placeholder="John Doe"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${errors.name ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:border-emerald-500"}`}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                Class Assignment *
              </label>
              <div className="relative">
                <GraduationCap
                  size={16}
                  className="absolute left-3 top-3.5 text-slate-400 z-10"
                />
                <select
                  value={formData.class_key}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, class_key: e.target.value }))
                  }
                  className="w-full pl-9 pr-8 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-semibold focus:outline-none appearance-none bg-white relative"
                >
                  {availableClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-4 pointer-events-none text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Dual-column Phone Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                Primary Phone
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="09xxxxxxxxx"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${errors.phone ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:border-emerald-500"}`}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                Secondary Phone
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="tel"
                  value={formData.phone2}
                  onChange={handlePhone2Change}
                  placeholder="09xxxxxxxxx (Optional)"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all ${errors.phone2 ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:border-emerald-500"}`}
                />
              </div>
              {errors.phone2 && (
                <p className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.phone2}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                Start Session *
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={handleStartDateChange}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5 flex justify-between">
                End Target *
                {!isDateOverridden && formData.start_date && (
                  <span className="text-[10px] lowercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 font-bold">
                    16 weekends
                  </span>
                )}
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={handleEndDateChange}
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm font-semibold focus:outline-none ${isDateOverridden ? "border-amber-300 focus:border-amber-500 bg-amber-50/10" : "border-slate-200 focus:border-emerald-500"}`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                School Tuition Fee ($) *
              </label>
              <div className="relative">
                <DollarSign
                  size={16}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="number"
                  step="any"
                  value={formData.school_fee}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, school_fee: e.target.value }));
                    if (errors.school_fee)
                      setErrors((x) => ({ ...x, school_fee: null }));
                  }}
                  placeholder="150.00"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-semibold focus:outline-none"
                />
              </div>
              {errors.school_fee && (
                <p className="text-xs text-rose-600 font-medium mt-1">
                  {errors.school_fee}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                Material Book Fee ($)
              </label>
              <div className="relative">
                <BookOpen
                  size={16}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="number"
                  step="any"
                  value={formData.book_fee}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, book_fee: e.target.value }))
                  }
                  placeholder="45.00"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {isEditMode && (
            <div className="bg-slate-50 border p-4 rounded-xl space-y-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Manual State Overrides
              </span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.tuition_paid}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        tuition_paid: e.target.checked,
                      }))
                    }
                    className="rounded-sm text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Tuition Settled
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.book_paid}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        book_paid: e.target.checked,
                      }))
                    }
                    className="rounded-sm text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  Material Book Settled
                </label>
              </div>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 border border-slate-200 hover:bg-slate-100 bg-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-wide uppercase text-xs rounded-lg shadow-sm transition-all"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {isEditMode ? "Save Changes" : "Confirm Enrollment"}
          </button>
        </div>
      </div>
    </div>
  );
}
