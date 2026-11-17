// LinkedIn AI Reply — hosted backend.
//
// The extension's "Free hosted" provider POSTs { system, user } here. This server holds
// the owner's API key (from env), enforces a per-IP daily budget, forwards the request to
// Anthropic/OpenAI, and returns { text }. The extension never sees the key, and a client
// can't lift the per-IP limit because it's enforced here, not in the browser.

import express from 'express';
import cors from 'cors';
import { createRateLimiter, secondsUntilMidnightUTC } from './rateLimiter.js';
import { callProvider, ProviderError } from './provider.js';

// Parse a numeric env var, falling back only when it's unset or not a number
// (so an explicit 0 is honored, unlike `Number(x) || default`).
function numEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const PORT = numEnv('PORT', 8787);

// Which account the free tier bills to. Set exactly one key.
const PROVIDER = (process.env.PROVIDER || 'anthropic').toLowerCase();
const API_KEY = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '';
const MODEL = process.env.MODEL
  || (PROVIDER === 'openai' ? 'gpt-4o-mini' : 'claude-opus-4-8');
const MAX_TOKENS = numEnv('MAX_TOKENS', 600);

// Per-IP daily budget. Both reset at midnight UTC.
const REQUESTS_PER_DAY = numEnv('DAILY_REQUEST_LIMIT', 20);
const TOKENS_PER_DAY = numEnv('DAILY_TOKEN_LIMIT', 40000);

// Comma-separated allowlist of extension origins (chrome-extension://<id>). Empty = allow any.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

if (!API_KEY) {
  console.error('No API key set. Provide ANTHROPIC_API_KEY or OPENAI_API_KEY in the environment.');
  process.exit(1);
}

const limiter = createRateLimiter({
  requestsPerDay: REQUESTS_PER_DAY,
  tokensPerDay: TOKENS_PER_DAY
});

const app = express();

// Trust the hosting proxy (Render/Railway/Fly/etc.) so req.ip is the real client IP from
// X-Forwarded-For, not the proxy's. Without this, every request looks like one IP.
app.set('trust proxy', true);

app.use(express.json({ limit: '256kb' }));
app.use(cors({
  origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true,
  methods: ['POST', 'GET']
}));

function clientIp(req) {
  // req.ip respects trust proxy; strip IPv6-mapped IPv4 prefix for cleaner keys.
  return (req.ip || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

function setLimitHeaders(res, ip) {
  const rem = limiter.remaining(ip);
  res.set('X-RateLimit-Limit-Requests', String(REQUESTS_PER_DAY));
  res.set('X-RateLimit-Remaining-Requests', String(rem.requests));
  res.set('X-RateLimit-Limit-Tokens', String(TOKENS_PER_DAY));
  res.set('X-RateLimit-Remaining-Tokens', String(rem.tokens));
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    provider: PROVIDER,
    model: MODEL,
    limits: { requestsPerDay: REQUESTS_PER_DAY, tokensPerDay: TOKENS_PER_DAY }
  });
});

// Read-only view of THIS network's usage so far today. Does not charge anything —
// the extension calls it to show the free-tier alert (credits used + slicing math)
// before the user relies on the hosted tier.
app.get('/usage', (req, res) => {
  const ip = clientIp(req);
  const rem = limiter.remaining(ip);
  setLimitHeaders(res, ip);
  res.json({
    ok: true,
    provider: PROVIDER,
    model: MODEL,
    maxTokensPerReply: MAX_TOKENS,
    requests: { used: REQUESTS_PER_DAY - rem.requests, remaining: rem.requests, limit: REQUESTS_PER_DAY },
    tokens: { used: TOKENS_PER_DAY - rem.tokens, remaining: rem.tokens, limit: TOKENS_PER_DAY },
    resetsInSeconds: secondsUntilMidnightUTC()
  });
});

app.post('/generate', async (req, res) => {
  const ip = clientIp(req);
  const { system, user } = req.body || {};

  if (typeof system !== 'string' || typeof user !== 'string' || !user.trim()) {
    return res.status(400).json({ ok: false, error: 'Request must include "system" and "user" strings.' });
  }

  const gate = limiter.check(ip);
  setLimitHeaders(res, ip);
  if (!gate.ok) {
    res.set('Retry-After', String(gate.retryAfter));
    const hrs = Math.ceil(gate.retryAfter / 3600);
    const what = gate.reason === 'tokens' ? 'token' : 'request';
    return res.status(429).json({
      ok: false,
      error: `Daily free ${what} limit reached for your network. It resets in about ${hrs} hour(s), or add your own API key in Settings to remove this limit.`
    });
  }

  try {
    const { text, tokens } = await callProvider({
      provider: PROVIDER,
      apiKey: API_KEY,
      model: MODEL,
      system,
      user,
      maxTokens: MAX_TOKENS
    });
    limiter.charge(ip, tokens);
    setLimitHeaders(res, ip);
    return res.json({ ok: true, text });
  } catch (err) {
    // Don't charge the IP for an upstream failure.
    const status = err instanceof ProviderError && err.status >= 400 && err.status < 500 ? 502 : 502;
    console.error('generate failed:', err.message);
    return res.status(status).json({ ok: false, error: 'The hosted model is temporarily unavailable. Try again shortly.' });
  }
});

app.listen(PORT, () => {
  console.log(`LinkedIn AI Reply backend listening on :${PORT}`);
  console.log(`provider=${PROVIDER} model=${MODEL} limits=${REQUESTS_PER_DAY} req / ${TOKENS_PER_DAY} tok per IP/day`);
  console.log(`next daily reset in ~${Math.round(secondsUntilMidnightUTC() / 3600)}h (UTC)`);
});
