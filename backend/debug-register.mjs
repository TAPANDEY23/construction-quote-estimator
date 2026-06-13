import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL);
console.log('CWD:', process.cwd());

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Mirror exactly what /api/register does
const firstName = 'Tapan';
const lastName = 'Kumar';
const email = 'tapanpandey@gmail.com';
const company = undefined;
const phone = '0452126324';

const fn = firstName.trim();
const ln = lastName.trim();
const em = email.trim().toLowerCase();
const co = company?.trim() || null;
const ph = phone?.trim() || null;

console.log('\nStep 1: lookup by email...');
const lookup = await db.execute({
  sql:  'SELECT id FROM users WHERE LOWER(email) = ?',
  args: [em],
});
console.log('lookup.rows:', JSON.stringify(lookup.rows));
const existing = lookup.rows[0];
console.log('existing:', existing);

if (existing) {
  console.log('\nStep 2: UPDATE existing user id=', existing.id);
  await db.execute({
    sql:  'UPDATE users SET first_name=?, last_name=?, company=?, phone=? WHERE id=?',
    args: [fn, ln, co, ph, existing.id],
  });
  console.log('UPDATE OK → userId:', Number(existing.id));
} else {
  console.log('\nStep 2: INSERT new user...');
  const result = await db.execute({
    sql:  'INSERT INTO users (first_name, last_name, email, company, phone) VALUES (?, ?, ?, ?, ?)',
    args: [fn, ln, em, co, ph],
  });
  console.log('INSERT OK → new userId:', Number(result.lastInsertRowid));
}

process.exit(0);
