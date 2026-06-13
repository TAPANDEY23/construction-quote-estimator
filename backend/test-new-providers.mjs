import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
readFileSync(join(__dirname, '.env'), 'utf8').split('\n').forEach(l => {
  const t = l.trim(); if (!t || t[0] === '#') return;
  const i = t.indexOf('='); if (i < 0) return;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
});

// Override with new keys passed via env for this test
if (!process.env.MISTRAL_API_KEY) process.env.MISTRAL_API_KEY = '5SyYSG7So1eVpGqgKO7GanpE8C9ZiEJp';
if (!process.env.NVIDIA_API_KEY)  process.env.NVIDIA_API_KEY  = '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';

const PROMPT = 'You are a helpful Australian construction advisor. In 1 sentence, explain why brick veneer is popular in Australia.';

async function testChat(label, url, headers, model) {
  const t = Date.now();
  try {
    const body = {
      model,
      messages: [{ role: 'user', content: PROMPT }],
      max_tokens: 150,
      temperature: 0.3,
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    const txt = await r.text();
    if (!r.ok) {
      let detail = txt.slice(0, 180);
      try { detail = JSON.parse(txt)?.message || JSON.parse(txt)?.error?.message || detail; } catch {}
      console.log(`  ❌  ${label}  HTTP ${r.status}: ${detail}`);
      return false;
    }
    let reply = '';
    try { reply = JSON.parse(txt)?.choices?.[0]?.message?.content || ''; } catch {}
    if (!reply.trim()) { console.log(`  ⚠️   ${label}  OK but empty content`); return false; }
    console.log(`  ✅  ${label}  (${Date.now() - t}ms)`);
    console.log(`      → ${reply.trim().slice(0, 120)}`);
    return true;
  } catch (e) {
    console.log(`  ❌  ${label}  ${e.message}`);
    return false;
  }
}

// ── Mistral ────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(55));
console.log('MISTRAL');
console.log('─'.repeat(55));
const mistralKey = process.env.MISTRAL_API_KEY;
const mistralH   = { Authorization: `Bearer ${mistralKey}` };
const MISTRAL_MODELS = [
  'mistral-small-latest',
  'open-mistral-nemo',
  'open-mistral-7b',
  'open-mixtral-8x7b',
  'mistral-large-latest',
];
let mistralBest = null;
for (const m of MISTRAL_MODELS) {
  const ok = await testChat(m, 'https://api.mistral.ai/v1/chat/completions', mistralH, m);
  if (ok && !mistralBest) { mistralBest = m; break; }
}

// ── Nvidia NIM ────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(55));
console.log('NVIDIA NIM');
console.log('─'.repeat(55));
const nvidiaKey = process.env.NVIDIA_API_KEY;
const nvidiaH   = { Authorization: `Bearer ${nvidiaKey}` };
const NVIDIA_MODELS = [
  'meta/llama-3.1-70b-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/llama-3.3-nemotron-super-49b-v1',
  'meta/llama-3.3-70b-instruct',
  'mistralai/mistral-large-2-instruct',
  'google/gemma-2-27b-it',
];
let nvidiaBest = null;
for (const m of NVIDIA_MODELS) {
  const ok = await testChat(m, 'https://integrate.api.nvidia.com/v1/chat/completions', nvidiaH, m);
  if (ok && !nvidiaBest) { nvidiaBest = m; break; }
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(55));
console.log('  RESULTS');
console.log('='.repeat(55));
console.log(`  Mistral : ${mistralBest ? `✅  ${mistralBest}` : '❌  none working'}`);
console.log(`  Nvidia  : ${nvidiaBest  ? `✅  ${nvidiaBest}`  : '❌  none working'}`);
console.log('='.repeat(55));
