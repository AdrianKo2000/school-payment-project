/**
 * syncService.js
 * Local-First School Payment Tracker — Data & Sync Layer
 */

import { createClient } from "@supabase/supabase-js";

// 1. Supabase Initialization (Environment Safe)
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "https://lwwuwghfwsrmoeozryap.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "sb_publishable_7rWSy_wnnj_yx12l2MHS5w__UoF7bb-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// 2. IndexedDB Configuration
const DB_NAME = "school_payment_tracker";
const DB_VERSION = 1;
const STORE_STUDENTS = "students";
const STORE_HISTORY = "payment_history";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
        const studentStore = db.createObjectStore(STORE_STUDENTS, { keyPath: "id" });
        studentStore.createIndex("class_key", "class_key", { unique: false });
        studentStore.createIndex("status", "status", { unique: false });
        studentStore.createIndex("last_updated", "last_updated", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const historyStore = db.createObjectStore(STORE_HISTORY, { keyPath: "id" });
        historyStore.createIndex("student_id", "student_id", { unique: false });
        historyStore.createIndex("archived_at", "archived_at", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 3. Database Helpers
async function getAllRecords(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getRecord(storeName, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

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

export function generateUUID() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 4. Student CRUD
export async function getStudents(classKey = null) {
  const all = await getAllRecords(STORE_STUDENTS);
  return all.filter((s) => !s.deleted && (classKey === null || s.class_key === classKey));
}

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

export async function updateStudent(id, changes) {
  const existing = await getRecord(STORE_STUDENTS, id);
  if (!existing) throw new Error(`Student ${id} not found locally.`);
  const updated = { ...existing, ...changes };
  await putRecord(STORE_STUDENTS, updated);
  return updated;
}

export async function deleteStudent(id) {
  await updateStudent(id, { deleted: true });
}

// 5. Payment History CRUD
export async function getPaymentHistory(studentId = null) {
  const all = await getAllRecords(STORE_HISTORY);
  const filtered = all.filter((h) => !h.deleted && (studentId === null || h.student_id === studentId));
  return filtered.sort((a, b) => b.archived_at.localeCompare(a.archived_at));
}

export async function archivePayment(historyData) {
  const record = {
    deleted: false,
    ...historyData,
    student_id: historyData.id, 
    student_name: historyData.name, // The exact fix for Supabase constraint
    id: generateUUID(),
    archived_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };

  delete record.is_copy; // Prevent schema clashes
  await putRecord(STORE_HISTORY, record);
  return record;
}

export async function deletePaymentHistoryRow(id) {
  const existing = await getRecord(STORE_HISTORY, id);
  if (!existing) return;
  const updated = { ...existing, deleted: true, last_updated: new Date().toISOString() };
  await putRecord(STORE_HISTORY, updated);
}

export async function clearAllPaymentHistory() {
  const db = await openDB();
  const allRecords = await getAllRecords(STORE_HISTORY);
  if (allRecords.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, "readwrite");
    const store = tx.objectStore(STORE_HISTORY);
    for (const record of allRecords) {
      store.put({ ...record, deleted: true, last_updated: new Date().toISOString() });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 6. Cloud Sync Core
function resolveConflict(local, remote) {
  if (!local) return { winner: remote, source: "remote" };
  if (!remote) return { winner: local, source: "local" };
  const localTs = new Date(local.last_updated).getTime();
  const remoteTs = new Date(remote.last_updated).getTime();
  return localTs >= remoteTs ? { winner: local, source: "local" } : { winner: remote, source: "remote" };
}

async function syncStore(storeName, tableName) {
  const { data: remoteRecords, error: fetchError } = await supabase.from(tableName).select("*");
  if (fetchError) throw fetchError;

  const remoteMap = Object.fromEntries((remoteRecords ?? []).map((r) => [r.id, r]));
  const localRecords = await getAllRecords(storeName);
  const localMap = Object.fromEntries(localRecords.map((r) => [r.id, r]));
  const allIds = new Set([...Object.keys(localMap), ...Object.keys(remoteMap)]);

  const batchToPush = [];
  const batchToPull = [];

  for (const id of allIds) {
    const { winner, source } = resolveConflict(localMap[id], remoteMap[id]);
    if (source === "local") batchToPush.push(winner);
    else if (source === "remote") batchToPull.push(winner);
  }

  if (batchToPush.length > 0) {
    const { error: upsertError } = await supabase.from(tableName).upsert(batchToPush, { onConflict: "id" });
    if (upsertError) throw upsertError;
  }

  if (batchToPull.length > 0) {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      for (const record of batchToPull) store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export async function syncWithCloud() {
  const [students, history] = await Promise.all([
    syncStore(STORE_STUDENTS, "students"),
    syncStore(STORE_HISTORY, "payment_history"),
  ]);
  const result = { success: true, timestamp: new Date().toISOString() };
  localStorage.setItem("last_sync_at", result.timestamp);
  return result;
}

// 7. Clean JSON Backup
export async function exportToJSON() {
  const [allStudents, allHistory] = await Promise.all([
    getAllRecords(STORE_STUDENTS),
    getAllRecords(STORE_HISTORY),
  ]);

  const payload = {
    export_version: 1,
    exported_at: new Date().toISOString(),
    students: allStudents.filter(s => !s.deleted),
    payment_history: allHistory.filter(h => !h.deleted),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `school_payments_clean_${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default {
  openDB, generateUUID, getStudents, addStudent, updateStudent, deleteStudent,
  getPaymentHistory, archivePayment, deletePaymentHistoryRow, clearAllPaymentHistory,
  syncWithCloud, exportToJSON, supabase,
};