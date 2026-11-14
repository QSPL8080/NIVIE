/*
  DATABASE CHANGES — the only place the database structure is defined.

  How it works
  - Every change is a "migration" with a unique id. Applied ids are recorded in
    the `schema_migrations` table, so each migration runs ONCE per database.
  - Migrations run automatically:
      • when the site is built/deployed (npm run build — Hostinger does this on every push)
      • when the site talks to the database for the first time after starting
      • when you run `npm run db:migrate` yourself
    → No SQL ever needs to be typed into phpMyAdmin.
  - Your local database and the Hostinger database each keep their own record,
    so both end up with exactly the same structure.

  To change the database later
  - NEVER edit or delete a migration that has already been pushed.
  - ADD a new one at the bottom with the next number, e.g.
      {
        id: "002_add_email_to_leads",
        up: ["ALTER TABLE leads ADD COLUMN email VARCHAR(255) NULL AFTER phone"],
      },
  - Push to GitHub. Hostinger rebuilds and the column is added automatically.
*/

export const migrations = [
  {
    id: "001_create_leads",
    up: [
      `CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        budget VARCHAR(100) DEFAULT NULL,
        location VARCHAR(255) DEFAULT NULL,
        type VARCHAR(100) DEFAULT NULL,
        timeline VARCHAR(100) DEFAULT NULL,
        source VARCHAR(100) DEFAULT 'Website',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ],
  },
  {
    // Pipeline status for each lead (changed from the admin panel)
    id: "002_lead_status",
    up: [
      `ALTER TABLE leads
         ADD COLUMN status VARCHAR(60) NOT NULL DEFAULT 'New Lead' AFTER source,
         ADD COLUMN status_updated_at TIMESTAMP NULL DEFAULT NULL AFTER status`,
    ],
  },
  {
    // Admin notes on a lead (several per lead, newest first). Deleting a lead deletes its notes.
    id: "003_lead_notes",
    up: [
      `CREATE TABLE IF NOT EXISTS lead_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_lead_notes_lead (lead_id),
        CONSTRAINT fk_lead_notes_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ],
  },
  {
    // Every status change, with date/time and who changed it. Deleting a lead deletes its history.
    id: "004_lead_status_history",
    up: [
      `CREATE TABLE IF NOT EXISTS lead_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        from_status VARCHAR(60) NULL,
        to_status VARCHAR(60) NOT NULL,
        changed_by VARCHAR(190) NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status_history_lead (lead_id, changed_at),
        CONSTRAINT fk_status_history_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ],
  },
  // ↓ add new migrations here ↓
];

/**
 * Applies every migration that hasn't run yet on this database.
 * `conn` must be ONE mysql2/promise connection (not a pool — the lock belongs to a connection),
 * already pointed at the database.
 * Returns the ids that were applied now.
 */
export async function runMigrations(conn, log = console.log) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(191) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Only one process may migrate at a time (build + app start can overlap).
  const [[lock]] = await conn.query("SELECT GET_LOCK('nivie_migrations', 30) AS ok");
  if (!lock || lock.ok !== 1) throw new Error("Could not get the migration lock (another migration is running).");

  const applied = [];
  try {
    const [rows] = await conn.query("SELECT id FROM schema_migrations");
    const done = new Set(rows.map((r) => r.id));
    for (const m of migrations) {
      if (done.has(m.id)) continue;
      for (const sql of m.up) await conn.query(sql);
      await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", [m.id]);
      applied.push(m.id);
      log(`[db] migration applied: ${m.id}`);
    }
  } finally {
    await conn.query("SELECT RELEASE_LOCK('nivie_migrations')");
  }
  return applied;
}
