import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables:', JSON.stringify(tables.rows));

  const result = await db.execute({
    sql: 'INSERT INTO users (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)',
    args: ['Tapan', 'Kumar', 'tapanpandey@gmail.com', '0452126324'],
  });
  console.log('Insert OK — new userId:', Number(result.lastInsertRowid));

  const users = await db.execute('SELECT id, first_name, last_name, email, phone, created_at FROM users');
  console.log('\nAll users in DB:');
  users.rows.forEach(r => console.log(' ', JSON.stringify(r)));
} catch (err) {
  console.error('ERROR:', err.message);
  console.error(err);
}
process.exit(0);
