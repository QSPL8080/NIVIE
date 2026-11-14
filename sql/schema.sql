-- Nivie Designs — enquiry storage
-- Same as `npm run db:setup`. You can also open this in MySQL Workbench and run it (⚡).

CREATE DATABASE IF NOT EXISTS nivie_db
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nivie_db;

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

-- See saved enquiries, newest first:
-- SELECT * FROM nivie_db.leads ORDER BY created_at DESC;
