/**
 * test-providers.mjs — discover & smoke-test every non-Groq AI provider
 * Run:  node test-providers.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const lines = readFileSync(join(__dirname, '.env'), 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
    if (k && v) process.env[k] = v;
  }
} catch { console.warn('Could not load .env'); }

const PROMPT = 'Reply with exactly this JSON and nothing else: {"status":"ok","provider":"test"}';

// ── fetch helpers ─────────────────────────────────────────────────────────
async function apiFetch(url, options = {}, timeoutMs = 20_000) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, status: 0, text: e.message, ms: Date.now() - t0 };
  }
}
async function postJSON(url, headers, body) {
  return apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
async function getJSON(url, headers) {
  return apiFetch(url, { headers });
}
function parseReply(text) {
  try { return JSON.parse(text); } catch { return text; }
}

// ─────────────────────────────────────────────────────────────────────────
// GEMINI
// ─────────────────────────────────────────────────────────────────────────
async function testGemini() {
  console.log('\n' + '─'.repeat(55));
  console.log('GEMINI (Google AI Studio)');
  console.log('─'.repeat(55));
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.log('⚠️  GEMINI_API_KEY not set — skipping'); return null; }

  // Step 1 — discover available models
  console.log('  Listing available models...');
  const listR = await getJSON(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=50`
  );
  let availableModels = [];
  if (listR.ok) {
    const data = parseReply(listR.text);
    availableModels = (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
    console.log(`  Found ${availableModels.length} usable model(s):`);
    availableModels.forEach(m => console.log(`    • ${m}`));
  } else {
    console.log(`  ⚠️  Could not list models (HTTP ${listR.status}): ${listR.text.slice(0, 150)}`);
    // Fall back to trying known free/flash models
    availableModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
  }

  // Step 2 — try each model with a real call
  // Prefer flash/lite models (free tier) over pro
  const preferred = availableModels.sort((a, b) => {
    const score = m => m.includes('flash') ? 0 : m.includes('lite') ? 1 : m.includes('pro') ? 2 : 3;
    return score(a) - score(b);
  });

  for (const model of preferred) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
      generationConfig: { maxOutputTokens: 100, temperature: 0 },
    };
    const r = await postJSON(url, {}, body);
    if (r.ok) {
      const data = parseReply(r.text);
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || r.text;
      console.log(`\n  ✅  WORKING: ${model} (${r.ms}ms)`);
      console.log(`      → ${reply.slice(0, 100)}`);
      return model;
    } else {
      const detail = parseReply(r.text)?.error?.message || r.text;
      const tag = r.status === 429 ? '⏳ QUOTA HIT (key valid, retry later)' : `❌ ${r.status}`;
      console.log(`  ${tag}: ${model} — ${detail.slice(0, 100)}`);
      if (r.status === 429) return `QUOTA:${model}`; // key works, just quota
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// CEREBRAS
// ─────────────────────────────────────────────────────────────────────────
async function testCerebras() {
  console.log('\n' + '─'.repeat(55));
  console.log('CEREBRAS');
  console.log('─'.repeat(55));
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) { console.log('⚠️  CEREBRAS_API_KEY not set — skipping'); return null; }

  // Step 1 — list models from their API
  console.log('  Listing available models...');
  const listR = await getJSON('https://api.cerebras.ai/v1/models', { Authorization: `Bearer ${key}` });
  let models = [];
  if (listR.ok) {
    const data = parseReply(listR.text);
    models = (data.data || data.models || []).map(m => m.id || m.name).filter(Boolean);
    console.log(`  Found ${models.length} model(s):`);
    models.forEach(m => console.log(`    • ${m}`));
  } else {
    console.log(`  ⚠️  Could not list models (HTTP ${listR.status}): ${listR.text.slice(0, 150)}`);
    // Try common Cerebras model names from their docs
    models = [
      'llama-4-scout-17b-16e-instruct',
      'llama-3.3-70b',
      'qwen-3-32b',
      'llama3.3-70b',
      'llama3.1-8b',
      'llama-3.1-8b',
    ];
  }

  // Step 2 — test each model
  for (const model of models) {
    const body = {
      model,
      messages: [{ role: 'user', content: PROMPT }],
      max_tokens: 100,
      temperature: 0,
    };
    const r = await postJSON('https://api.cerebras.ai/v1/chat/completions', { Authorization: `Bearer ${key}` }, body);
    if (r.ok) {
      const data = parseReply(r.text);
      const reply = data?.choices?.[0]?.message?.content || r.text;
      console.log(`\n  ✅  WORKING: ${model} (${r.ms}ms)`);
      console.log(`      → ${reply.slice(0, 100)}`);
      return model;
    } else {
      const detail = parseReply(r.text)?.message || parseReply(r.text)?.error?.message || r.text;
      console.log(`  ❌  ${r.status}: ${model} — ${detail.slice(0, 100)}`);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// OPENROUTER
// ─────────────────────────────────────────────────────────────────────────
async function testOpenRouter() {
  console.log('\n' + '─'.repeat(55));
  console.log('OPENROUTER');
  console.log('─'.repeat(55));
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) { console.log('⚠️  OPENROUTER_API_KEY not set — skipping'); return null; }

  const hdrs = { Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://homeygo.com.au', 'X-Title': 'Homeygo Test' };

  // Step 1 — fetch free models from OpenRouter's model list
  console.log('  Fetching free models from OpenRouter...');
  const listR = await getJSON('https://openrouter.ai/api/v1/models', hdrs);
  let freeModels = [];
  if (listR.ok) {
    const data = parseReply(listR.text);
    freeModels = (data.data || [])
      .filter(m => {
        const price = parseFloat(m.pricing?.prompt || '1');
        return price === 0 && m.id;
      })
      .map(m => m.id);
    console.log(`  Found ${freeModels.length} free model(s):`);
    freeModels.slice(0, 15).forEach(m => console.log(`    • ${m}`));
    if (freeModels.length > 15) console.log(`    ... and ${freeModels.length - 15} more`);
  } else {
    console.log(`  ⚠️  Could not list models (HTTP ${listR.status}): ${listR.text.slice(0, 150)}`);
    // Fallback hardcoded list to try
    freeModels = [
      'google/gemma-3-27b-it:free',
      'google/gemma-3-12b-it:free',
      'meta-llama/llama-4-scout:free',
      'mistralai/mistral-small-3.1-24b-instruct:free',
      'qwen/qwen3-14b:free',
      'deepseek/deepseek-prover-v2:free',
      'microsoft/phi-4:free',
    ];
  }

  if (freeModels.length === 0) {
    console.log('  ❌  No free models found on this account');
    return null;
  }

  // Step 2 — test the first few models until one works
  for (const model of freeModels.slice(0, 8)) {
    const body = {
      model,
      messages: [{ role: 'user', content: PROMPT }],
      max_tokens: 100,
      temperature: 0,
    };
    const r = await postJSON('https://openrouter.ai/api/v1/chat/completions', hdrs, body);
    if (r.ok) {
      const data = parseReply(r.text);
      const reply = data?.choices?.[0]?.message?.content || r.text;
      console.log(`\n  ✅  WORKING: ${model} (${r.ms}ms)`);
      console.log(`      → ${reply.slice(0, 100)}`);
      return model;
    } else {
      const detail = parseReply(r.text)?.error?.message || r.text;
      console.log(`  ❌  ${r.status}: ${model} — ${detail.slice(0, 100)}`);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────
console.log('='.repeat(55));
console.log('  AI Provider Discovery & Test');
console.log('  Homeygo Construction Estimator');
console.log('='.repeat(55));

const [geminiResult, cerebrasResult, openrouterResult] = await Promise.all([
  testGemini(),
  testCerebras(),
  testOpenRouter(),
]);

// ── Summary ────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(55));
console.log('  SUMMARY — recommended .env updates');
console.log('='.repeat(55));

const geminiWorking = geminiResult && !geminiResult.startsWith('QUOTA:');
const geminiQuota   = geminiResult?.startsWith('QUOTA:');
const geminiModel   = geminiResult?.replace('QUOTA:', '');

console.log(`  Gemini     : ${
  geminiWorking ? `✅  GEMINI_MODEL=${geminiModel}` :
  geminiQuota   ? `⏳  Key valid, quota hit — retry with GEMINI_MODEL=${geminiModel}` :
                  '❌  Not working'
}`);
console.log(`  Cerebras   : ${cerebrasResult   ? `✅  CEREBRAS_MODEL=${cerebrasResult}`   : '❌  Not working'}`);
console.log(`  OpenRouter : ${openrouterResult ? `✅  OPENROUTER_MODEL=${openrouterResult}` : '❌  Not working'}`);

// Auto-patch .env with working values
const patches = [];
if (geminiWorking)    patches.push(['GEMINI_MODEL',    geminiModel]);
if (cerebrasResult)   patches.push(['CEREBRAS_MODEL',  cerebrasResult]);
if (openrouterResult) patches.push(['OPENROUTER_MODEL', openrouterResult]);

if (patches.length > 0) {
  console.log('\n  Patching backend/.env automatically...');
  try {
    let env = readFileSync(join(__dirname, '.env'), 'utf8');
    for (const [k, v] of patches) {
      const re = new RegExp(`^${k}=.*$`, 'm');
      if (re.test(env)) {
        env = env.replace(re, `${k}=${v}`);
      } else {
        env += `\n${k}=${v}`;
      }
      console.log(`    ✓ ${k}=${v}`);
    }
    const { writeFileSync } = await import('fs');
    writeFileSync(join(__dirname, '.env'), env, 'utf8');
    console.log('  .env updated. Restart the backend to apply.');
  } catch (e) {
    console.log(`  ⚠️  Could not auto-patch .env: ${e.message}`);
    console.log('  Manually update the values above in backend/.env');
  }
} else {
  console.log('\n  No working providers found to auto-patch.');
}

console.log('='.repeat(55) + '\n');
