/**
 * Seed script — populates local.db with sample users and estimates.
 * Run once after first startup: node seed.js
 * Safe to re-run — checks for existing data before inserting.
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ── Ensure tables exist ───────────────────────────────────────────────────────
await db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    email      TEXT NOT NULL,
    company    TEXT,
    phone      TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);
await db.execute(`
  CREATE TABLE IF NOT EXISTS estimates (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id),
    form_data       TEXT NOT NULL,
    estimate_result TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now'))
  )
`);

// ── Check if already seeded ───────────────────────────────────────────────────
const existing = await db.execute('SELECT COUNT(*) as count FROM users');
if (Number(existing.rows[0].count) > 0) {
  console.log('Database already has data — skipping seed.');
  process.exit(0);
}

// ── Seed users ────────────────────────────────────────────────────────────────
const sampleUsers = [
  { first_name: 'Sarah',  last_name: 'Thompson', email: 'sarah@example.com',   company: 'Thompson Builds',    phone: '0400 111 222' },
  { first_name: 'James',  last_name: 'Miller',   email: 'james@example.com',   company: null,                 phone: '0411 333 444' },
  { first_name: 'Priya',  last_name: 'Sharma',   email: 'priya@example.com',   company: 'Sharma Developments', phone: '0422 555 666' },
];

for (const u of sampleUsers) {
  await db.execute({
    sql:  'INSERT INTO users (first_name, last_name, email, company, phone) VALUES (?, ?, ?, ?, ?)',
    args: [u.first_name, u.last_name, u.email, u.company, u.phone],
  });
}

// ── Seed one sample estimate ──────────────────────────────────────────────────
const sampleFormData = {
  suburb: 'Parramatta', state: 'NSW', landSize: 600, houseSize: 280,
  storeys: 2, bedrooms: 4, bathrooms: 2, toilets: 3, study: true,
  garageType: 'double_garage', garageSpaces: 2,
  buildMethod: 'brick_veneer', designType: 'custom_home', qualityTier: 'mid',
  kitchenFinish: 'stone', flooringType: 'timber', landscaping: 'moderate',
  pool: false, solar: true, ductedAC: true, alfresco: true,
  specialRequirements: 'Energy efficient build with 10kW solar system',
};

const sampleEstimate = {
  summary: 'A 2-storey 280m² custom brick veneer home in Parramatta NSW with mid-range finishes, stone kitchen, timber floors, ducted AC and solar.',
  totalRange: { low: 620000, mid: 780000, high: 960000 },
  costPerSqm: { low: 2214, mid: 2786, high: 3429 },
  buildTimeEstimate: '12–16 months',
  breakdown: [
    { category: 'Site Preparation & Foundations', low: 28000, mid: 36000, high: 48000, notes: 'Standard Parramatta site conditions' },
    { category: 'Framing & Structure',            low: 72000, mid: 92000, high: 118000, notes: '2-storey timber frame' },
    { category: 'Roofing',                        low: 28000, mid: 38000, high: 52000, notes: 'Colorbond or concrete tile' },
  ],
  assumptions: ['Flat site with no unusual ground conditions', 'Standard soil classification H1'],
  keyConsiderations: ['NSW council DA fees apply', 'BASIX energy compliance required in NSW'],
  disclaimer: 'This estimate is indicative only. Obtain fixed-price quotes from licensed builders before proceeding.',
};

await db.execute({
  sql:  'INSERT INTO estimates (user_id, form_data, estimate_result) VALUES (?, ?, ?)',
  args: [1, JSON.stringify(sampleFormData), JSON.stringify(sampleEstimate)],
});

console.log('✅ Seed complete — 3 users and 1 estimate inserted into local.db');
process.exit(0);
