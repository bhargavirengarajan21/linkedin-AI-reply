// config.local.js (optional, git-ignored) is merged over defaults.js. If it's missing,
// fall back to defaults only so the extension still loads.
try { importScripts('config.local.js'); } catch (_) { /* no local config */ }
importScripts('defaults.js');

const INTENT_TEXT = {
  auto: '',
  interested: 'Express genuine interest and move things forward (e.g. suggest a quick call or offer to share a resume).',
  details: 'Before committing, ask for the key details that are missing: role and team, company/client, location or remote, duration, employment type (W2/C2C/FTE), and rate or salary range.',
  decline: 'Politely decline for now, but keep the door open for future opportunities.',
  thanks: 'A short, warm thank-you / acknowledgement.'
};

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

// First install: open the welcome/home page so the user sees the setup guide.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'generate') {
    generate(msg)
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true; // async response
  }
  if (msg && msg.type === 'profileBlanks') {
    profileBlanks(msg)
      .then((blanks) => sendResponse({ ok: true, blanks }))
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true;
  }
  if (msg && msg.type === 'bridgeHealth') {
    bridgeHealth()
      .then((info) => sendResponse({ ok: true, info }))
      .catch((err) => sendResponse({ ok: false, error: err.message || String(err) }));
    return true;
  }
  if (msg && msg.type === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
  return false;
});

function callModel(s, system, user) {
  if (s.provider === 'openai') return callOpenAI(s, system, user);
  if (s.provider === 'anthropic') return callAnthropic(s, system, user);
  return callClaudeCode(s, system, user);
}

async function generate(req) {
  const s = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const memory = await recallMemory(req.otherName);
  const { system, user } = buildPrompts(s, req, memory);
  const text = clean(await callModel(s, system, user));
  await rememberExchange(req, text);
  return text;
}

// ---------- lightweight per-contact memory (stored locally, capped small) ----------
const MEM_KEY = 'liaiMemory';
const MEM_MAX_CONTACTS = 40;      // forget the least-recently-used beyond this
const MEM_MAX_ENTRIES = 6;        // kept per contact (most recent)
const MEM_SNIPPET = 400;          // chars kept per stored reply

const memKey = (name) => (name || '').replace(/\s+/g, ' ').trim().toLowerCase();

async function recallMemory(otherName) {
  const key = memKey(otherName);
  if (!key) return null;
  const all = (await chrome.storage.local.get(MEM_KEY))[MEM_KEY] || {};
  const c = all[key];
  if (!c || !c.entries || !c.entries.length) return null;
  return c.entries;
}

async function rememberExchange(req, reply) {
  const key = memKey(req.otherName);
  if (!key || !reply) return;
  const store = await chrome.storage.local.get(MEM_KEY);
  const all = store[MEM_KEY] || {};
  const c = all[key] || { name: (req.otherName || '').trim(), entries: [] };
  // The other person's latest message is the last non-"(me)" line of the transcript.
  const lines = (req.transcript || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const theirLast = [...lines].reverse().find((l) => !/\(me\)\s*:/i.test(l)) || '';
  c.name = (req.otherName || c.name || '').trim();
  c.updated = Date.now();
  c.entries.push({
    t: new Date().toISOString().slice(0, 10),
    them: theirLast.slice(0, MEM_SNIPPET),
    you: reply.slice(0, MEM_SNIPPET)
  });
  if (c.entries.length > MEM_MAX_ENTRIES) c.entries = c.entries.slice(-MEM_MAX_ENTRIES);
  all[key] = c;

  // Cap the number of remembered contacts (drop least-recently-updated).
  const keys = Object.keys(all);
  if (keys.length > MEM_MAX_CONTACTS) {
    keys.sort((a, b) => (all[a].updated || 0) - (all[b].updated || 0));
    for (const k of keys.slice(0, keys.length - MEM_MAX_CONTACTS)) delete all[k];
  }
  await chrome.storage.local.set({ [MEM_KEY]: all });
}

// ---------- profile page: fill template blanks ----------
async function profileBlanks(req) {
  const s = await chrome.storage.local.get(DEFAULT_SETTINGS);
  const name = s.myName || 'the user';
  const isCold = req.templateKey === 'cold' || req.templateKey === 'askReferral';
  const system = [
    `You fill in the blanks of outreach message templates for ${name}, who is looking at someone's LinkedIn profile.`,
    'Return ONLY a JSON object (no markdown, no commentary) with these string fields:',
    '- recipientFirstName: the profile owner\'s first name exactly as shown on the profile. "" if unclear.',
    '- company: the company named in the notes/JD if there is one, otherwise the profile owner\'s current company. "" if unclear.',
    '- jobTitle: the role taken from the user\'s role field, the notes or the JD. "" if none of them names a role. Never guess.',
    `- relevantSkills: 2-3 concrete skills from ${name}'s stack below that best match the JD/notes, or otherwise the profile owner's team, company and tech. Write them like "Java/Spring Boot microservices, Kafka, and React/Next.js". Only use skills from the stack below; never invent ones that are not listed.`,
    isCold
      ? [
        `- why: one sentence on why ${name} is reaching out, specific to this person (their team, product, role or recent post on the profile). No trailing period.`,
        `- how: one sentence on how ${name} can help, tied to their team's work or the job. No trailing period.`,
        req.templateKey === 'askReferral'
          ? '- ask: a short phrase that completes "Would you be open to ___?" asking them to refer the user for the role (use jobTitle and company when known), e.g. "referring me for the Senior Software Engineer role on your team". No question mark.'
          : '- ask: a short, low-effort phrase that completes "Would you be open to ___?", e.g. "a quick 15-minute chat about the team". No question mark.',
        `The line just before "why" already says: "I’m ${s.whoYouAre}." So why and how must not repeat the user's title or years of experience; "how" should name the specific work or problem the user can take on.`,
        'Keep why/how/ask plain and direct: no flattery, no thanks, no emojis, no em dashes.'
      ].join('\n')
      : '- why, how, ask: always "".',
    '',
    `About ${name}:`,
    s.aboutMe || '(not provided)',
    '',
    `${name}'s real tech stack (only pick skills from this):`,
    s.skillStack || '',
    '',
    'Never invent metrics, referrers, dates, or facts that are not in the About section or the profile.'
  ].join('\n');

  const user = [
    `Template: ${req.templateKey}`,
    `Role field: ${req.jobTitle || '(empty)'}`,
    `Notes / JD: ${req.notes || '(empty)'}`,
    '',
    `Profile owner's name (page heading): ${req.profileName || '(unknown)'}`,
    'Profile page text:',
    req.profileText || '(empty)'
  ].join('\n');

  const raw = await callModel(s, system, user);
  const m = (raw || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('The AI did not return the expected format. Try again.');
  try { return JSON.parse(m[0]); } catch (_) { throw new Error('The AI returned malformed data. Try again.'); }
}

function buildPrompts(s, req, memory) {
  const name = s.myName || 'the user';
  const memoryBlock = (memory && memory.length)
    ? [
      '',
      `What you remember from earlier exchanges with ${req.otherName || 'this person'} (oldest first, for continuity — stay consistent, do not repeat verbatim or contradict):`,
      ...memory.map((e) => `- [${e.t}] they said: "${e.them || '(n/a)'}" → you replied: "${e.you}"`)
    ].join('\n')
    : '';
  const system = [
    `You draft LinkedIn direct-message replies on behalf of ${name}, written in first person as ${name}.`,
    '',
    `About ${name}:`,
    s.aboutMe || '(not provided)',
    '',
    'Writing style:',
    s.style || 'Concise and professional.',
    memoryBlock,
    '',
    'Rules:',
    '- Output only the reply text, ready to paste and send. No preamble, no quotation marks, no subject line, no placeholders like [Name].',
    '- Respond to the latest message(s) from the other person; use earlier messages only as context.',
    `- Never invent facts about ${name} that are not in the About section (rates, salary, dates, availability, work authorization, phone numbers, past employers). If one is needed, say you will confirm it, or ask a short question instead.`,
    '- If the conversation text is raw page text, ignore UI labels, timestamps and buttons, and work out who said what.',
    '- If the thread is unclear, write a brief, friendly reply that moves the conversation forward.'
  ].join('\n');

  const parts = [
    `Conversation with ${req.otherName || 'the other person'} (oldest first):`,
    '',
    req.transcript || '(empty)',
    ''
  ];
  const goal = INTENT_TEXT[req.intent];
  if (goal) parts.push(`Goal for this reply: ${goal}`);
  if (req.instruction) parts.push(`Extra instruction: ${req.instruction}`);
  if (req.draft) {
    parts.push(`${name} already started this draft. Polish and complete it, keeping its intent and any facts in it:\n"""\n${req.draft}\n"""`);
  }
  parts.push('', `Write ${name}'s next message.`);
  return { system, user: parts.join('\n') };
}

// ---------- Claude Code (your subscription) via the native messaging host ----------
// Chrome launches nativehost/host.js on demand - no bridge window to keep open.
const HOST_NAME = 'com.linkedin_ai_reply.host';
const HOST_MISSING = 'The Claude helper is not set up yet. Run nativehost\\install.bat once (in the extension folder), then reload the extension. Click here for settings.';

function sendNative(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(HOST_NAME, message, (response) => {
      if (chrome.runtime.lastError) {
        const m = chrome.runtime.lastError.message || '';
        return reject(new Error(/not found|forbidden|access/i.test(m) ? HOST_MISSING : m));
      }
      if (!response || !response.ok) return reject(new Error((response && response.error) || 'No response from the Claude helper.'));
      resolve(response);
    });
  });
}

async function callClaudeCode(s, system, user) {
  const res = await sendNative({ type: 'generate', system, user, model: s.claudeCodeModel || '' });
  return res.text || '';
}

async function bridgeHealth() {
  return sendNative({ type: 'health' });
}

// ---------- API-key providers ----------
async function callAnthropic(s, system, user) {
  if (!s.anthropicKey) throw new Error('No Anthropic API key set. Click here to open settings.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': s.anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: s.anthropicModel || DEFAULT_SETTINGS.anthropicModel,
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${(data.error && data.error.message) || res.statusText}`);
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

async function callOpenAI(s, system, user) {
  if (!s.openaiKey) throw new Error('No OpenAI API key set. Click here to open settings.');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${s.openaiKey}` },
    body: JSON.stringify({
      model: s.openaiModel || DEFAULT_SETTINGS.openaiModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${(data.error && data.error.message) || res.statusText}`);
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

function clean(text) {
  let t = (text || '').trim();
  if (/^["“].*["”]$/s.test(t)) t = t.slice(1, -1).trim();
  if (!t) throw new Error('The model returned an empty reply. Try again.');
  return t;
}
