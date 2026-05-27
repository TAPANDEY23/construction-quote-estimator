const express        = require('express');
const { exec, spawn } = require('child_process');
const http            = require('http');
const path            = require('path');
const fs              = require('fs');

const app  = express();
const PORT = 4000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── Check if the estimator (Vite, port 5173) is up ─────────────────────────
function checkEstimator() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5173', () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => { req.destroy(); resolve(false); });
  });
}

// ── GET /status  →  { running: bool } ──────────────────────────────────────
app.get('/status', async (_req, res) => {
  const running = await checkEstimator();
  res.json({ running });
});

// ── POST /launch  →  execute start.bat then respond ────────────────────────
app.post('/launch', (req, res) => {
  const bat = path.resolve(__dirname, '..', 'start.bat');

  // spawn with array args avoids shell-quoting issues on paths with spaces
  const child = spawn('cmd.exe', ['/c', bat], {
    detached: true,
    stdio:    'ignore',
    windowsHide: false,
  });
  child.on('error', err => console.error('[launcher] spawn error:', err.message));
  child.unref();

  res.json({ ok: true });
});

// ── POST /register  →  save lead to registrations.json ────────────────────
const REG_FILE = path.join(__dirname, 'registrations.json');

app.post('/register', (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const record = {
    id:             Date.now(),
    name:           name.trim(),
    email:          email.trim().toLowerCase(),
    phone:          (phone || '').trim(),
    registeredAt:   new Date().toISOString(),
  };

  let list = [];
  try {
    if (fs.existsSync(REG_FILE)) {
      list = JSON.parse(fs.readFileSync(REG_FILE, 'utf8'));
    }
  } catch { list = []; }

  list.push(record);
  fs.writeFileSync(REG_FILE, JSON.stringify(list, null, 2));

  console.log(`[register] ${record.name} <${record.email}>`);
  res.json({ ok: true });
});

// ── Catch-all → serve index.html ───────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Construction Estimator Launcher`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Dashboard → http://localhost:${PORT}\n`);
});
