/**
 * syncService.js
 * =============================================================================
 * Local-First School Payment Tracker — Data & Sync Layer
 *
 * Architecture overview:
 * - Single source of truth: IndexedDB (works fully offline)
 * - Supabase acts as a sync broker (cloud mirror), NOT the primary database
 * - Conflict resolution: "last writer wins" by comparing `last_updated` ISO
 * timestamps at the record level
 * - Each student and payment record carries a stable UUID (`id`) so remote
 * and local records can always be matched without duplication
 *
 * IndexedDB schema
 * ─────────────────
 * DB name : "school_payment_tracker"
 * Version : 1
 *
 * Object store: "students"
 * keyPath   : "id"  (UUID string)
 * indexes   : class_key, status, last_updated
 *
 * Object store: "payment_history"
 * keyPath   : "id"  (UUID string)
 * indexes   : student_id, archived_at
 *
 * Supabase tables (mirror the same shape):
 * - public.students          (same columns as IndexedDB store)
 * - public.payment_history   (same columns as IndexedDB store)
 *
 * =============================================================================
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// 1.  Supabase client initialisation
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_SUPABASE_URL ?? "https://lwwuwghfwsrmoeozryap.supabase.co"
    : process.env?.REACT_APP_SUPABASE_URL ?? "https://lwwuwghfwsrmoeozryap.supabase.co";

const SUPABASE_ANON_KEY =
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_7rWSy_wnnj_yx12l2MHS5w__UoF7bb-"
    : process.env?.REACT_APP_SUPABASE_ANON_KEY ?? "sb_publishable_7rWSy_wnnj_yx12l2MHS5w__UoF7bb-";

/** @type {import('@supabase/supabase-js').SupabaseClient} */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }, // headless / service-layer usage
});

// ---------------------------------------------------------------------------
// 2.  IndexedDB bootstrap
// ---------------------------------------------------------------------------

const DB_NAME = "school_payment_tracker";
const DB_VERSION = 1;
const STORE_STUDENTS = "students";
const STORE_HISTORY = "payment_history";

/**
 * Opens (and if needed upgrades) the IndexedDB database.
 * Returns a promise that resolves with the IDBDatabase instance.
 *
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // ── students store ──────────────────────────────────────────────────
      if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
        const studentStore = db.createObjectStore(STORE_STUDENTS, {
          keyPath: "id",
        });
        studentStore.createIndex("class_key", "class_key", { unique: false });
        studentStore.createIndex("status", "status", { unique: false });
        studentStore.createIndex("last_updated", "last_updated", {
          unique: false,
        });
      }

      // ── payment_history store ───────────────────────────────────────────
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const historyStore = db.createObjectStore(STORE_HISTORY, {
          keyPath: "id",
        });
        historyStore.createIndex("student_id", "student_id", { unique: false });
        historyStore.createIndex("archived_at", "archived_at", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// 3.  Low-level IndexedDB helpers
// ---------------------------------------------------------------------------

/**
 * Reads every record from the given object store.
 *
 * @param {string} storeName
 * @returns {Promise<Object[]>}
 */
async function getAllRecords(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Reads a single record by primary key.
 *
 * @param {string} storeName
 * @param {string} id  UUID
 * @returns {Promise<Object|undefined>}
 */
async function getRecord(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Upserts a record (put = insert-or-replace by keyPath).
 * Always stamps `last_updated` before writing.
 *
 * @param {string} storeName
 * @param {Object} record   Must include an `id` UUID field.
 * @returns {Promise<string>}  Resolves with the record id.
 */
async function putRecord(storeName, record) {
  const db = await openDB();
  const stamped = { ...record, last_updated: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).put(stamped);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------------------------------------------------------------------------
// 4.  Public student CRUD — always write locally first
// ---------------------------------------------------------------------------

/**
 * Generates a RFC-4122 v4 UUID without external dependencies.
 *
 * @returns {string}
 */
export function generateUUID() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns all non-deleted students, optionally filtered by class.
 *
 * @param {string|null} classKey  Pass null to return all classes.
 * @returns {Promise<Object[]>}
 */
export async function getStudents(classKey = null) {
  const all = await getAllRecords(STORE_STUDENTS);
  return all.filter(
    (s) => !s.deleted && (classKey === null || s.class_key === classKey)
  );
}

/**
 * Adds a new student to the local database.
 *
 * @param {Omit<Object, 'id'|'last_updated'>} studentData
 * @returns {Promise<Object>}  The saved student (with id + last_updated).
 */
export async function addStudent(studentData) {
  const student = {
    status: "Unpaid",
    deleted: false,
    ...studentData,
    id: generateUUID(),
    last_updated: new Date().toISOString(),
  };
  await putRecord(STORE_STUDENTS, student);
  return student;
}

/**
 * Updates fields on an existing student.
 *
 * @param {string} id
 * @param {Partial<Object>} changes
 * @returns {Promise<Object>}  The updated student record.
 */
export async function updateStudent(id, changes) {
  const existing = await getRecord(STORE_STUDENTS, id);
  if (!existing) throw new Error(`Student ${id} not found in local DB`);
  const updated = { ...existing, ...changes };
  await putRecord(STORE_STUDENTS, updated);
  return updated;
}

/**
 * Soft-deletes a student (sets deleted=true so the tombstone syncs to cloud).
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteStudent(id) {
  await updateStudent(id, { deleted: true });
}

/**
 * PERMANENTLY deletes a student record from the IndexedDB.
 * WARNING: This will NOT sync a deletion tombstone to the cloud.
 */
export async function hardDeleteStudent(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_STUDENTS, "readwrite");
    const req = tx.objectStore(STORE_STUDENTS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
// ---------------------------------------------------------------------------
// 5.  Payment history CRUD
// ---------------------------------------------------------------------------

/**
 * Returns all non-deleted archived payment history records, newest first.
 *
 * @param {string|null} studentId  Filter by student, or null for all.
 * @returns {Promise<Object[]>}
 */
export async function getPaymentHistory(studentId = null) {
  const all = await getAllRecords(STORE_HISTORY);
  const filtered = all.filter(
    (h) => !h.deleted && (studentId === null || h.student_id === studentId)
  );
  return filtered.sort((a, b) => b.archived_at.localeCompare(a.archived_at));
}

/**
 * Archives one completed payment cycle.
 *
 * @param {Object} historyData
 * @returns {Promise<Object>}
 */
export async function archivePayment(historyData) {
  const record = {
    deleted: false,
    ...historyData,
    id: generateUUID(),
    archived_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };
  await putRecord(STORE_HISTORY, record);
  return record;
}

/**
 * Soft-deletes a single payment history record from the local IndexedDB database 
 * so that the deletion tombstone safely synchronises across cloud sync checks.
 *
 * @param {string} id  The UUID of the history record
 * @returns {Promise<void>}
 */
export async function deletePaymentHistoryRow(id) {
  const existing = await getRecord(STORE_HISTORY, id);
  if (!existing) return;

  const updated = {
    ...existing,
    deleted: true,
    last_updated: new Date().toISOString(),
  };
  await putRecord(STORE_HISTORY, updated);
}

/**
 * Soft-deletes every single payment history record from the local database
 * so that the global wipe safely cascades to the cloud broker mirror.
 *
 * @returns {Promise<void>}
 */
export async function clearAllPaymentHistory() {
  const db = await openDB();
  const allRecords = await getAllRecords(STORE_HISTORY);
  
  if (allRecords.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, "readwrite");
    const store = tx.objectStore(STORE_HISTORY);
    
    for (const record of allRecords) {
      const updated = {
        ...record,
        deleted: true,
        last_updated: new Date().toISOString()
      };
      store.put(updated);
    }
    
    tx.oncomplete = () => {
      console.log(`[syncService] Locally soft-deleted ${allRecords.length} history records.`);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("Transaction aborted"));
  });
}

// ---------------------------------------------------------------------------
// 6.  Cloud sync — Supabase
// ---------------------------------------------------------------------------

function resolveConflict(local, remote) {
  if (!local) return { winner: remote, loser: null, source: "remote" };
  if (!remote) return { winner: local, loser: null, source: "local" };

  const localTs = new Date(local.last_updated).getTime();
  const remoteTs = new Date(remote.last_updated).getTime();

  if (localTs >= remoteTs) {
    return { winner: local, loser: remote, source: "local" };
  }
  return { winner: remote, loser: local, source: "remote" };
}

async function syncStore(storeName, tableName) {
  let pushed = 0;
  let pulled = 0;
  let conflicts = 0;

  const { data: remoteRecords, error: fetchError } = await supabase
    .from(tableName)
    .select("*");

  if (fetchError) {
    console.error(`[syncService] Failed to fetch ${tableName}:`, fetchError);
    throw fetchError;
  }

  const remoteMap = Object.fromEntries(
    (remoteRecords ?? []).map((r) => [r.id, r])
  );

  const localRecords = await getAllRecords(storeName);
  const localMap = Object.fromEntries(localRecords.map((r) => [r.id, r]));

  const allIds = new Set([...Object.keys(localMap), ...Object.keys(remoteMap)]);

  for (const id of allIds) {
    const local = localMap[id];
    const remote = remoteMap[id];
    const { winner, source } = resolveConflict(local, remote);

    if (source === "local" || source === "equal") {
      const { error: upsertError } = await supabase
        .from(tableName)
        .upsert(winner, { onConflict: "id" });

      if (upsertError) {
        console.warn(`[syncService] Upsert failed for ${id}:`, upsertError);
      } else {
        pushed++;
      }
    } else {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const req = tx.objectStore(storeName).put(winner);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      pulled++;
    }

    if (local && remote) conflicts++;
  }

  return { pushed, pulled, conflicts };
}

export async function syncWithCloud() {
  console.log("[syncService] Starting full sync …");

  const [students, history] = await Promise.all([
    syncStore(STORE_STUDENTS, "students"),
    syncStore(STORE_HISTORY, "payment_history"),
  ]);

  const result = { success: true, students, history, timestamp: new Date().toISOString() };
  console.log("[syncService] Sync complete:", result);

  localStorage.setItem("last_sync_at", result.timestamp);

  return result;
}

export function getLastSyncTimestamp() {
  return localStorage.getItem("last_sync_at");
}

// ---------------------------------------------------------------------------
// 7.  JSON backup / restore
// ---------------------------------------------------------------------------

export async function exportToJSON(filename) {
  const [students, history] = await Promise.all([
    getAllRecords(STORE_STUDENTS),
    getAllRecords(STORE_HISTORY),
  ]);

  const payload = {
    export_version: 1,
    exported_at: new Date().toISOString(),
    students,
    payment_history: history,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const defaultName = `school_payments_${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? defaultName;
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function importFromJSON(file) {
  if (!file) throw new Error("No file provided to importFromJSON");

  const text = await file.text();
  let payload;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file — could not parse.");
  }

  if (!Array.isArray(payload.students) || !Array.isArray(payload.payment_history)) {
    throw new Error(
      "JSON file does not match expected schema (missing `students` or `payment_history` arrays)."
    );
  }

  let studentCount = 0;
  let historyCount = 0;

  for (const incoming of payload.students) {
    if (!incoming.id) continue;

    const existing = await getRecord(STORE_STUDENTS, incoming.id);
    const { winner } = resolveConflict(existing, incoming);

    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STUDENTS, "readwrite");
      const req = tx.objectStore(STORE_STUDENTS).put(winner);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    studentCount++;
  }

  for (const incoming of payload.payment_history) {
    if (!incoming.id) continue;

    const existing = await getRecord(STORE_HISTORY, incoming.id);
    const { winner } = resolveConflict(existing, incoming);

    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_HISTORY, "readwrite");
      const req = tx.objectStore(STORE_HISTORY).put(winner);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    historyCount++;
  }

  return { students: studentCount, history: historyCount };
}

// ---------------------------------------------------------------------------
// 8.  Convenience re-exports for components
// ---------------------------------------------------------------------------

export default {
  openDB,
  generateUUID,
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  getPaymentHistory,
  archivePayment,
  deletePaymentHistoryRow,
  clearAllPaymentHistory,
  syncWithCloud,
  getLastSyncTimestamp,
  exportToJSON,
  importFromJSON,
  supabase,
};