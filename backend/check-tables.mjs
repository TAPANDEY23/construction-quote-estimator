import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const db = new Database('data/cqe.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in database:', tables.length);
tables.forEach(t => console.log(' -', t.name));

const dbPath = new URL('./data/cqe.db', import.meta.url).pathname.replace(/^\//, '');
console.log('\nFull DB path to open in DB Browser:');
console.log('d:\\OM\\Construction Quote Estimator - CoPilot\\backend\\data\\cqe.db');
db.close();
