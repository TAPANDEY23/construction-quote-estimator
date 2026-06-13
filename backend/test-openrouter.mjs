import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
readFileSync(join(__dirname, '.env'), 'utf8').split('\n').forEach(l => {
  const t = l.trim();
  if (!t || t[0] === '#') return;
  const i = t.indexOf('=');
  if (i < 0) return;
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
});

const PROMPT = 'You are a helpful Australian construction advisor. In 1 sentence, explain why brick veneer is popular in Australia.';

async function test(label, url, headers, body) {
  const t = Date.now();
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    const txt = await r.text();
    if (!r.ok) {
      console.log(`  ❌  ${label}: HTTP ${r.status} — ${txt.slice(0, 120)}`);
      return false;
    }
    let reply = '(no content)';
    try {
      const d = JSON.parse(txt);
      reply = d?.choices?.[0]?.message?.content || '(no message content)';
    } catch {}
    const preview = reply.trim().slice(0, 120);
    console.log(`  ✅  ${label} (${Date.now() - t}ms)`);
    console.log(`      → ${preview}`);
    return true;
  } catch (e) {
    console.log(`  ❌  ${label}: ${e.message}`);
    return false;
  }
}

const orKey = process.env.OPENROUTER_API_KEY;
const orH = { Authorization: `Bearer ${orKey}`, 'HTTP-Referer': 'https://homeygo.com.au', 'X-Title': 'Homeygo Test' };
const msgs = [{ role: 'user', content: PROMPT }];

console.log('\n── OpenRouter — testing best chat candidates ──────────────');
const OR_CANDIDATES = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'moonshotai/kimi-k2.6:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
];
let orBest = null;
for (const m of OR_CANDIDATES) {
  const ok = await test(m, 'https://openrouter.ai/api/v1/chat/completions', orH,
    { model: m, messages: msgs, max_tokens: 150, temperature: 0.3 });
  if (ok && !orBest) { orBest = m; }
}

console.log('\n── Cerebras — testing zai-glm-4.7 with real text ─────────');
const cbKey = process.env.CEREBRAS_API_KEY;
await test('cerebras/zai-glm-4.7', 'https://api.cerebras.ai/v1/chat/completions',
  { Authorization: `Bearer ${cbKey}` },
  { model: 'zai-glm-4.7', messages: msgs, max_tokens: 150, temperature: 0.3 });

console.log(`\nBest OpenRouter model for chat: ${orBest || 'none found'}`);

if (orBest) {
  // Auto-patch .env
  let env = readFileSync(join(__dirname, '.env'), 'utf8');
  env = env.replace(/^OPENROUTER_MODEL=.*$/m, `OPENROUTER_MODEL=${orBest}`);
  const { writeFileSync } = await import('fs');
  writeFileSync(join(__dirname, '.env'), env, 'utf8');
  console.log(`✓ .env updated: OPENROUTER_MODEL=${orBest}`);
}
