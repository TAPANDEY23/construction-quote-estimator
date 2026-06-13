/**
 * db-view.mjs — read-only database viewer
 * Run: node db-view.mjs
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const line = '─'.repeat(80);

// ── Users ─────────────────────────────────────────────────────────────────────
const users = await db.execute(
  'SELECT id, first_name, last_name, email, company, phone, created_at FROM users ORDER BY id DESC'
);

console.log('\n' + line);
console.log(`  USERS  (${users.rows.length} record${users.rows.length !== 1 ? 's' : ''})`);
console.log(line);

if (users.rows.length === 0) {
  console.log('  (no users yet)');
} else {
  users.rows.forEach(r => {
    console.log(`  #${r.id}  ${r.first_name} ${r.last_name}`);
    console.log(`       Email   : ${r.email}`);
    if (r.company) console.log(`       Company : ${r.company}`);
    if (r.phone)   console.log(`       Phone   : ${r.phone}`);
    console.log(`       Created : ${r.created_at}`);
    console.log();
  });
}

// ── Estimates ─────────────────────────────────────────────────────────────────
const estimates = await db.execute(
  'SELECT e.id, e.user_id, u.first_name, u.last_name, e.created_at, e.estimate_result FROM estimates e LEFT JOIN users u ON u.id = e.user_id ORDER BY e.id DESC'
);

console.log(line);
console.log(`  ESTIMATES  (${estimates.rows.length} record${estimates.rows.length !== 1 ? 's' : ''})`);
console.log(line);

if (estimates.rows.length === 0) {
  console.log('  (no estimates yet)');
} else {
  estimates.rows.forEach(r => {
    const est = JSON.parse(r.estimate_result || '{}');
    const total = est.totalRange;
    console.log(`  #${r.id}  by ${r.first_name ?? '?'} ${r.last_name ?? '?'} (user #${r.user_id ?? 'guest'})`);
    if (total) {
      console.log(`       Total range : $${total.low?.toLocaleString()} – $${total.mid?.toLocaleString()} – $${total.high?.toLocaleString()} AUD`);
    }
    console.log(`       Created     : ${r.created_at}`);
    console.log();
  });
}

console.log(line + '\n');
process.exit(0);
