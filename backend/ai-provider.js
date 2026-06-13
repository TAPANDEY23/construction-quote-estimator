/**
 * ai-provider.js — Multi-provider AI failover manager
 *
 * Providers: Groq · Gemini · Mistral · Nvidia NIM · Cerebras · OpenRouter
 *
 * Priority & models: edit  backend/ai-config.json  (hot-reloaded, no restart needed)
 * API keys:          edit  backend/.env             (never committed to git)
 *
 * All requests are logged to: backend/logs/ai-provider.log
 */

import { appendFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Paths ──────────────────────────────────────────────────────────────────
const __dirname   = dirname(fileURLToPath(import.meta.url));
const LOG_DIR     = join(__dirname, 'logs');
const LOG_FILE    = join(LOG_DIR, 'ai-provider.log');
const CONFIG_FILE = join(__dirname, 'ai-config.json');
try { mkdirSync(LOG_DIR, { recursive: true }); } catch (_) {}

// ── Logging ────────────────────────────────────────────────────────────────
let _reqId = 0;
function aiLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { appendFileSync(LOG_FILE, line + '\n'); } catch (_) {}
}

// ── Config reader (re-read on every request = hot-reload) ─────────────────
function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); }
  catch { return null; }
}

// ── Model resolver: ai-config.json → env var → built-in default ───────────
const MODEL_DEFAULTS = {
  groq:       'llama-3.3-70b-versatile',
  gemini:     'gemini-2.5-flash',
  mistral:    'mistral-small-latest',
  nvidia:     'nvidia/llama-3.1-nemotron-70b-instruct',
  cerebras:   'gpt-oss-120b',
  openrouter: 'google/gemma-4-31b-it:free',
};

function getModel(key) {
  const cfg   = readConfig();
  const entry = cfg?.providers?.find(p => p.name === key);
  if (entry?.model) return entry.model;
  return process.env[`${key.toUpperCase()}_MODEL`] || MODEL_DEFAULTS[key];
}

// ── Per-provider cooldown state ────────────────────────────────────────────
const _state = {};
function getState(key) {
  if (!_state[key]) _state[key] = { failures: 0, cooldownUntil: null };
  return _state[key];
}
function isReady(key) {
  const s = getState(key);
  if (!s.cooldownUntil) return true;
  if (Date.now() >= s.cooldownUntil) { s.cooldownUntil = null; s.failures = 0; return true; }
  return false;
}
function markFailed(key, httpStatus) {
  const s = getState(key);
  s.failures++;
  const ms = httpStatus === 429 ? 90_000 : httpStatus >= 500 ? 30_000 : s.failures >= 3 ? 300_000 : 15_000;
  s.cooldownUntil = Date.now() + ms;
  aiLog(`  ↳ ${key} cooldown: ${ms / 1000}s (failure #${s.failures})`);
}
function markSuccess(key) {
  const s = getState(key);
  s.failures = 0;
  s.cooldownUntil = null;
}

// ── Shared fetch helper ────────────────────────────────────────────────────
async function postJSON(url, headers, body, timeoutMs = 35_000) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err  = new Error(`HTTP ${res.status} — ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ── OpenAI-compatible adapter (Groq, Mistral, Nvidia, Cerebras, OpenRouter) ─
async function callOpenAILike({
  baseUrl, apiKey, model, extraHeaders = {},
  systemPrompt, messages, maxTokens, temperature, jsonMode,
}) {
  const body = {
    model,
    messages:    [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens:  maxTokens,
    temperature,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  };
  const data = await postJSON(baseUrl, { Authorization: `Bearer ${apiKey}`, ...extraHeaders }, body);
  return data.choices[0].message.content;
}

// ── Provider adapters ──────────────────────────────────────────────────────

async function callGroq(opts) {
  const key = process.env.GROQ_API_KEY;
  if (!key) { const e = new Error('GROQ_API_KEY not set'); e.status = 0; throw e; }
  return callOpenAILike({
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: key, model: getModel('groq'), ...opts,
  });
}

async function callGemini({ systemPrompt, messages, maxTokens, temperature, jsonMode }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { const e = new Error('GEMINI_API_KEY not set'); e.status = 0; throw e; }
  const model = getModel('gemini');
  const url   = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body  = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents:           normaliseForGemini(messages),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
      ...(jsonMode && { responseMimeType: 'application/json' }),
    },
  };
  const data      = await postJSON(url, {}, body);
  const candidate = data.candidates?.[0];
  if (!candidate) { const e = new Error('Gemini returned no candidates'); e.status = 500; throw e; }
  if (candidate.finishReason === 'SAFETY') { const e = new Error('Gemini safety filter triggered'); e.status = 422; throw e; }
  return candidate.content.parts[0].text;
}

function normaliseForGemini(messages) {
  const result = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const last = result[result.length - 1];
    if (last && last.role === role) { last.parts[0].text += '\n' + m.content; }
    else { result.push({ role, parts: [{ text: m.content }] }); }
  }
  if (result.length && result[0].role !== 'user') result.unshift({ role: 'user', parts: [{ text: '(start)' }] });
  return result;
}

async function callMistral(opts) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) { const e = new Error('MISTRAL_API_KEY not set'); e.status = 0; throw e; }
  return callOpenAILike({
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    apiKey: key, model: getModel('mistral'), ...opts,
  });
}

async function callNvidia(opts) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) { const e = new Error('NVIDIA_API_KEY not set'); e.status = 0; throw e; }
  return callOpenAILike({
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    apiKey: key, model: getModel('nvidia'), ...opts,
  });
}

async function callCerebras(opts) {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) { const e = new Error('CEREBRAS_API_KEY not set'); e.status = 0; throw e; }
  return callOpenAILike({
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    apiKey: key, model: getModel('cerebras'), ...opts,
  });
}

async function callOpenRouter(opts) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) { const e = new Error('OPENROUTER_API_KEY not set'); e.status = 0; throw e; }
  return callOpenAILike({
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: key, model: getModel('openrouter'),
    extraHeaders: { 'HTTP-Referer': 'https://homeygo.com.au', 'X-Title': 'Homeygo Construction Estimator' },
    ...opts,
  });
}

// ── Registry ───────────────────────────────────────────────────────────────
const REGISTRY = {
  groq:       { label: 'Groq',       fn: callGroq       },
  gemini:     { label: 'Gemini',     fn: callGemini     },
  mistral:    { label: 'Mistral',    fn: callMistral    },
  nvidia:     { label: 'Nvidia NIM', fn: callNvidia     },
  cerebras:   { label: 'Cerebras',   fn: callCerebras   },
  openrouter: { label: 'OpenRouter', fn: callOpenRouter },
};

// ── Priority list — reads ai-config.json on every call (hot-reload) ────────
function getPriorityList() {
  const cfg = readConfig();
  if (cfg?.providers) {
    return cfg.providers
      .filter(p => p.enabled !== false && REGISTRY[p.name])
      .map(p => p.name);
  }
  // Fallback: AI_PROVIDER_PRIORITY env var
  const raw = process.env.AI_PROVIDER_PRIORITY || 'groq,gemini,mistral,nvidia,cerebras,openrouter';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(k => REGISTRY[k]);
}

// ── Main export ────────────────────────────────────────────────────────────
/**
 * Send a chat request with automatic failover.
 * Priority order is read from ai-config.json on every call — edit it to reorder live.
 */
export async function aiChat({
  systemPrompt,
  messages,
  maxTokens   = 1024,
  temperature = 0.5,
  jsonMode    = false,
}) {
  const id       = ++_reqId;
  const t0       = Date.now();
  const priority = getPriorityList();
  const errors   = [];

  aiLog(`#${id} ── REQUEST START ── priority: [${priority.join(', ')}] | jsonMode: ${jsonMode} | maxTokens: ${maxTokens}`);

  for (const key of priority) {
    if (!isReady(key)) {
      const secsLeft = Math.ceil((getState(key).cooldownUntil - Date.now()) / 1000);
      aiLog(`#${id}   skip ${key} — cooldown ${secsLeft}s`);
      continue;
    }

    const model = getModel(key);
    aiLog(`#${id}   try  ${key} (${model})${errors.length ? ` [failover #${errors.length}]` : ''}`);
    const t1 = Date.now();

    try {
      const text = await REGISTRY[key].fn({ systemPrompt, messages, maxTokens, temperature, jsonMode });
      const ms   = Date.now() - t1;
      markSuccess(key);
      aiLog(`#${id} ✓ SUCCESS via ${key} in ${ms}ms | total: ${Date.now() - t0}ms${errors.length ? ` | failovers: ${errors.length}` : ''}`);
      return text;
    } catch (err) {
      const ms     = Date.now() - t1;
      const detail = err.message.slice(0, 200);
      aiLog(`#${id} ✗ FAIL  ${key} in ${ms}ms — ${detail}`);
      errors.push(`${key}(${err.status ?? 'ERR'}): ${detail}`);
      markFailed(key, err.status ?? 0);
    }
  }

  aiLog(`#${id} ✗ ALL PROVIDERS FAILED after ${Date.now() - t0}ms`);
  errors.forEach(e => aiLog(`#${id}   ${e}`));

  const allCooldown = priority.every(k => !isReady(k));
  throw new Error(
    allCooldown
      ? 'All AI providers are temporarily unavailable. Please try again in a moment.'
      : 'AI request failed across all providers. Check backend/logs/ai-provider.log for details.'
  );
}

// ── Status helper (GET /api/ai-status) ────────────────────────────────────
export function getProviderStatus() {
  const cfg    = readConfig();
  const cfgMap = Object.fromEntries((cfg?.providers || []).map(p => [p.name, p]));
  const keys   = {
    groq:       process.env.GROQ_API_KEY,
    gemini:     process.env.GEMINI_API_KEY,
    mistral:    process.env.MISTRAL_API_KEY,
    nvidia:     process.env.NVIDIA_API_KEY,
    cerebras:   process.env.CEREBRAS_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };

  return getPriorityList().map(key => {
    const s         = getState(key);
    const inCooldown = s.cooldownUntil && Date.now() < s.cooldownUntil;
    return {
      provider:         key,
      label:            REGISTRY[key].label,
      model:            getModel(key),
      configured:       !!keys[key],
      enabled:          cfgMap[key]?.enabled !== false,
      available:        !inCooldown,
      failures:         s.failures,
      cooldownSecsLeft: inCooldown ? Math.ceil((s.cooldownUntil - Date.now()) / 1000) : 0,
    };
  });
}
