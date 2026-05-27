import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { createClient } from '@libsql/client';

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

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
      return res.json({ userId: Number(existing.id), name: `${fn} ${ln}`, email: em });
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

app.post('/api/estimate', async (req, res) => {
  const { formData } = req.body;

  if (!formData) {
    return res.status(400).json({ error: 'Missing formData in request body' });
  }

  const userPrompt = buildUserPrompt(formData);

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      temperature: 0.3,
    });

    const text = response.choices[0].message.content;
    const estimate = JSON.parse(text);

    res.json({ estimate });
  } catch (error) {
    console.error('Groq API error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate estimate' });
  }
});

function buildUserPrompt(d) {
  return `Generate a construction cost estimate for the following residential build in Australia:

LOCATION
- Suburb: ${d.suburb || 'Not specified'}
- State/Territory: ${d.state || 'Not specified'}

LAND & STRUCTURE
- Land size: ${d.landSize || 'Not specified'} m²
- House floor area: ${d.houseSize || 'Not specified'} m²
- Number of storeys: ${d.storeys || 1}

ROOMS & LAYOUT
- Bedrooms: ${d.bedrooms || 3}
- Bathrooms (full): ${d.bathrooms || 2}
- Toilets (total): ${d.toilets || 2}
- Study/office: ${d.study ? 'Yes' : 'No'}

GARAGE / PARKING
- Garage type: ${d.garageType || 'None'}
- Garage spaces: ${d.garageSpaces || 0}

CONSTRUCTION TYPE
- Build method: ${d.buildMethod || 'Not specified'}
- Design type: ${d.designType || 'Not specified'}
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
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...cleanMessages,
      ],
      max_tokens: 1024,
      temperature: 0.5,
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Groq chat error:', error);
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
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: BUILDERS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.3,
    });

    const data = JSON.parse(response.choices[0].message.content);
    res.json({ builders: data.builders || [] });
  } catch (error) {
    console.error('Builders API error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch builders' });
  }
});

function buildChatSystemPrompt(formData, estimate) {
  const projectContext = formData ? `
PROJECT DETAILS:
- Location: ${formData.suburb || 'Not specified'}, ${formData.state || 'Not specified'}
- Land size: ${formData.landSize ? formData.landSize + ' m²' : 'Not specified'}
- House floor area: ${formData.houseSize ? formData.houseSize + ' m²' : 'Not specified'}
- Storeys: ${formData.storeys || 1}
- Bedrooms: ${formData.bedrooms || 3}, Bathrooms: ${formData.bathrooms || 2}, Toilets: ${formData.toilets || 2}
- Study/office: ${formData.study ? 'Yes' : 'No'}
- Garage: ${formData.garageType || 'None'} (${formData.garageSpaces || 0} spaces)
- Build method: ${formData.buildMethod || 'Not specified'}
- Design type: ${formData.designType || 'Not specified'}
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
