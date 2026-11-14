// Brings the MySQL database up to date (creates/changes tables from lib/migrations.mjs).
//
//   npm run db:migrate      → run it yourself (local)
//   npm run build           → runs it automatically first (Hostinger runs this on every push)
//
// Settings are read exactly like Next.js reads them:
//   • on your PC: .env.local   (your local MySQL)
//   • on Hostinger: the Environment variables in hPanel (Hostinger MySQL)
//
// During a build it never stops the deploy: if the database can't be reached, it prints a
// warning and the website applies the same migrations itself on its first database request.
import nextEnv from "@next/env";
import mysql from "mysql2/promise";
import { runMigrations } from "../lib/migrations.mjs";

const duringBuild = process.argv.includes("--build");
nextEnv.loadEnvConfig(process.cwd(), !duringBuild);

const host = process.env.MYSQL_HOST || "127.0.0.1";
const port = Number(process.env.MYSQL_PORT || 3306);
const user = process.env.MYSQL_USER || "root";
const password = process.env.MYSQL_PASSWORD || "";
const database = process.env.MYSQL_DATABASE || "nivie_db";

function stop(message, hint) {
  if (duringBuild) {
    console.warn(`⚠ [db:migrate] Skipped: ${message}`);
    console.warn("  The site will update the database itself on its first database request.");
    process.exit(0);
  }
  console.error(`✖ ${message}`);
  if (hint) console.error(`  → ${hint}`);
  process.exit(1);
}

if (!process.env.MYSQL_HOST && !process.env.MYSQL_USER && duringBuild) {
  stop("no MySQL settings found (MYSQL_HOST / MYSQL_USER are not set).");
}
if (!/^[A-Za-z0-9_]+$/.test(database)) stop(`MYSQL_DATABASE "${database}" may only contain letters, numbers and _`);
if (!password) console.warn("⚠ MYSQL_PASSWORD is empty — add it to .env.local (local) or hPanel (Hostinger).");

console.log(`[db:migrate] ${host}:${port} → database "${database}" as "${user}"`);

let conn;
try {
  conn = await mysql.createConnection({ host, port, user, password, database, connectTimeout: 8000 });
} catch (err) {
  if (err.code === "ER_BAD_DB_ERROR") {
    // Local only: create the database, then connect to it.
    try {
      const admin = await mysql.createConnection({ host, port, user, password, connectTimeout: 8000 });
      await admin.query(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await admin.end();
      conn = await mysql.createConnection({ host, port, user, password, database, connectTimeout: 8000 });
      console.log(`[db:migrate] created database "${database}"`);
    } catch (e) {
      stop(`database "${database}" does not exist and could not be created (${e.code || e.message}).`,
        "On Hostinger, create it in hPanel → Databases → MySQL Databases and copy the exact name.");
    }
  } else {
    const hints = {
      ECONNREFUSED: "MySQL is not running on that host/port, or MYSQL_PORT is wrong.",
      ER_ACCESS_DENIED_ERROR: "Wrong MYSQL_USER / MYSQL_PASSWORD.",
      ER_DBACCESS_DENIED_ERROR: "MYSQL_DATABASE name is wrong, or this user isn't assigned to that database.",
      ENOTFOUND: "MYSQL_HOST is wrong.",
      ETIMEDOUT: "MySQL host can't be reached from here.",
    };
    stop(`could not connect: ${err.code || ""} ${err.message}`, hints[err.code]);
  }
}

try {
  const applied = await runMigrations(conn);
  const [[{ count }]] = await conn.query("SELECT COUNT(*) AS count FROM leads");
  console.log(
    applied.length
      ? `✔ Database updated (${applied.join(", ")}). ${count} enquiries saved.`
      : `✔ Database already up to date. ${count} enquiries saved.`
  );
} catch (err) {
  // A broken migration must NOT go live — fail the build/deploy so the old site keeps running.
  console.error(`✖ Migration failed: ${err.code || ""} ${err.message}`);
  console.error("  Fix the migration in lib/migrations.mjs and push again.");
  await conn?.end().catch(() => {});
  process.exit(1);
} finally {
  await conn?.end().catch(() => {});
}
