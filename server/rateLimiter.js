// Per-IP daily budget. Each IP gets a fixed number of requests and a token budget
// per calendar day (UTC); both reset at midnight UTC. Requests are checked *before*
// the provider call (so we never start a call an IP can't afford); tokens are charged
// *after*, from the provider's reported usage.
//
// The store is in-memory: simple, zero-dependency, and fine for a single small instance.
// It does NOT survive a restart and is NOT shared across multiple instances — if you
// scale to more than one process/dyno, swap `store` for Redis (same get/set shape).

const DAY_MS = 24 * 60 * 60 * 1000;

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export function createRateLimiter({ requestsPerDay, tokensPerDay }) {
  // ip -> { day, requests, tokens }
  const store = new Map();

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

  return {
    // Call before the provider request. Returns { ok } or { ok:false, reason, retryAfter }.
    check(ip) {
      const rec = entry(ip);
      if (rec.requests >= requestsPerDay) {
        return { ok: false, reason: 'requests', retryAfter: secondsUntilMidnightUTC() };
      }
      if (rec.tokens >= tokensPerDay) {
        return { ok: false, reason: 'tokens', retryAfter: secondsUntilMidnightUTC() };
      }
      return { ok: true };
    },

    // Call after a successful provider request to charge usage.
    charge(ip, tokens) {
      const rec = entry(ip);
      rec.requests += 1;
      rec.tokens += Math.max(0, tokens | 0);
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
