import mysql from "mysql2/promise";

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
      charset: "utf8mb4",
    });
    currentConfig = configKey;
    initialized = false;
  }
  return pool;
}

export async function initDb() {
  if (initialized) return;
  const cfg = getConfig();

  try {
    const tempConn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      connectTimeout: 3000,
    });
    await tempConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await tempConn.end();
  } catch (err) {
    // Usually wrong password / MySQL not running. The next query will throw the real error.
    console.warn("[db] Could not create database:", err.code || "", err.message);
  }

  // Ensure the single `leads` table exists
  const currentPool = getPool();
  await currentPool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      budget VARCHAR(100) DEFAULT NULL,
      location VARCHAR(255) DEFAULT NULL,
      type VARCHAR(100) DEFAULT NULL,
      timeline VARCHAR(100) DEFAULT NULL,
      source VARCHAR(100) DEFAULT 'Website',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  initialized = true;
  console.log(`[db] MySQL ready: database "${cfg.database}" on ${cfg.host}:${cfg.port}, table "leads"`);
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
    `SELECT id, name, phone, budget, location, type, timeline, source, created_at
     FROM leads
     ORDER BY created_at DESC, id DESC`
  );
  return rows;
}

export async function deleteLead(id) {
  id = Number(id);
  if (!Number.isInteger(id) || id <= 0) return false;
  await initDb();
  const [result] = await getPool().query(`DELETE FROM leads WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}
