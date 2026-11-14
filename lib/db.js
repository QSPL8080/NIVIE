import mysql from "mysql2/promise";
import { runMigrations } from "./migrations.mjs";

let pool = null;
let currentConfig = null;
let initialized = false;

function getConfig() {
  const database = process.env.MYSQL_DATABASE || "nivie_db";
  // The name is put straight into CREATE DATABASE, so only allow safe characters.
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error(`MYSQL_DATABASE "${database}" may only contain letters, numbers and _`);
  }
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database,
  };
}

export function getPool() {
  const cfg = getConfig();
  const configKey = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.password}:${cfg.database}`;

  if (!pool || currentConfig !== configKey) {
    if (pool) {
      try {
        pool.end();
      } catch {}
    }
    pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      charset: "utf8mb4",
    });
    currentConfig = configKey;
    initialized = false;
  }
  return pool;
}

let initPromise = null;

async function createDatabaseIfMissing(cfg) {
  // Only used locally (e.g. root on your PC). On Hostinger the database is created in hPanel.
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    connectTimeout: 5000,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conn.end();
  }
}

// Connects and brings the database structure up to date (see lib/migrations.mjs).
// Runs once per server start; later calls return immediately.
export function initDb() {
  if (initialized) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      const cfg = getConfig();
      let conn;
      try {
        conn = await getPool().getConnection();
      } catch (err) {
        if (err.code !== "ER_BAD_DB_ERROR") throw err;
        await createDatabaseIfMissing(cfg);
        conn = await getPool().getConnection();
      }
      try {
        await runMigrations(conn);
      } finally {
        conn.release();
      }
      initialized = true;
      console.log(`[db] MySQL ready: database "${cfg.database}" on ${cfg.host}:${cfg.port}`);
    })().finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

export async function query(sql, params = []) {
  await initDb();
  const [rows] = await getPool().query(sql, params);
  return rows;
}

export async function saveLead({ name, phone, budget, location, type, timeline, source }) {
  await initDb();
  const [result] = await getPool().query(
    `INSERT INTO leads (name, phone, budget, location, type, timeline, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name?.trim() || "",
      phone?.trim() || "",
      budget || null,
      location || null,
      type || null,
      timeline || null,
      source || "Website",
    ]
  );
  return result.insertId;
}

export async function getLeads() {
  await initDb();
  const [rows] = await getPool().query(
    `SELECT l.id, l.name, l.phone, l.budget, l.location, l.type, l.timeline, l.source,
            l.status, l.status_updated_at, l.created_at,
            (SELECT COUNT(*) FROM lead_notes n WHERE n.lead_id = l.id) AS notes_count,
            (SELECT n.note FROM lead_notes n WHERE n.lead_id = l.id ORDER BY n.created_at DESC, n.id DESC LIMIT 1) AS last_note
     FROM leads l
     ORDER BY l.created_at DESC, l.id DESC`
  );
  return rows;
}

// Changes the status and records the change (old → new, when, by whom) in lead_status_history.
// Returns { found, changed, changedAt }.
export async function updateLeadStatus(id, status, changedBy = null) {
  id = Number(id);
  if (!Number.isInteger(id) || id <= 0) return { found: false };
  await initDb();
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [[lead]] = await conn.query(`SELECT status FROM leads WHERE id = ? FOR UPDATE`, [id]);
    if (!lead) {
      await conn.rollback();
      return { found: false };
    }
    if (lead.status === status) {
      await conn.rollback();
      return { found: true, changed: false };
    }
    await conn.query(`UPDATE leads SET status = ?, status_updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id]);
    await conn.query(
      `INSERT INTO lead_status_history (lead_id, from_status, to_status, changed_by) VALUES (?, ?, ?, ?)`,
      [id, lead.status, status, changedBy]
    );
    const [[row]] = await conn.query(`SELECT status_updated_at FROM leads WHERE id = ?`, [id]);
    await conn.commit();
    return { found: true, changed: true, changedAt: row.status_updated_at };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

export async function getStatusHistory(leadId) {
  leadId = Number(leadId);
  if (!Number.isInteger(leadId) || leadId <= 0) return [];
  await initDb();
  const [rows] = await getPool().query(
    `SELECT id, from_status, to_status, changed_by, changed_at
     FROM lead_status_history WHERE lead_id = ? ORDER BY changed_at DESC, id DESC`,
    [leadId]
  );
  return rows;
}

export async function getNotes(leadId) {
  leadId = Number(leadId);
  if (!Number.isInteger(leadId) || leadId <= 0) return [];
  await initDb();
  const [rows] = await getPool().query(
    `SELECT id, lead_id, note, created_at FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC, id DESC`,
    [leadId]
  );
  return rows;
}

// Returns the new note, or null if the lead doesn't exist (any more).
export async function addNote(leadId, note) {
  leadId = Number(leadId);
  if (!Number.isInteger(leadId) || leadId <= 0) return null;
  await initDb();
  const [[lead]] = await getPool().query(`SELECT id FROM leads WHERE id = ?`, [leadId]);
  if (!lead) return null;
  const [result] = await getPool().query(`INSERT INTO lead_notes (lead_id, note) VALUES (?, ?)`, [leadId, note]);
  const [[row]] = await getPool().query(
    `SELECT id, lead_id, note, created_at FROM lead_notes WHERE id = ?`,
    [result.insertId]
  );
  return row;
}

export async function deleteNote(id) {
  id = Number(id);
  if (!Number.isInteger(id) || id <= 0) return false;
  await initDb();
  const [result] = await getPool().query(`DELETE FROM lead_notes WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

export async function deleteLead(id) {
  id = Number(id);
  if (!Number.isInteger(id) || id <= 0) return false;
  await initDb();
  const [result] = await getPool().query(`DELETE FROM leads WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}
