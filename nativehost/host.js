// LinkedIn AI Reply - native messaging host.
// Chrome launches this on demand (no manual bridge, no window). It reads ONE
// length-prefixed JSON message on stdin, runs Claude Code (`claude -p`) on this
// computer, writes ONE length-prefixed JSON reply on stdout, then exits.
// Needs Node.js 18+ and Claude Code signed in with your Claude account.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const TIMEOUT_MS = 120000;
const isWin = process.platform === 'win32';

// ---------- native messaging framing (4-byte little-endian length + JSON) ----------
function readMessage() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let needed = null;
    process.stdin.on('data', (chunk) => {
      chunks.push(chunk);
      total += chunk.length;
      const buf = Buffer.concat(chunks, total);
      if (needed === null && buf.length >= 4) needed = buf.readUInt32LE(0);
      if (needed !== null && buf.length >= 4 + needed) {
        try { resolve(JSON.parse(buf.slice(4, 4 + needed).toString('utf8'))); }
        catch (e) { reject(e); }
      }
    });
    process.stdin.on('end', () => { if (needed === null) resolve(null); });
    process.stdin.on('error', reject);
  });
}

function writeMessage(obj) {
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  process.stdout.write(Buffer.concat([header, json]));
}

// ---------- run Claude Code ----------
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

async function health() {
  const { code, out, err } = await runCommand(['--version'], { timeout: 20000 });
  if (code !== 0) throw new Error(err || out || 'Could not run `claude --version`.');
  return { ok: true, claude: `Claude Code ${out}` };
}

// ---------- main: handle one message, reply, exit ----------
(async () => {
  try {
    const msg = await readMessage();
    if (!msg) { process.exit(0); return; }
    if (msg.type === 'health') {
      writeMessage(await health());
    } else if (msg.type === 'generate') {
      writeMessage({ ok: true, text: await generate(msg) });
    } else {
      writeMessage({ ok: false, error: `Unknown request type: ${msg.type}` });
    }
  } catch (e) {
    writeMessage({ ok: false, error: e.message || String(e) });
  }
  // Give stdout a tick to flush before exiting.
  process.stdout.once('drain', () => process.exit(0));
  setTimeout(() => process.exit(0), 200);
})();
