/**
 * test-best-models.mjs
 * Finds the best available FREE model for each provider.
 * Enforces no duplicate models across providers.
 * Auto-patches ai-config.json with the winners.
 *
 * Run: node test-best-models.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
readFileSync(join(__dirname, '.env'), 'utf8').split('\n').forEach(l => {
  const t = l.trim(); if (!t || t[0] === '#') return;
  const i = t.indexOf('='); if (i < 0) return;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
});

const PROMPT = 'You are a helpful Australian construction advisor. In 1 sentence, explain why brick veneer is popular in Australia. Be concise.';
const usedModels = new Set();

async function chat(url, headers, model, timeoutMs = 20_000) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: PROMPT }], max_tokens: 120, temperature: 0.3 }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const txt = await r.text();
    if (!r.ok) {
      let msg = txt.slice(0, 120);
      try { msg = JSON.parse(txt)?.error?.message || JSON.parse(txt)?.message || msg; } catch {}
      return { ok: false, status: r.status, msg };
    }
    let content = '';
    try { content = JSON.parse(txt)?.choices?.[0]?.message?.content || ''; } catch {}
    return { ok: !!content.trim(), content: content.trim(), status: 200 };
  } catch (e) {
    return { ok: false, status: 0, msg: e.message };
  }
}

async function findBest(providerName, candidates, testFn) {
  console.log(`\n${'─'.repeat(52)}`);
  console.log(`${providerName.toUpperCase()}`);
  console.log('─'.repeat(52));
  for (const model of candidates) {
    if (usedModels.has(model)) {
      console.log(`  ⤳  skip ${model} — already used by another provider`);
      continue;
    }
    const t0 = Date.now();
    const r  = await testFn(model);
    const ms = Date.now() - t0;
    if (r.ok) {
      console.log(`  ✅  ${model} (${ms}ms)`);
      console.log(`      → ${r.content.slice(0, 110)}`);
      usedModels.add(model);
      return model;
    } else {
      const tag = r.status === 429 ? '⏳ QUOTA' : `❌ ${r.status}`;
      console.log(`  ${tag}  ${model}: ${(r.msg||'').slice(0, 90)}`);
    }
  }
  return null;
}

// ── Per-provider candidate lists (ordered best → fallback) ────────────────
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];
const MISTRAL_MODELS = [
  'mistral-small-latest',
  'open-mistral-nemo',
  'open-mistral-7b',
  'open-mixtral-8x7b',
];
// Nvidia — prefer NVIDIA's own models; avoid vanilla Llama already used by Groq
const NVIDIA_MODELS = [
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/llama-3.3-nemotron-super-49b-v1',
  'mistralai/mistral-large-2-instruct',
  'google/gemma-2-27b-it',
  'meta/llama-3.1-70b-instruct',
];
const CEREBRAS_MODELS = [
  'gpt-oss-120b',
  'zai-glm-4.7',
];
// OpenRouter — prefer models not already covered by other providers
const OPENROUTER_MODELS = [
  'google/gemma-4-31b-it:free',
  'moonshotai/kimi-k2.6:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

// ── Test each provider ─────────────────────────────────────────────────────
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const NVIDIA_URL  = 'https://integrate.api.nvidia.com/v1/chat/completions';
const CEREBRAS_URL= 'https://api.cerebras.ai/v1/chat/completions';
const OR_URL      = 'https://openrouter.ai/api/v1/chat/completions';

const groqH    = { Authorization: `Bearer ${process.env.GROQ_API_KEY}` };
const mistralH = { Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` };
const nvidiaH  = { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` };
const cbH      = { Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}` };
const orH      = { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'HTTP-Referer': 'https://homeygo.com.au', 'X-Title': 'Homeygo' };

const groqModel    = await findBest('Groq',       GROQ_MODELS,    m => chat(GROQ_URL,    groqH,    m));
const geminiModel  = await findBest('Gemini',     GEMINI_MODELS,  async m => {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: PROMPT }] }], generationConfig: { maxOutputTokens: 120, temperature: 0.3 } }),
      signal: AbortSignal.timeout(20_000),
    });
    const txt = await r.text();
    if (!r.ok) { const msg = JSON.parse(txt)?.error?.message || txt.slice(0, 120); return { ok: false, status: r.status, msg }; }
    const content = JSON.parse(txt)?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { ok: !!content.trim(), content: content.trim(), status: 200 };
  } catch (e) { return { ok: false, status: 0, msg: e.message }; }
});
const mistralModel = await findBest('Mistral',    MISTRAL_MODELS, m => chat(MISTRAL_URL, mistralH, m));
const nvidiaModel  = await findBest('Nvidia NIM', NVIDIA_MODELS,  m => chat(NVIDIA_URL,  nvidiaH,  m));
const cerebrasModel= await findBest('Cerebras',   CEREBRAS_MODELS,m => chat(CEREBRAS_URL,cbH,      m));
const orModel      = await findBest('OpenRouter', OPENROUTER_MODELS,m=>chat(OR_URL,       orH,      m));

// ── Summary ────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(52));
console.log('  BEST MODELS (no duplicates)');
console.log('='.repeat(52));
const results = { groq: groqModel, gemini: geminiModel, mistral: mistralModel, nvidia: nvidiaModel, cerebras: cerebrasModel, openrouter: orModel };
for (const [p, m] of Object.entries(results)) {
  console.log(`  ${p.padEnd(12)}: ${m ? `✅  ${m}` : '❌  none found'}`);
}

// ── Auto-patch ai-config.json ─────────────────────────────────────────────
const cfgPath = join(__dirname, 'ai-config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
let patched = 0;
for (const entry of cfg.providers) {
  const winner = results[entry.name];
  if (winner && entry.model !== winner) {
    console.log(`\n  Updating ai-config.json: ${entry.name} → ${winner}`);
    entry.model = winner;
    patched++;
  }
}
if (patched > 0) {
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
  console.log(`\n  ✓ ai-config.json patched (${patched} model(s) updated). Hot-reload active — no restart needed.`);
} else {
  console.log('\n  ✓ ai-config.json already has optimal models.');
}
console.log('='.repeat(52) + '\n');
