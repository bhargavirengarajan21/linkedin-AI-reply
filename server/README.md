# LinkedIn AI Reply — hosted backend

Small proxy that powers the extension's **Free hosted** provider. It holds *your* API key
server-side and enforces a **per-IP daily budget**, so anyone can use the extension with no
setup while you stay in control of cost. The limit is enforced here, not in the browser, so
it can't be bypassed by editing the extension.

## How it works

```
extension  ──POST /generate { system, user }──▶  this server  ──▶  Anthropic / OpenAI
           ◀──────── { text } ────────────────           (your key, never exposed)
```

- Each client IP gets `DAILY_REQUEST_LIMIT` requests and `DAILY_TOKEN_LIMIT` tokens per day.
- Requests are checked **before** the upstream call; tokens are charged **after**, from the
  provider's reported usage. Both reset at midnight **UTC**.
- Over budget → `429` with a `Retry-After` header and a friendly message telling the user to
  wait or add their own key.
- Every response carries `X-RateLimit-Remaining-Requests` / `-Tokens` headers.

## Run locally

```bash
cd server
npm install
cp .env.example .env     # then edit .env and set your key
npm start                # listens on http://localhost:8787
```

In the extension Settings, pick **Free hosted** and set the URL to `http://localhost:8787`
(already allowed in `manifest.json`).

Smoke-test without the browser:

```bash
curl http://localhost:8787/health
curl -X POST http://localhost:8787/generate \
  -H 'content-type: application/json' \
  -d '{"system":"You reply in one word.","user":"Say hi"}'
```

## Deploy

Any Node 18+ host works (Render, Railway, Fly.io, a VPS, etc.). Set the env vars from
`.env.example` in the host's dashboard. The server reads `PORT` automatically.

**Two things to do after you have a public URL:**

1. Add your backend origin to the extension's `manifest.json` → `host_permissions`, e.g.
   `"https://your-backend.example.com/*"`. MV3 requires this to be declared statically;
   without it the service worker's `fetch` is blocked. (`http://localhost:8787/*` is already
   there for local dev.)
2. Optionally set `ALLOWED_ORIGINS` to your published extension id
   (`chrome-extension://<id>`) so only your extension can call the backend.

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `PROVIDER` | `anthropic` | `anthropic` or `openai` — which account bills the free tier |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | — | the key matching `PROVIDER` (required) |
| `MODEL` | `claude-opus-4-8` / `gpt-4o-mini` | model override |
| `MAX_TOKENS` | `600` | max tokens generated per reply |
| `DAILY_REQUEST_LIMIT` | `20` | per-IP requests per day |
| `DAILY_TOKEN_LIMIT` | `40000` | per-IP tokens per day |
| `ALLOWED_ORIGINS` | *(any)* | comma-separated `chrome-extension://` allowlist |
| `PORT` | `8787` | listen port (most hosts set this) |

## Note on the in-memory limiter

The per-IP counters live in memory: zero dependencies, fine for a single small instance.
They reset on restart and are **not shared across instances**. If you scale past one
process, replace the `Map` in `rateLimiter.js` with Redis (same `get`/`set` shape) so the
budget is shared.
