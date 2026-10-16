// LinkedIn AI Reply – local bridge.
// Lets the Chrome extension use your Claude subscription by running Claude Code (`claude -p`) on this computer.
// Listens on 127.0.0.1 only. No dependencies: needs Node.js 18+ and Claude Code signed in with your Claude account.

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.LIAI_PORT || 3917);
const HOST = '127.0.0.1';
const TIMEOUT_MS = 120000;
const isWin = process.platform === 'win32';

function runCommand(args, { stdin = '', cwd = os.tmpdir(), timeout = TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    // On Windows, `claude` may be a .cmd shim, so go through the shell with a plain command string.
    const child = isWin
      ? spawn(['claude', ...args].join(' '), { cwd, shell: true, windowsHide: true })
      : spawn('claude', args, { cwd });
    let out = '';
    let err = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Claude Code took too long to answer (timed out).')); }, timeout);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error(e.code === 'ENOENT' ? 'The `claude` command was not found. Install Claude Code and make sure `claude` works in a terminal.' : e.message));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, out: out.trim(), err: err.trim() });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(stdin);
  });
}

async function generate({ system, user, model }) {
  if (!user) throw new Error('Empty request.');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liai-'));
  try {
    fs.writeFileSync(path.join(dir, 'system.txt'), system || 'Write a short, professional LinkedIn reply.');
    const args = [
      '-p',
      '--output-format', 'json',
      '--system-prompt-file', 'system.txt',
      '--tools', isWin ? '""' : '',
      '--disallowedTools', 'mcp__*',
      '--no-session-persistence',
      '--disable-slash-commands'
    ];
    if (model && /^[\w.\-]+$/.test(model)) args.push('--model', model);

    const { code, out, err } = await runCommand(args, { stdin: user, cwd: dir });
    let data = null;
    try { data = JSON.parse(out); } catch (_) {
      const line = out.split('\n').reverse().find((l) => l.trim().startsWith('{'));
      if (line) { try { data = JSON.parse(line); } catch (_) { /* ignore */ } }
    }
    if (data) {
      if (data.is_error) throw new Error(String(data.result || 'Claude Code reported an error.'));
      return String(data.result || '').trim();
    }
    if (code === 0 && out) return out;
    throw new Error(err || out || `claude exited with code ${code}`);
  } finally {
    fs.rm(dir, { recursive: true, force: true }, () => {});
  }
}

let versionCache = null;
async function health() {
  if (!versionCache) {
    const { code, out, err } = await runCommand(['--version'], { timeout: 20000 });
    if (code !== 0) throw new Error(err || out || 'Could not run `claude --version`.');
    versionCache = `Claude Code ${out}`;
  }
  return { ok: true, claude: versionCache };
}

function send(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  // Only the extension may call this. Web pages can't send the custom header without a CORS preflight,
  // and this server never approves preflights.
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') return send(res, 403, { ok: false, error: 'Forbidden' });
  if (req.headers['x-liai'] !== '1' || (origin && !origin.startsWith('chrome-extension://'))) {
    return send(res, 403, { ok: false, error: 'Forbidden' });
  }

  if (req.method === 'GET' && req.url === '/health') {
    health().then((h) => send(res, 200, h)).catch((e) => send(res, 500, { ok: false, error: e.message }));
    return;
  }

  if (req.method === 'POST' && req.url === '/generate') {
    let body = '';
    req.on('data', (d) => {
      body += d;
      if (body.length > 200000) req.destroy();
    });
    req.on('end', async () => {
      let payload;
      try { payload = JSON.parse(body || '{}'); } catch (_) { return send(res, 400, { ok: false, error: 'Bad JSON' }); }
      const started = Date.now();
      try {
        const text = await generate(payload);
        console.log(`[${new Date().toLocaleTimeString()}] reply drafted in ${((Date.now() - started) / 1000).toFixed(1)}s`);
        send(res, 200, { ok: true, text });
      } catch (e) {
        console.error(`[${new Date().toLocaleTimeString()}] error: ${e.message}`);
        send(res, 500, { ok: false, error: e.message });
      }
    });
    return;
  }

  send(res, 404, { ok: false, error: 'Not found' });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. The bridge may already be running in another window.`);
  else console.error(e.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`LinkedIn AI Reply bridge running on http://${HOST}:${PORT}`);
  console.log('Keep this window open while you use LinkedIn. Press Ctrl+C to stop.');
  health().then((h) => console.log(`Found ${h.claude}`)).catch((e) => console.error(`Warning: ${e.message}`));
});
