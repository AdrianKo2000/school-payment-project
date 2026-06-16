import React, { useState } from "react";
import { Plus, Save, Trash2, Settings2, GripVertical, ArrowUpDown } from "lucide-react";

export default function SettingsView({ classes, onSaveClasses }) {
  const [localClasses, setLocalClasses] = useState(classes);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedId, setDraggedId] = useState(null);

  const categories = ["Lower Levels", "Intermediate Levels", "Advanced Levels"];

  const handleAddClass = (category) => {
    const newId = `class-${Date.now()}`;
    setLocalClasses([
      ...localClasses,
      { id: newId, name: "New Class", category },
    ]);
    setHasChanges(true);
  };

  const handleUpdateClass = (id, newName) => {
    setLocalClasses(
      localClasses.map((c) => (c.id === id ? { ...c, name: newName } : c)),
    );
    setHasChanges(true);
  };

  const handleDeleteClass = (id) => {
    setLocalClasses(localClasses.filter((c) => c.id !== id));
    setHasChanges(true);
  };

  // FIX: Case-Insensitive Alphabetical Sorting Option
  const handleSortAlphabetically = (category) => {
    const nonCategoryClasses = localClasses.filter((c) => c.category !== category);
    const categoryClasses = localClasses.filter((c) => c.category === category);

    categoryClasses.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true })
    );

    setLocalClasses([...nonCategoryClasses, ...categoryClasses]);
    setHasChanges(true);
  };

  // FIX: HTML5 Native Drag & Drop Logic implementation
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = localClasses.findIndex((c) => c.id === draggedId);
    const targetIndex = localClasses.findIndex((c) => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Constrain drag boundaries to within the same category container
    if (localClasses[draggedIndex].category !== localClasses[targetIndex].category) return;

    const updated = [...localClasses];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setLocalClasses(updated);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleSave = () => {
    onSaveClasses(localClasses);
    setHasChanges(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="text-emerald-500" /> Class & Curriculum Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your active class roster and organizational categories.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            hasChanges
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {categories.map((category) => {
          const categoryClasses = localClasses.filter(
            (c) => c.category === category,
          );

          return (
            <div
              key={category}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300"
            >
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {category}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Alphabetize Sorting Trigger */}
                  <button
                    type="button"
                    title="Sort Alphabetically"
                    onClick={() => handleSortAlphabetically(category)}
                    className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                  >
                    <ArrowUpDown size={12} />
                  </button>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                    {categoryClasses.length}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 space-y-2">
                {categoryClasses.map((cls) => (
                  <div
                    key={cls.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, cls.id)}
                    onDragOver={(e) => handleDragOver(e, cls.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 group p-1.5 rounded-lg transition-all ${
                      draggedId === cls.id
                        ? "bg-emerald-50 border-emerald-200 opacity-40 scale-95 select-none"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400 p-0.5 transition-colors">
                      <GripVertical size={14} />
                    </div>
                    <input
                      type="text"
                      value={cls.name}
                      onChange={(e) =>
                        handleUpdateClass(cls.id, e.target.value)
                      }
                      className="flex-1 text-sm font-semibold text-slate-700 px-2 py-1 border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg transition-all focus:outline-none bg-slate-50/60"
                    />
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/50 mt-auto">
                <button
                  onClick={() => handleAddClass(category)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-dashed border-emerald-200"
                >
                  <Plus size={14} /> Add Class
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}