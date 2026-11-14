// Creates the MySQL database + `leads` table using the settings in .env.local.
// Run:  npm run db:setup
import mysql from "mysql2/promise";

const host = process.env.MYSQL_HOST || "127.0.0.1";
const port = Number(process.env.MYSQL_PORT || 3306);
const user = process.env.MYSQL_USER || "root";
const password = process.env.MYSQL_PASSWORD || "";
const database = process.env.MYSQL_DATABASE || "nivie_db";

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  console.error(`✖ MYSQL_DATABASE "${database}" may only contain letters, numbers and _`);
  process.exit(1);
}

if (!password) {
  console.warn("⚠ MYSQL_PASSWORD is empty in .env.local — add your MySQL Workbench root password after the = sign.");
}

console.log(`Connecting to MySQL at ${host}:${port} as "${user}"…`);

let conn;
try {
  conn = await mysql.createConnection({ host, port, user, password, connectTimeout: 5000 });
} catch (err) {
  console.error(`✖ Could not connect: ${err.code || ""} ${err.message}`);
  if (err.code === "ECONNREFUSED") console.error("  → MySQL is not running on that port. Start the MySQL80 service, or fix MYSQL_PORT.");
  if (err.code === "ER_ACCESS_DENIED_ERROR") console.error("  → Wrong MYSQL_USER / MYSQL_PASSWORD in .env.local.");
  process.exit(1);
}

await conn.query(
  `CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
);
await conn.query(`USE \`${database}\``);
await conn.query(`
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);
const [[{ count }]] = await conn.query("SELECT COUNT(*) AS count FROM leads");
await conn.end();

console.log(`✔ Database "${database}" and table "leads" are ready (${count} enquiries saved so far).`);
console.log(`  In MySQL Workbench: connect to ${host}:${port}, then press the refresh icon next to SCHEMAS.`);
