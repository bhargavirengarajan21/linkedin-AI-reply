const FIELDS = Object.keys(DEFAULT_SETTINGS);
const $ = (id) => document.getElementById(id);

function showProvider() {
  const p = $('provider').value;
  // Show only the detail blocks that belong to the selected provider.
  document.querySelectorAll('.provider-detail').forEach((el) => { el.hidden = el.dataset.provider !== p; });
  // Reflect the selection on the provider cards (selected = blue card + "Selected" flag).
  document.querySelectorAll('.provider-card').forEach((card) => {
    const on = card.dataset.provider === p;
    card.classList.toggle('selected', on);
    card.setAttribute('aria-checked', on ? 'true' : 'false');
    const flag = card.querySelector('.pc-flag');
    if (flag) {
      flag.classList.toggle('dot', !on);
      flag.textContent = on ? 'Selected' : '';
    }
  });
  if (p === 'hosted') renderFreeTierAlert();
}

function selectProvider(p) {
  if (!p || $('provider').value === p) { showProvider(); return; }
  $('provider').value = p;
  $('provider').dispatchEvent(new Event('change'));
}

function showTab(tab) {
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.page').forEach((pg) => { pg.hidden = pg.dataset.page !== tab; });
}

// The free-tier alert. Shown whenever the "Free hosted" provider is selected, because
// this tier spends the extension owner's API credits rather than the user's own key.
// It warns about that, shows how much of today's per-network budget is already used
// (live, from the backend — this read does NOT spend credits), and spells out the
// "slicing" math so the shared daily budget is transparent.
async function renderFreeTierAlert() {
  const box = $('freeTierAlert');
  if (!box) return;
  const base = ($('hostedUrl').value || '').trim().replace(/\/+$/, '');

  // Defaults mirror the server's out-of-the-box per-IP budget; overwritten by live data.
  let reqLimit = 20, tokLimit = 40000, maxPerReply = 600;
  let reqUsed = null, tokUsed = null, resetHrs = null, live = false;

  if (base) {
    try {
      const res = await fetch(`${base}/usage`);
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        reqLimit = d.requests.limit; tokLimit = d.tokens.limit;
        reqUsed = d.requests.used; tokUsed = d.tokens.used;
        maxPerReply = d.maxTokensPerReply || maxPerReply;
        resetHrs = Math.max(1, Math.round((d.resetsInSeconds || 0) / 3600));
        live = true;
      }
    } catch (_) { /* fall back to static math below */ }
  }

  const avg = Math.round(tokLimit / reqLimit);
  const pct = (used, limit) => (used == null ? 0 : Math.min(100, Math.round((used / limit) * 100)));
  const usageRow = (label, used, limit) => {
    const shown = used == null ? '—' : used.toLocaleString();
    return `<div class="usage"><b>${label}:</b> ${shown} / ${limit.toLocaleString()} used today` +
      `<div class="bar"><span style="width:${pct(used, limit)}%"></span></div></div>`;
  };

  box.innerHTML =
    `<h3>⚠️ Heads up: this free tier runs on the owner's credits</h3>` +
    `<p>The "Free hosted" option sends your requests to a backend that holds the extension ` +
    `owner's Anthropic API key, so <b>every reply you draft here is billed to the owner</b>, not to you. ` +
    `Please use it sparingly, or add your own key above to lift the limit.</p>` +
    (live
      ? `<p>Usage on your network today (resets in ~${resetHrs}h, midnight UTC):</p>`
      : `<p>Enter the hosted service URL above and it will show your network's live usage here. ` +
        `The default per-network budget is:</p>`) +
    usageRow('Requests', reqUsed, reqLimit) +
    usageRow('Tokens', tokUsed, tokLimit) +
    `<div class="math"><b>How the budget is sliced</b><br>` +
    `• Each <b>network</b> (your public IP address — everyone behind the same router/VPN shares it) ` +
    `gets <b>${reqLimit.toLocaleString()} requests</b> and <b>${tokLimit.toLocaleString()} tokens</b> per day.<br>` +
    `• <b>Tokens</b> = input (your "About you" text + the conversation) + output (the drafted reply), ` +
    `as reported by the model. Each reply is capped at <b>${maxPerReply.toLocaleString()} output tokens</b>.<br>` +
    `• That averages <b>~${avg.toLocaleString()} tokens per request</b> (${tokLimit.toLocaleString()} ÷ ${reqLimit.toLocaleString()}). ` +
    `A typical reply uses well under that, so the request count usually runs out first.<br>` +
    `• A reply is only counted if it succeeds — failed calls aren't charged.<br>` +
    `• You're blocked when you hit <b>either</b> limit, until both reset at <b>midnight UTC</b>.</div>`;
}

async function load() {
  const s = await chrome.storage.local.get(DEFAULT_SETTINGS);
  FIELDS.forEach((k) => { if ($(k)) $(k).value = s[k]; });
  showProvider();
}

async function save() {
  const s = {};
  FIELDS.forEach((k) => { if ($(k)) s[k] = $(k).value.trim(); });
  await chrome.storage.local.set(s);
  $('status').textContent = 'Saved ✓';
  setTimeout(() => { $('status').textContent = ''; }, 2000);
}

async function test() {
  await save();
  const out = $('testOut');
  out.style.display = 'block';

  if ($('provider').value === 'claudecode') {
    out.textContent = 'Checking the Claude helper…';
    const h = await chrome.runtime.sendMessage({ type: 'bridgeHealth' }).catch((e) => ({ ok: false, error: e.message }));
    if (!h || !h.ok) { out.textContent = `Error: ${h ? h.error : 'no response'}`; return; }
    out.textContent = `Helper OK (${h.info.claude || 'claude found'}). Generating a sample reply, this can take 10-20 seconds…`;
  } else {
    out.textContent = 'Generating a sample reply…';
  }

  const res = await chrome.runtime.sendMessage({
    type: 'generate',
    otherName: 'Priya (Recruiter)',
    transcript: 'Priya (Recruiter): Hi! I came across your profile and have a Senior Full Stack Engineer (Java/React) role with a fintech client in Chicago, hybrid. Would you be open to a quick chat this week?',
    intent: 'auto',
    instruction: '',
    draft: ''
  }).catch((e) => ({ ok: false, error: e.message }));
  out.textContent = res && res.ok ? `Sample reply:\n\n${res.text}` : `Error: ${res ? res.error : 'no response'}`;
}

// Turn an uploaded .txt/.md/.json file into stack text. JSON: a top-level array, or a
// `skills`/`stack` array/string, becomes one line per item; anything else loads as raw text.
function skillsFromFile(name, text) {
  if (/\.json$/i.test(name)) {
    try {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data
        : Array.isArray(data.skills) ? data.skills
          : Array.isArray(data.stack) ? data.stack
            : typeof data.skills === 'string' ? [data.skills]
              : null;
      if (arr) return arr.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n');
    } catch (_) { /* fall through to raw text */ }
  }
  return text;
}

function loadSkillFile(file) {
  const msg = $('skillFileMsg');
  if (file.size > 200 * 1024) { msg.textContent = 'That file is too large (max 200 KB).'; return; }
  const reader = new FileReader();
  reader.onload = () => {
    const out = skillsFromFile(file.name, String(reader.result || '')).trim();
    if (!out) { msg.textContent = 'That file was empty.'; return; }
    $('skillStack').value = out;
    msg.textContent = `Loaded ${file.name}. Review the stack above, then press Save.`;
  };
  reader.onerror = () => { msg.textContent = 'Could not read that file.'; };
  reader.readAsText(file);
}

// Query the hosted backend's /health and show its live provider, model and per-IP
// daily budget, so the free-tier limits are visible before you rely on them.
async function checkLimits() {
  const out = $('limitsOut');
  out.style.display = 'block';
  const setStatus = (txt) => { const p = $('hostedStatus'); if (p) p.textContent = txt; };
  const base = ($('hostedUrl').value || '').trim().replace(/\/+$/, '');
  if (!base) { out.textContent = 'Enter the hosted service URL above first.'; return; }
  out.textContent = 'Checking the hosted service…';
  try {
    const res = await fetch(`${base}/health`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) { out.textContent = `Service error ${res.status}. Check the URL.`; setStatus('Not connected'); return; }
    setStatus('Connected');
    const lim = data.limits || {};
    const reqs = lim.requestsPerDay != null ? `${lim.requestsPerDay} requests` : 'a request limit';
    const toks = lim.tokensPerDay != null ? `${Number(lim.tokensPerDay).toLocaleString()} tokens` : 'a token limit';
    out.innerHTML =
      `✓ Connected. Free tier: <b>${reqs}</b> and <b>${toks}</b> per network per day, resets midnight UTC.` +
      `<br>Powered by <b>${data.provider || 'the configured provider'}</b>` +
      (data.model ? ` (model <code>${data.model}</code>)` : '') + '.';
  } catch (_) {
    out.textContent = 'Could not reach the hosted service. Check the URL or try again later.';
    setStatus('Not connected');
  }
}

async function showMemCount() {
  const mem = (await chrome.storage.local.get('liaiMemory')).liaiMemory || {};
  const n = Object.keys(mem).length;
  $('memCount').textContent = n ? `Currently remembering ${n} ${n === 1 ? 'person' : 'people'}.` : 'Nothing remembered yet.';
}

async function clearMem() {
  await chrome.storage.local.remove('liaiMemory');
  await showMemCount();
  $('status').textContent = 'Memory cleared ✓';
  setTimeout(() => { $('status').textContent = ''; }, 2000);
}

document.querySelectorAll('.nav-item').forEach((b) => {
  b.addEventListener('click', () => showTab(b.dataset.tab));
});
document.querySelectorAll('.provider-card').forEach((card) => {
  card.addEventListener('click', () => selectProvider(card.dataset.provider));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectProvider(card.dataset.provider); }
  });
});

$('provider').addEventListener('change', showProvider);
$('save').addEventListener('click', save);
$('test').addEventListener('click', test);
$('clearMem').addEventListener('click', clearMem);
$('checkLimits').addEventListener('click', checkLimits);
$('hostedUrl').addEventListener('change', () => { if ($('provider').value === 'hosted') renderFreeTierAlert(); });
$('skillFile').addEventListener('change', (e) => { if (e.target.files[0]) loadSkillFile(e.target.files[0]); });
load();
showMemCount();
