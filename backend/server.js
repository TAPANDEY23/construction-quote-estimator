import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aiChat, getProviderStatus } from './ai-provider.js';
import { createClient } from '@libsql/client';
import nodemailer from 'nodemailer';

dotenv.config();

// ── Database setup (Turso / libSQL — cloud SQLite) ────────────────────────────
const db = createClient({
  url:       process.env.TURSO_DATABASE_URL   || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create tables on startup (runs once; safe to re-run — IF NOT EXISTS)
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

// ── Phone verification (in-memory, no extra package needed) ───────────────────
const pendingCodes  = new Map(); // normalised_phone → { code, expiresAt, attempts }
const smsRateLimits = new Map(); // normalised_phone → { count, windowStart }

const VERIFY_EXPIRY_MS   = 5 * 60 * 1000;  // code valid 5 min
const SMS_WINDOW_MS      = 10 * 60 * 1000; // rate-limit window 10 min
const SMS_MAX_PER_WINDOW = 3;              // max sends per window
const CODE_MAX_ATTEMPTS  = 5;             // wrong guesses before lockout

/** Normalise any common AU mobile format to +614XXXXXXXX, or return null. */
function normaliseAuMobile(raw) {
  const d = String(raw || '').replace(/[\s\-().]/g, '').replace(/^\+/, '');
  if (/^614\d{8}$/.test(d)) return '+' + d;
  if (/^04\d{8}$/.test(d))  return '+61' + d.slice(1);
  return null;
}

// Purge stale phone entries every 60 s
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingCodes) if (v.expiresAt < now) pendingCodes.delete(k);
}, 60_000).unref();

// ── Email verification (in-memory, TTL 5 min) ─────────────────────────────────
const emailPendingCodes  = new Map(); // email → { code, expiresAt, attempts }
const emailRateLimits    = new Map(); // email → { count, windowStart }

function normaliseEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Build nodemailer transporter lazily so missing vars don't crash startup
function getMailTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host:   EMAIL_HOST,
    port:   Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth:   { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

// Purge stale email entries every 60 s
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of emailPendingCodes) if (v.expiresAt < now) emailPendingCodes.delete(k);
}, 60_000).unref();

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:4000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,   // set to your Vercel URL in Render dashboard
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());


// ── Verification feature flags ────────────────────────────────────────────────
// Set VERIFY_EMAIL=false or VERIFY_PHONE=false in .env to disable a flow.
// Defaults to enabled when the var is absent or set to anything other than 'false'.
app.get('/api/verification-config', (_req, res) => {
  res.json({
    emailVerification: process.env.VERIFY_EMAIL  !== 'false',
    phoneVerification: process.env.VERIFY_PHONE  !== 'false',
  });
});

// ── Send email verification code ──────────────────────────────────────────────
app.post('/api/send-email-verification', async (req, res) => {
  // Top-level try/catch — Express 4 does NOT forward async throws automatically
  try {
    const email = normaliseEmail(req.body.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    // Rate-limit: max 3 sends per email per 10 min
    const now = Date.now();
    const rl  = emailRateLimits.get(email) ?? { count: 0, windowStart: now };
    if (now - rl.windowStart < SMS_WINDOW_MS) {
      if (rl.count >= SMS_MAX_PER_WINDOW) {
        const wait = Math.ceil((SMS_WINDOW_MS - (now - rl.windowStart)) / 60_000);
        return res.status(429).json({ error: `Too many attempts. Please try again in ${wait} minute(s).` });
      }
      rl.count++;
    } else {
      rl.count = 1;
      rl.windowStart = now;
    }
    emailRateLimits.set(email, rl);

    const code = String(Math.floor(1000 + Math.random() * 9000));
    emailPendingCodes.set(email, { code, expiresAt: now + VERIFY_EXPIRY_MS, attempts: 0 });

    const transporter = getMailTransporter();
    const fromName    = process.env.EMAIL_FROM || `Homeygo AI <${process.env.EMAIL_USER}>`;

    if (transporter) {
      await transporter.sendMail({
        from:    fromName,
        to:      email,
        subject: `${code} is your Homeygo verification code`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0c0e13;color:#f1f5f9;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#5b21b6,#7c3aed);padding:28px 32px;text-align:center">
              <h1 style="margin:0;font-size:1.4rem;color:#fff">&#x1F3D7;&#xFE0F; Homeygo AI</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:0.85rem">Construction Cost Estimator</p>
            </div>
            <div style="padding:32px">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:0.9rem">Your verification code is:</p>
              <div style="background:#1e2130;border:2px solid #f59e0b;border-radius:10px;padding:20px;text-align:center;margin:16px 0">
                <span style="font-size:2.4rem;font-weight:700;letter-spacing:0.5em;color:#f59e0b;font-family:monospace">${code}</span>
              </div>
              <p style="color:#64748b;font-size:0.8rem;margin:16px 0 0">
                This code expires in <strong style="color:#94a3b8">5 minutes</strong>.<br>
                If you did not request this, you can safely ignore this email.
              </p>
            </div>
          </div>`,
        text: `Your Homeygo AI verification code is: ${code}\n\nExpires in 5 minutes. Do not share this code.`,
      });
    } else {
      // Dev mode — print code to terminal
      console.log(`\n📧  [DEV] Email code for ${email}: ${code}  (valid 5 min)\n`);
    }

    res.json({ success: true });

  } catch (err) {
    console.error('send-email-verification error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send email. Please try again.' });
  }
});

// ── Verify email code ─────────────────────────────────────────────────────────
app.post('/api/verify-email-code', (req, res) => {
  const email = normaliseEmail(req.body.email);
  const code  = String(req.body.code ?? '').trim();

  if (!email || !code) return res.status(400).json({ error: 'email and code are required' });

  const entry = emailPendingCodes.get(email);
  if (!entry) {
    return res.status(400).json({ error: 'No active code for this email — please request a new one.' });
  }

  if (Date.now() > entry.expiresAt) {
    emailPendingCodes.delete(email);
    return res.status(400).json({ error: 'Code expired. Please request a new one.', expired: true });
  }

  entry.attempts++;

  if (entry.attempts > CODE_MAX_ATTEMPTS) {
    emailPendingCodes.delete(email);
    return res.status(400).json({ error: 'Too many wrong attempts. Please request a new code.', maxAttempts: true });
  }

  if (code !== entry.code) {
    const left = CODE_MAX_ATTEMPTS - entry.attempts;
    return res.status(400).json({
      error: `Incorrect code — ${left} attempt${left !== 1 ? 's' : ''} remaining.`,
      attemptsLeft: left,
    });
  }

  emailPendingCodes.delete(email);
  res.json({ verified: true });
});

// ── Send verification SMS ─────────────────────────────────────────────────────
app.post('/api/send-verification', async (req, res) => {
  const phone = normaliseAuMobile(req.body.phone);
  if (!phone) {
    return res.status(400).json({ error: 'Enter a valid Australian mobile number (04XX XXX XXX)' });
  }

  // Rate-limit: max 3 sends per phone per 10 min
  const now = Date.now();
  const rl  = smsRateLimits.get(phone) ?? { count: 0, windowStart: now };
  if (now - rl.windowStart < SMS_WINDOW_MS) {
    if (rl.count >= SMS_MAX_PER_WINDOW) {
      const wait = Math.ceil((SMS_WINDOW_MS - (now - rl.windowStart)) / 60_000);
      return res.status(429).json({ error: `Too many attempts. Please try again in ${wait} minute(s).` });
    }
    rl.count++;
  } else {
    rl.count = 1;
    rl.windowStart = now;
  }
  smsRateLimits.set(phone, rl);

  const code = String(Math.floor(1000 + Math.random() * 9000));
  pendingCodes.set(phone, { code, expiresAt: now + VERIFY_EXPIRY_MS, attempts: 0 });

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
    // Production: send via Twilio REST API (no extra npm package required)
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    try {
      const smsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method:  'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    new URLSearchParams({
            To:   phone,
            From: TWILIO_FROM_NUMBER,
            Body: `Your Homeygo verification code is: ${code}. Valid for 5 minutes. Do not share this code.`,
          }),
        }
      );
      if (!smsRes.ok) {
        const body = await smsRes.json().catch(() => ({}));
        const msg  = body.message || `Twilio HTTP ${smsRes.status}`;
        const code2 = body.code;
        console.error(`Twilio error [${code2}]:`, msg);

        // Surface actionable messages for the most common Twilio error codes
        const friendly = {
          20003: 'Twilio authentication failed — check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.',
          21211: 'The destination phone number is invalid. Check the number format.',
          21214: 'Twilio cannot send to this number (landline or unsupported carrier).',
          21608: 'Your Twilio trial account can only send SMS to verified numbers. Add this number at console.twilio.com → Verified Caller IDs.',
          21610: 'This number has opted out of SMS. They must text START to your Twilio number to opt back in.',
          21614: 'The destination is not a mobile number.',
          21617: 'Message body too long.',
          30003: 'The destination number is unreachable.',
          30004: 'Message blocked by the carrier.',
          30006: 'Landline or unreachable carrier.',
        }[code2];

        return res.status(500).json({
          error: friendly || msg,
          twilioCode: code2,
        });
      }
    } catch (err) {
      console.error('Twilio error:', err.message);
      return res.status(500).json({ error: err.message || 'Failed to send SMS. Please try again.' });
    }
  } else {
    // Dev mode: no Twilio credentials → print code to terminal
    console.log(`\n📱  [DEV] SMS code for ${phone}: ${code}  (valid 5 min)\n`);
  }

  res.json({ success: true });
});

// ── Verify SMS code ───────────────────────────────────────────────────────────
app.post('/api/verify-code', (req, res) => {
  const phone = normaliseAuMobile(req.body.phone);
  const code  = String(req.body.code ?? '').trim();

  if (!phone || !code) return res.status(400).json({ error: 'phone and code are required' });

  const entry = pendingCodes.get(phone);
  if (!entry) {
    return res.status(400).json({ error: 'No active code for this number — please request a new one.' });
  }

  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(phone);
    return res.status(400).json({ error: 'Code expired. Please request a new one.', expired: true });
  }

  entry.attempts++;

  if (entry.attempts > CODE_MAX_ATTEMPTS) {
    pendingCodes.delete(phone);
    return res.status(400).json({ error: 'Too many wrong attempts. Please request a new code.', maxAttempts: true });
  }

  if (code !== entry.code) {
    const left = CODE_MAX_ATTEMPTS - entry.attempts;
    return res.status(400).json({
      error: `Incorrect code — ${left} attempt${left !== 1 ? 's' : ''} remaining.`,
      attemptsLeft: left,
    });
  }

  pendingCodes.delete(phone);
  res.json({ verified: true });
});

// ── Registration endpoint ─────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, company, phone } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'firstName, lastName, and email are required' });
  }
  try {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const em = email.trim().toLowerCase();
    const co = company?.trim() || null;
    const ph = phone?.trim() || null;

    // Check if this email already exists
    const lookup = await db.execute({
      sql:  'SELECT id FROM users WHERE LOWER(email) = ?',
      args: [em],
    });
    const existing = lookup.rows[0];

    if (existing) {
      // Update details in case they changed name / company / phone
      await db.execute({
        sql:  'UPDATE users SET first_name=?, last_name=?, company=?, phone=? WHERE id=?',
        args: [fn, ln, co, ph, existing.id],
      });
      return res.json({ userId: Number(existing.id), name: `${fn} ${ln}`, email: em, alreadyRegistered: true });
    }

    // New user — insert fresh record
    const result = await db.execute({
      sql:  'INSERT INTO users (first_name, last_name, email, company, phone) VALUES (?, ?, ?, ?, ?)',
      args: [fn, ln, em, co, ph],
    });

    res.json({ userId: Number(result.lastInsertRowid), name: `${fn} ${ln}`, email: em });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to save registration' });
  }
});

// ── Save estimate endpoint ────────────────────────────────────────────────────
app.post('/api/save-estimate', async (req, res) => {
  const { userId, formData, estimate } = req.body;
  if (!formData || !estimate) {
    return res.status(400).json({ error: 'formData and estimate are required' });
  }
  try {
    const result = await db.execute({
      sql:  'INSERT INTO estimates (user_id, form_data, estimate_result) VALUES (?, ?, ?)',
      args: [userId || null, JSON.stringify(formData), JSON.stringify(estimate)],
    });
    res.json({ estimateId: Number(result.lastInsertRowid) });
  } catch (err) {
    console.error('Save estimate error:', err);
    res.status(500).json({ error: 'Failed to save estimate' });
  }
});

// ── Estimate system prompt ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert Australian construction cost estimator with 20+ years of experience across residential builds in all states and territories. You have deep knowledge of current (2024-2025) material costs, labour rates, council requirements, and market conditions across Australian suburbs.

When given project details, produce a detailed construction cost estimate. You must respond with ONLY a valid JSON object — no markdown, no code fences, no explanation text outside the JSON. The JSON must exactly match this schema:

{
  "summary": "string (2-3 sentence overview of the project and key cost drivers)",
  "breakdown": [
    {
      "category": "string",
      "low": number,
      "mid": number,
      "high": number,
      "notes": "string (brief context for this category)"
    }
  ],
  "totalRange": { "low": number, "mid": number, "high": number },
  "costPerSqm": { "low": number, "mid": number, "high": number },
  "buildTimeEstimate": "string",
  "assumptions": ["string"],
  "keyConsiderations": ["string"],
  "disclaimer": "string"
}

The breakdown array must contain exactly these 16 categories in this order:
1. Site Preparation & Foundations
2. Framing & Structure
3. Roofing
4. External Walls, Cladding & Windows
5. Electrical
6. Plumbing & Gas
7. Internal Linings & Insulation
8. Joinery, Doors & Hardware
9. Kitchen & Wet Areas
10. Flooring & Tiling
11. Painting & Finishes
12. Landscaping, Driveway & External Works
13. HVAC (Heating/Cooling)
14. Statutory Fees, Council & Permits
15. Builder's Overhead & Margin
16. Contingency

Pricing rules:
- All amounts in Australian dollars (AUD), whole numbers only
- Low = budget/entry-level build, Mid = standard build, High = premium/luxury build
- totalRange must equal the sum of all breakdown low/mid/high values
- costPerSqm = totalRange divided by the house floor area (not land size)
- Factor in state-specific costs: Sydney and Melbourne are 10-20% above national average; Brisbane and Perth are near average; regional areas vary by accessibility
- Builder's Overhead & Margin should be 18-25% of direct construction costs
- Contingency should be 5-10% of total project cost
- Statutory Fees vary significantly by state — Sydney/Melbourne council fees can be $15,000-$40,000+
- For project homes (volume builders), use lower margins; for custom homes, use higher margins

Quality tier guidance:
- Budget/Entry: project home, standard inclusions, laminate benchtops, carpet/tiles, basic landscaping
- Mid-range: mix of project and custom, stone benchtops, timber floors in living areas, modest landscaping
- Premium/Luxury: fully custom, premium appliances, natural stone, hardwood floors, extensive landscaping

Respond with ONLY the JSON object. No other text.`;

// ── Site guidance (suburb-specific terrain & council notes) ───────────────────
app.post('/api/site-guidance', async (req, res) => {
  const { suburb, state } = req.body;
  if (!suburb || !state) return res.status(400).json({ error: 'suburb and state required' });
  try {
    const text = await aiChat({
      systemPrompt: `You are an expert Australian construction and land development advisor with detailed knowledge of every suburb's terrain, soil types, flooding overlays, and local council requirements.

Given a suburb and state, return ONLY a valid JSON object with this schema:
{
  "terrainNote": "1-2 sentence description of the suburb's typical terrain, slope characteristics, and soil classification relevant to residential construction. Be specific to the actual suburb.",
  "councilNote": "1-2 sentence note about the local council's specific requirements for site works, geotechnical reports, overlays, or drainage that affect construction costs. Include approximate cost ranges where relevant."
}

Be factual, specific, and useful for a homeowner planning a residential build. No markdown, no extra text.`,
      messages: [{ role: 'user', content: `Suburb: ${suburb}, State: ${state}, Australia` }],
      maxTokens: 300,
      temperature: 0.2,
      jsonMode: true,
    });
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    console.error('AI site-guidance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/estimate', async (req, res) => {
  const { formData } = req.body;

  if (!formData) {
    return res.status(400).json({ error: 'Missing formData in request body' });
  }

  const userPrompt = buildUserPrompt(formData);

  try {
    const text = await aiChat({
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 4096,
      temperature: 0.3,
      jsonMode: true,
    });
    const estimate = JSON.parse(text);

    res.json({ estimate });
  } catch (error) {
    console.error('AI estimate error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate estimate' });
  }
});

function buildUserPrompt(d) {
  return `Generate a construction cost estimate for the following residential build in Australia:

LOCATION
- Suburb: ${d.suburb || 'Not specified'}
- State/Territory: ${d.state || 'Not specified'}

SITE CONDITIONS
- Site classification: ${{
    flat: 'Flat / Level — standard cut & fill, Class M/H1 soil (base rate)',
    gentle_slope: 'Gentle slope — up to 1m fall across block (+10–15% on earthworks)',
    steep: 'Steep / complex — 2m+ fall, retaining walls required (+18–25% on earthworks)',
    not_sure: 'Unknown — apply mid-range site cost estimate',
  }[d.siteCondition] || 'Unknown — apply mid-range site cost estimate'}

LAND & STRUCTURE
- Land size: ${d.landSize || 'Not specified'} m²
- House floor area: ${d.houseSize || 'Not specified'} m²
- Number of storeys: ${d.storeys || 1}

ROOMS & LAYOUT
- Bedrooms: ${d.bedrooms || 3}
- Bathrooms (full): ${d.bathrooms || 2}
- Ensuites: ${d.ensuites || 0}
- Toilets (total): ${d.toilets || 2}
- Study/office: ${d.study ? 'Yes' : 'No'}
- Butler's pantry: ${d.pantry ? 'Yes' : 'No'}

GARAGE / PARKING
- Garage type: ${d.garageType || 'None'}
- Garage spaces: ${d.garageSpaces || 0}

CONSTRUCTION TYPE
- Facade / cladding: ${d.facadeType || 'Brick veneer'}
- Quality tier: ${d.qualityTier || 'Mid-range'}

INCLUSIONS & FINISHES
- Kitchen finish: ${d.kitchenFinish || 'Standard'}
- Flooring: ${d.flooringType || 'Mixed (carpet + tiles)'}
- Landscaping: ${d.landscaping || 'Basic'}
- Swimming pool: ${d.pool ? 'Yes' : 'No'}
- Solar panels: ${d.solar ? 'Yes' : 'No'}
- Ducted air conditioning: ${d.ductedAC ? 'Yes' : 'No'}
- Alfresco / outdoor entertaining: ${d.alfresco ? 'Yes' : 'No'}

SPECIAL REQUIREMENTS
${d.specialRequirements || 'None specified'}

Please provide a detailed cost estimate breakdown for this project.`;
}

app.post('/api/chat', async (req, res) => {
  const { messages, formData, estimate } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages array' });
  }

  const systemPrompt = buildChatSystemPrompt(formData, estimate);
  const cleanMessages = messages.map(({ role, content }) => ({ role, content }));

  try {
    const reply = await aiChat({
      systemPrompt,
      messages: cleanMessages,
      maxTokens: 1024,
      temperature: 0.5,
    });
    res.json({ reply });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to get response' });
  }
});

const BUILDERS_SYSTEM_PROMPT = `You are an expert on the Australian residential construction industry with current (2024-2025) knowledge of builders operating in every state and territory.

Given a suburb, state, quality tier, and house size, return exactly 4 real Australian builders suited to that project. Include a mix of volume/project home builders and (for mid/premium tiers) at least one custom or semi-custom builder.

Respond with ONLY a valid JSON object — no markdown, no code fences, no explanation. Schema:

{
  "builders": [
    {
      "name": "string (real, currently operating Australian builder name)",
      "type": "string (one of: Volume Builder, Custom Builder, Semi-Custom Builder, Project Home Builder)",
      "badge": "string (one of: Best Value, Most Popular, Custom Specialist, Premium Choice, Best for First Home)",
      "pricePerSqm": { "low": number, "high": number },
      "totalRange": { "low": number, "high": number },
      "strength": "string (one specific strength or USP, max 12 words)",
      "coverage": "string (e.g. Victoria-wide, National, Greater Sydney, WA only)"
    }
  ]
}

Rules:
- All prices in AUD whole numbers, realistic for the quality tier and state
- totalRange must equal approximately pricePerSqm × houseSize (m²)
- Names must be real, identifiable Australian builders — never invent a name
- Vary the builder types — do not list 4 identical volume builders
- For budget tier: focus on project/volume builders (Metricon, G.J. Gardner, etc.)
- For mid tier: mix of volume and semi-custom (Henley, Clarendon, McDonald Jones, Simonds, etc.)
- For premium tier: include custom builders and boutique firms alongside volume options
- Badges must be unique across the 4 builders`;

app.post('/api/builders', async (req, res) => {
  const { suburb, state, qualityTier, houseSize } = req.body;

  if (!suburb || !state) {
    return res.status(400).json({ error: 'suburb and state are required' });
  }

  const tierLabel = qualityTier === 'budget' ? 'budget/entry-level'
    : qualityTier === 'premium' ? 'premium/luxury'
    : 'mid-range standard';

  const userPrompt = `Find the top 4 residential builders for:
- Location: ${suburb}, ${state}, Australia
- Quality tier: ${tierLabel}
- House floor area: ${houseSize || 250}m²

Return 4 real builders that actively operate in or near ${suburb}, ${state}. Include their realistic price ranges for a ${houseSize || 250}m² ${tierLabel} home in this location.`;

  try {
    const text = await aiChat({
      systemPrompt: BUILDERS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1500,
      temperature: 0.3,
      jsonMode: true,
    });
    const data = JSON.parse(text);
    res.json({ builders: data.builders || [] });
  } catch (error) {
    console.error('AI builders error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch builders' });
  }
});

// ── AI provider health status ──────────────────────────────────────────────
app.get('/api/ai-status', (_req, res) => {
  res.json({ providers: getProviderStatus() });
});

function buildChatSystemPrompt(formData, estimate) {
  const projectContext = formData ? `
PROJECT DETAILS:
- Location: ${formData.suburb || 'Not specified'}, ${formData.state || 'Not specified'}
- Land size: ${formData.landSize ? formData.landSize + ' m²' : 'Not specified'}
- House floor area: ${formData.houseSize ? formData.houseSize + ' m²' : 'Not specified'}
- Storeys: ${formData.storeys || 1}
- Bedrooms: ${formData.bedrooms || 3}, Bathrooms: ${formData.bathrooms || 2}, Ensuites: ${formData.ensuites || 0}, Toilets: ${formData.toilets || 2}
- Study/office: ${formData.study ? 'Yes' : 'No'}, Butler's pantry: ${formData.pantry ? 'Yes' : 'No'}
- Garage: ${formData.garageType || 'None'} (${formData.garageSpaces || 0} spaces)
- Facade / cladding: ${formData.facadeType || 'brick_veneer'}
- Quality tier: ${formData.qualityTier || 'mid'}
- Kitchen finish: ${formData.kitchenFinish || 'Standard'}
- Flooring: ${formData.flooringType || 'Mixed'}
- Landscaping: ${formData.landscaping || 'Basic'}
- Pool: ${formData.pool ? 'Yes' : 'No'}, Solar: ${formData.solar ? 'Yes' : 'No'}
- Ducted AC: ${formData.ductedAC ? 'Yes' : 'No'}, Alfresco: ${formData.alfresco ? 'Yes' : 'No'}
- Special requirements: ${formData.specialRequirements || 'None'}` : '';

  const estimateContext = estimate ? `

GENERATED ESTIMATE:
- Total range: $${estimate.totalRange?.low?.toLocaleString('en-AU')} (budget) – $${estimate.totalRange?.mid?.toLocaleString('en-AU')} (mid) – $${estimate.totalRange?.high?.toLocaleString('en-AU')} (premium) AUD
- Cost per m²: $${estimate.costPerSqm?.low?.toLocaleString('en-AU')} – $${estimate.costPerSqm?.high?.toLocaleString('en-AU')}
- Build time estimate: ${estimate.buildTimeEstimate}
- Cost breakdown by category:
${(estimate.breakdown || []).map(b => `  • ${b.category}: $${b.low?.toLocaleString('en-AU')} – $${b.mid?.toLocaleString('en-AU')} – $${b.high?.toLocaleString('en-AU')}`).join('\n')}
- Key assumptions: ${(estimate.assumptions || []).join('; ')}
- Key considerations: ${(estimate.keyConsiderations || []).join('; ')}` : '';

  return `You are a friendly, expert Australian construction cost estimator copilot. You help users understand their construction quotes, suggest practical ways to reduce or optimise costs, explain specific cost categories, and answer questions about the Australian building process.
${projectContext}${estimateContext}

Guidelines:
- Be concise, clear, and helpful. Use Australian English spelling.
- When suggesting cost savings, be specific and realistic — mention actual dollar ranges where possible.
- Reference the project's specific details and estimate figures when answering questions.
- Format responses clearly: use short paragraphs and bullet points for lists.
- Use **bold** for all dollar amounts, key percentages, important technical terms, and critical action items or recommendations. For example: **$45,000**, **brick veneer**, **20% contingency**.
- If the user hasn't generated an estimate yet, help them understand what to expect and how their choices affect cost.
- Stay focused on construction, renovation, and building cost topics.
- Keep responses under 250 words unless the question genuinely requires more detail.`;
}

const AU_STATE_MAP = {
  'Victoria': 'VIC',
  'New South Wales': 'NSW',
  'Queensland': 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
};

app.get('/api/suburbs', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  const params = new URLSearchParams({
    format: 'json',
    addressdetails: '1',
    countrycodes: 'au',
    limit: '10',
    dedupe: '1',
    'accept-language': 'en',
  });

  if (/^\d{4}$/.test(q)) {
    params.set('postalcode', q);
    params.set('countrycodes', 'au');
  } else {
    params.set('q', q);
    params.set('featuretype', 'settlement');
  }

  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'AustralianConstructionEstimator/1.0',
        'Accept': 'application/json',
      },
    });
    if (!resp.ok) throw new Error(`Nominatim HTTP ${resp.status}`);
    const data = await resp.json();

    const seen = new Set();
    const results = [];

    for (const item of data) {
      const addr = item.address || {};
      const name = addr.suburb || addr.city_district || addr.town || addr.village || addr.hamlet || addr.municipality;
      const postcode = addr.postcode;
      const state = AU_STATE_MAP[addr.state];
      if (!name || !postcode || !state) continue;

      const key = `${name.toLowerCase()}|${postcode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push([name, postcode, state]);
    }

    res.json(results);
  } catch (err) {
    console.error('Suburb search error:', err.message);
    res.status(500).json({ error: 'Suburb search temporarily unavailable' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
