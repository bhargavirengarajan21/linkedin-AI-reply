const FIELDS = Object.keys(DEFAULT_SETTINGS);
const $ = (id) => document.getElementById(id);

function showProvider() {
  const p = $('provider').value;
  document.querySelectorAll('.provider').forEach((el) => { el.hidden = el.dataset.provider !== p; });
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
    out.textContent = 'Checking the local bridge…';
    const h = await chrome.runtime.sendMessage({ type: 'bridgeHealth' }).catch((e) => ({ ok: false, error: e.message }));
    if (!h || !h.ok) { out.textContent = `Error: ${h ? h.error : 'no response'}`; return; }
    out.textContent = `Bridge OK (${h.info.claude || 'claude found'}). Generating a sample reply, this can take 10-20 seconds…`;
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

$('provider').addEventListener('change', showProvider);
$('save').addEventListener('click', save);
$('test').addEventListener('click', test);
$('clearMem').addEventListener('click', clearMem);
load();
showMemCount();
