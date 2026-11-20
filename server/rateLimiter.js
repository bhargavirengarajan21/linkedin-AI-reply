// Per-IP daily budget, plus an overall daily cap across all IPs. Each IP gets a fixed
// number of requests and a token budget per calendar day (UTC); both reset at midnight UTC.
//
// A request slot is *reserved* before the provider call and only kept if the call succeeds
// (otherwise it's released). Reserving up front — rather than charging after the model
// answers — is what stops a burst of concurrent requests from all slipping past the limit
// before any of them has been counted. Tokens are added *after*, from the provider's
// reported usage.
//
// The store is in-memory: simple, zero-dependency, and fine for a single small instance.
// It does NOT survive a restart and is NOT shared across multiple instances — if you
// scale to more than one process/dyno, swap `store` for Redis (same get/set shape).

const DAY_MS = 24 * 60 * 60 * 1000;

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export function createRateLimiter({
  requestsPerDay,
  tokensPerDay,
  globalRequestsPerDay = Infinity,
  globalTokensPerDay = Infinity
}) {
  // ip -> { day, requests, tokens }
  const store = new Map();
  // Overall usage across every IP for the current UTC day — the global spend cap.
  let global = { day: todayKey(), requests: 0, tokens: 0 };

  // Opportunistic cleanup so the map can't grow forever from one-off IPs.
  let lastSweep = Date.now();
  function sweep(day) {
    if (Date.now() - lastSweep < DAY_MS) return;
    lastSweep = Date.now();
    for (const [ip, rec] of store) if (rec.day !== day) store.delete(ip);
  }

  function entry(ip) {
    const day = todayKey();
    let rec = store.get(ip);
    if (!rec || rec.day !== day) {
      rec = { day, requests: 0, tokens: 0 };
      store.set(ip, rec);
    }
    sweep(day);
    return rec;
  }

  function globalEntry() {
    const day = todayKey();
    if (global.day !== day) global = { day, requests: 0, tokens: 0 };
    return global;
  }

  return {
    // Reserve a request slot BEFORE the provider call. Counts the request immediately so
    // concurrent calls can't all race past the cap, and refuses once the per-IP or overall
    // daily budget is reached. Returns { ok } or { ok:false, reason, retryAfter }.
    // If the provider call later fails, call release(ip) to give the slot back.
    reserve(ip) {
      const rec = entry(ip);
      const g = globalEntry();
      if (rec.requests >= requestsPerDay) {
        return { ok: false, reason: 'requests', retryAfter: secondsUntilMidnightUTC() };
      }
      if (rec.tokens >= tokensPerDay) {
        return { ok: false, reason: 'tokens', retryAfter: secondsUntilMidnightUTC() };
      }
      if (g.requests >= globalRequestsPerDay || g.tokens >= globalTokensPerDay) {
        return { ok: false, reason: 'global', retryAfter: secondsUntilMidnightUTC() };
      }
      rec.requests += 1;
      g.requests += 1;
      return { ok: true };
    },

    // Give back a request slot reserved by reserve() when the provider call failed, so a
    // transient upstream error doesn't cost the caller one of their daily requests.
    release(ip) {
      const rec = entry(ip);
      const g = globalEntry();
      rec.requests = Math.max(0, rec.requests - 1);
      g.requests = Math.max(0, g.requests - 1);
    },

    // Add token usage after a successful provider call (the request itself was already
    // counted by reserve()).
    addTokens(ip, tokens) {
      const rec = entry(ip);
      const g = globalEntry();
      const n = Math.max(0, tokens | 0);
      rec.tokens += n;
      g.tokens += n;
    },

    // For the X-RateLimit-* response headers.
    remaining(ip) {
      const rec = entry(ip);
      return {
        requests: Math.max(0, requestsPerDay - rec.requests),
        tokens: Math.max(0, tokensPerDay - rec.tokens)
      };
    }
  };
}

export function secondsUntilMidnightUTC() {
  const now = new Date();
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.ceil((midnight - now.getTime()) / 1000);
}
