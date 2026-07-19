/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// PostgreSQL (Neon) connection + Users table helper.
// Only the "users" data is migrated to Postgres here - tests, results,
// placement drives, and training resources still use the existing
// src/db/db.json file via readDb()/writeDb() in server.ts.

import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

/**
 * Lazily creates a connection pool using DATABASE_URL from your .env file.
 * The pool is cached and reused across requests.
 */
export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not defined. Add it to your .env file, e.g.\n' +
      'DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require'
    );
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // required for Neon's pooled connection
  });

  return pool;
}

/**
 * Creates the users table if it doesn't already exist. Safe to call on
 * every server startup - CREATE TABLE IF NOT EXISTS is a no-op otherwise.
 */
export async function initUsersTable() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      approved BOOLEAN DEFAULT true,
      branch_type TEXT DEFAULT '',
      department TEXT DEFAULT ''
    );
  `);
}

/**
 * One-time seed: if the users table is empty (fresh database), populate
 * it with the same default admin/student accounts the JSON seed data
 * used to provide, so login still works out of the box.
 */
export async function seedUsersIfEmpty(seedUsers: any[]) {
  const db = getPool();
  const { rows } = await db.query('SELECT COUNT(*) FROM users');
  const count = parseInt(rows[0].count, 10);

  if (count === 0 && seedUsers.length > 0) {
    for (const u of seedUsers) {
      await db.query(
        `INSERT INTO users (id, username, password, role, name, email, approved, branch_type, department)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.username, u.password, u.role, u.name, u.email,
         u.approved ?? true, u.branchType || '', u.department || '']
      );
    }
    console.log(`Seeded ${seedUsers.length} initial user(s) into PostgreSQL.`);
  }
}

/** Converts a snake_case Postgres row into the app's camelCase User shape. */
export function rowToUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role,
    name: row.name,
    email: row.email,
    approved: row.approved,
    branchType: row.branch_type,
    department: row.department,
  };
}
