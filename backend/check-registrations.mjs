import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const db = new Database('data/cqe.db');

// ── Registered Users ─────────────────────────────────────────────────────────
const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
console.log('\n╔══════════════════════════════════════════════╗');
console.log('║           REGISTERED USERS                   ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`Total registrations: ${users.length}\n`);

if (users.length === 0) {
  console.log('  No registrations yet. Users are saved when they complete');
  console.log('  the registration form before using the estimator.');
} else {
  users.forEach((u, i) => {
    console.log(`  ┌─ User ${i + 1} ${'─'.repeat(38)}`);
    console.log(`  │  ID      : ${u.id}`);
    console.log(`  │  Name    : ${u.first_name} ${u.last_name}`);
    console.log(`  │  Email   : ${u.email}`);
    console.log(`  │  Company : ${u.company || '—'}`);
    console.log(`  │  Phone   : ${u.phone || '—'}`);
    console.log(`  │  Joined  : ${u.created_at}`);
    console.log(`  └${'─'.repeat(44)}`);
  });
}

// ── Saved Estimates ───────────────────────────────────────────────────────────
const estimates = db.prepare(`
  SELECT e.id, e.user_id, e.created_at,
         u.first_name || ' ' || u.last_name AS user_name,
         u.email
  FROM   estimates e
  LEFT JOIN users u ON e.user_id = u.id
  ORDER  BY e.created_at DESC
`).all();

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║           SAVED ESTIMATES                    ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`Total estimates: ${estimates.length}\n`);

if (estimates.length === 0) {
  console.log('  No estimates saved yet.');
} else {
  estimates.forEach((e, i) => {
    let fd = {};
    try { fd = JSON.parse(db.prepare('SELECT form_data FROM estimates WHERE id=?').get(e.id).form_data); } catch(_) {}
    console.log(`  ┌─ Estimate ${i + 1} ${'─'.repeat(35)}`);
    console.log(`  │  Estimate ID : ${e.id}`);
    console.log(`  │  User        : ${e.user_name || 'Guest'} ${e.email ? `(${e.email})` : ''}`);
    console.log(`  │  Location    : ${fd.suburb || '?'}, ${fd.state || '?'}`);
    console.log(`  │  Size        : ${fd.houseSize || '?'}m² house on ${fd.landSize || '?'}m² land`);
    console.log(`  │  Specs       : ${fd.bedrooms || '?'}bd/${fd.bathrooms || '?'}ba · ${fd.buildMethod || '?'} · ${fd.qualityTier || '?'}`);
    console.log(`  │  Generated   : ${e.created_at}`);
    console.log(`  └${'─'.repeat(44)}`);
  });
}

db.close();
