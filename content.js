(() => {
  'use strict';
  if (window.__liaiLoaded) return;
  window.__liaiLoaded = true;
  console.log('[LinkedIn AI Reply] content script loaded (v1.2.3 — voice + memory + reply panel)');

  // Known LinkedIn message classes. Used when present; there is a generic fallback when they change.
  const SEL = {
    threadScope: ['.msg-overlay-conversation-bubble', '.msg-convo-wrapper', '.msg-thread', '.scaffold-layout__detail'],
    event: '.msg-s-message-list__event',
    eventFallback: '.msg-s-event-listitem',
    senderName: '.msg-s-message-group__name, .msg-s-message-group__profile-link',
    body: '.msg-s-event-listitem__body',
    headerName: '.msg-entity-lockup__entity-title, .msg-overlay-bubble-header__title, .msg-thread__link-to-profile'
  };
  const MSG_HINT = '.msg-form, [class*="msg-form"], [class*="msg-overlay"], [class*="msg-convo"], [class*="msg-thread"]';

  const INTENTS = [
    ['auto', 'Auto'],
    ['interested', 'Interested'],
    ['details', 'Ask for details'],
    ['decline', 'Politely decline'],
    ['thanks', 'Thank / acknowledge']
  ];
  const MAX_MESSAGES = 30;
  const MAX_CHARS = 9000;

  let myName = DEFAULT_SETTINGS.myName;
  chrome.storage.local.get({ myName: DEFAULT_SETTINGS.myName }, (s) => { myName = s.myName || ''; });
  chrome.storage.onChanged.addListener((c) => { if (c.myName) myName = c.myName.newValue || ''; });

  // ---------- helpers ----------
  const squash = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const norm = (s) => squash(s).toLowerCase();
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function isMe(name) {
    const a = norm(name);
    const b = norm(myName);
    return !!a && !!b && (a === b || a.startsWith(b) || b.startsWith(a));
  }

  function openOptions() {
    try { chrome.runtime.sendMessage({ type: 'openOptions' }); } catch (_) { /* ignore */ }
  }

  function toast(msg, onClick, ms = 8000) {
    const t = document.createElement('div');
    t.className = 'liai-toast liai-ui';
    t.textContent = msg;
    if (onClick) {
      t.classList.add('liai-click');
      t.addEventListener('click', () => { onClick(); t.remove(); });
    }
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  // ---------- which box are we in? ----------
  function editorRoot(el) {
    if (!el) return null;
    if (el.tagName === 'TEXTAREA') return el;
    if (!el.isContentEditable) return null;
    return el.closest('[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]') || el;
  }

  function isMessagingEditor(el) {
    const root = editorRoot(el);
    if (!root || root.closest('.liai-ui')) return false;
    if (root.closest(MSG_HINT)) return true;
    return location.pathname.startsWith('/messaging');
  }

  // ---------- read the conversation ----------
  function threadScope(editor) {
    for (const s of SEL.threadScope) {
      const el = editor.closest(s);
      if (el) return el;
    }
    return null;
  }

  function collectMessages(scope) {
    let items = scope.querySelectorAll(SEL.event);
    if (!items.length) items = scope.querySelectorAll(SEL.eventFallback);
    const out = [];
    let sender = '';
    items.forEach((li) => {
      const nameEl = li.querySelector(SEL.senderName);
      const name = nameEl && squash(nameEl.innerText);
      if (name) sender = name;
      li.querySelectorAll(SEL.body).forEach((b) => {
        const text = (b.innerText || '').trim();
        if (text) out.push({ sender: sender || 'Unknown', text });
      });
    });
    return out;
  }

  // Fallback when LinkedIn's classes changed: walk up from the box until we hit a container with real text.
  function rawConversationText(editor) {
    const own = (editor.innerText || editor.value || '').trim();
    // Start above the compose form so its button labels don't count as conversation text.
    const form = editor.closest('form');
    let node = (form && form.parentElement) || editor.parentElement;
    for (let i = 0; i < 18 && node && node !== document.body && node !== document.documentElement; i++) {
      const txt = (node.innerText || '').trim();
      if (txt.length - own.length > 40) {
        let raw = own ? txt.replace(own, '') : txt;
        raw = raw.replace(/\n{3,}/g, '\n\n').trim();
        return raw.length > 7000 ? raw.slice(-7000) : raw;
      }
      node = node.parentElement;
    }
    return '';
  }

  function otherPartyName(scope, msgs) {
    const el = scope && scope.querySelector(SEL.headerName);
    const t = el && squash((el.innerText || '').split('\n')[0]);
    if (t && !isMe(t)) return t;
    const m = msgs.find((x) => !isMe(x.sender) && x.sender !== 'Unknown');
    return m ? m.sender : '';
  }

  function buildTranscript(msgs) {
    const lines = msgs.slice(-MAX_MESSAGES).map((m) => `${isMe(m.sender) ? `${m.sender} (me)` : m.sender}: ${m.text}`);
    let t = lines.join('\n\n');
    while (t.length > MAX_CHARS && lines.length > 1) {
      lines.shift();
      t = lines.join('\n\n');
    }
    return t;
  }

  function readConversation(editor) {
    const scope = threadScope(editor) || editor.closest(MSG_HINT) || null;
    const msgs = scope ? collectMessages(scope) : [];
    if (msgs.length) return { transcript: buildTranscript(msgs), otherName: otherPartyName(scope, msgs) };
    const raw = rawConversationText(editor);
    if (!raw) return null;
    return {
      transcript: `(Raw text copied from the LinkedIn conversation panel. It may include names, timestamps and UI labels. Messages from ${myName || 'me'} are mine.)\n\n${raw}`,
      otherName: scope ? otherPartyName(scope, []) : ''
    };
  }

  // ---------- write into the box ----------
  function setEditorText(editor, text) {
    editor.focus();
    if (editor.tagName === 'TEXTAREA') {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(editor, text);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (_) { ok = false; }
    if (!ok || !(editor.innerText || '').trim()) {
      editor.innerHTML = text.split('\n').map((l) => `<p>${l ? escapeHtml(l) : '<br>'}</p>`).join('');
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
  }

  // ---------- floating UI (one instance, follows the focused message box) ----------
  const wrap = document.createElement('div');
  wrap.className = 'liai-wrap liai-ui';
  wrap.hidden = true;
  wrap.innerHTML = '<button type="button" class="liai-btn" title="Draft a reply with AI (Alt+R). If you typed a rough draft, it gets polished.">✨ AI Reply</button><button type="button" class="liai-caret" title="Reply options">▾</button>';
  const btn = wrap.querySelector('.liai-btn');
  const caret = wrap.querySelector('.liai-caret');

  const pop = document.createElement('div');
  pop.className = 'liai-pop liai-ui';
  pop.hidden = true;
  pop.innerHTML = `
    <label>Goal
      <select class="liai-intent">${INTENTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
    </label>
    <label>Ask <small>(optional)</small>
      <span class="liai-ask-row">
        <input class="liai-instr" type="text" placeholder="e.g. say I'm free Tue/Wed afternoons">
        <button type="button" class="liai-mic" title="Dictate with your voice">🎤</button>
      </span>
    </label>
    <div class="liai-row">
      <button type="button" class="liai-go">Generate reply</button>
      <a href="#" class="liai-settings">Settings</a>
    </div>
    <div class="liai-reply-out" hidden>
      <div class="liai-warn" hidden></div>
      <label>Generated reply
        <textarea class="liai-reply-text" rows="6"></textarea>
      </label>
      <div class="liai-reply-actions">
        <button type="button" class="liai-insert-reply">Insert into box</button>
        <button type="button" class="liai-copy-reply">Copy</button>
      </div>
    </div>`;
  const intentSel = pop.querySelector('.liai-intent');
  const instr = pop.querySelector('.liai-instr');
  const mic = pop.querySelector('.liai-mic');
  const replyOut = pop.querySelector('.liai-reply-out');
  const replyText = pop.querySelector('.liai-reply-text');
  const warnBox = pop.querySelector('.liai-warn');

  // Flag drafts that mention money or contact details, so a prompt-injection attempt
  // (e.g. a message/profile that tries to make the draft leak your rate or number) is caught on review.
  function sensitiveFlags(text) {
    const t = ` ${text || ''} `;
    const flags = [];
    if (/\$\s?\d|\d+\s?(?:\/|per\s)?\s?(?:hr|hour|yr|year|k\b)|\b\d{2,3}\s?(?:k|K)\b|\b(?:rate|salary|w2|c2c|compensation|per hour|per year)\b/i.test(t)) flags.push('money/rate');
    if (/\b(?:\+?\d[\d\-\s().]{7,}\d)\b/.test(t)) flags.push('phone number');
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) flags.push('email address');
    return flags;
  }

  function showFlags(text) {
    const flags = sensitiveFlags(text);
    if (!flags.length) { warnBox.hidden = true; warnBox.textContent = ''; return; }
    warnBox.hidden = false;
    warnBox.textContent = `⚠ This draft mentions ${flags.join(' and ')}. Double-check it's what you meant to share before sending.`;
  }

  document.documentElement.appendChild(wrap);
  document.documentElement.appendChild(pop);

  let cur = null;
  let busy = false;
  const lastGenerated = new WeakMap();

  function position() {
    if (!cur || !cur.isConnected) { hide(true); return; }
    const r = cur.getBoundingClientRect();
    if (!r.width && !r.height) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const w = wrap.offsetWidth || 130;
    const h = wrap.offsetHeight || 28;
    let top = r.top - h - 6;
    if (top < 8) top = Math.min(r.bottom + 6, window.innerHeight - h - 8);
    const left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8));
    wrap.style.top = `${top}px`;
    wrap.style.left = `${left}px`;
    if (!pop.hidden) {
      pop.style.left = `${Math.max(8, Math.min(left + w - 280, window.innerWidth - 288))}px`;
      pop.style.top = '';
      pop.style.bottom = `${window.innerHeight - top + 6}px`;
      if (top < 260) { pop.style.bottom = ''; pop.style.top = `${top + h + 6}px`; }
    }
  }

  let timer = null;
  function show(editor) {
    if (editor !== cur) { replyOut.hidden = true; replyText.value = ''; warnBox.hidden = true; warnBox.textContent = ''; }
    cur = editor;
    wrap.hidden = false;
    position();
    if (!timer) timer = setInterval(position, 300);
  }

  function hide(force) {
    if (!force && (busy || !pop.hidden)) return;
    wrap.hidden = true;
    pop.hidden = true;
    if (force) cur = null;
    if (timer) { clearInterval(timer); timer = null; }
  }

  function setBusy(b) {
    busy = b;
    btn.disabled = b;
    caret.disabled = b;
    btn.textContent = b ? 'Drafting…' : '✨ AI Reply';
  }

  async function run() {
    const editor = cur;
    if (busy || !editor) return;
    if (!(chrome.runtime && chrome.runtime.id)) return toast('The extension was updated. Refresh this LinkedIn tab (F5) and try again.');
    const convo = readConversation(editor);
    if (!convo) return toast("Couldn't read this conversation. Open the thread so its messages are visible, then try again.");

    const typed = (editor.value || editor.innerText || '').trim();
    const draft = typed && squash(typed) !== lastGenerated.get(editor) ? typed : '';

    setBusy(true);
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'generate',
        transcript: convo.transcript,
        otherName: convo.otherName,
        intent: intentSel.value,
        instruction: instr.value.trim(),
        draft
      });
      if (!res || !res.ok) throw new Error(res ? res.error : 'No response from the extension.');
      setEditorText(editor, res.text);
      lastGenerated.set(editor, squash(editor.value || editor.innerText));
      // Show the generated reply in the panel so you can review, edit, copy or re-insert it.
      replyText.value = res.text;
      showFlags(res.text);
      replyOut.hidden = false;
      pop.hidden = false;
    } catch (e) {
      let msg = e.message || String(e);
      if (/context invalidated|reading 'sendMessage'|reading 'local'/i.test(msg)) msg = 'The extension was reloaded. Refresh this LinkedIn tab.';
      toast(msg, /settings/i.test(msg) ? openOptions : null);
    } finally {
      setBusy(false);
      position();
    }
  }

  async function copyText(text, el) {
    try { await navigator.clipboard.writeText(text); } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) { /* ignore */ }
      ta.remove();
    }
    const old = el.textContent;
    el.textContent = 'Copied ✓';
    setTimeout(() => { el.textContent = old; }, 1500);
  }

  // ---------- voice dictation for the Ask field (Web Speech API) ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;
  let listening = false;
  {
    mic.addEventListener('mousedown', (e) => e.preventDefault());
    mic.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!SR) { toast('Voice input needs Chrome/Edge on desktop. Type your Ask instead.'); return; }
      if (listening) { recog && recog.stop(); return; }
      recog = new SR();
      recog.lang = navigator.language || 'en-US';
      recog.interimResults = false;
      recog.maxAlternatives = 1;
      recog.onstart = () => { listening = true; mic.classList.add('liai-mic-on'); mic.textContent = '⏺'; };
      recog.onerror = (ev) => { toast(ev.error === 'not-allowed' ? 'Microphone access was blocked. Allow it for LinkedIn in your browser settings.' : `Voice input error: ${ev.error}`); };
      recog.onend = () => { listening = false; mic.classList.remove('liai-mic-on'); mic.textContent = '🎤'; };
      recog.onresult = (ev) => {
        const said = Array.from(ev.results).map((r) => r[0].transcript).join(' ').trim();
        if (!said) return;
        instr.value = instr.value ? `${instr.value.trim()} ${said}` : said;
        instr.focus();
      };
      try { recog.start(); } catch (_) { /* already started */ }
    });
  }

  // Keep focus in the message box when clicking our buttons.
  [btn, caret].forEach((b) => b.addEventListener('mousedown', (e) => e.preventDefault()));
  btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); run(); });
  caret.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    pop.hidden = !pop.hidden;
    position();
    if (!pop.hidden) instr.focus();
  });
  pop.querySelector('.liai-go').addEventListener('click', run);
  pop.querySelector('.liai-insert-reply').addEventListener('mousedown', (e) => e.preventDefault());
  pop.querySelector('.liai-insert-reply').addEventListener('click', (e) => {
    e.preventDefault();
    if (!cur) return toast('Click into a LinkedIn message box first.');
    setEditorText(cur, replyText.value);
    lastGenerated.set(cur, squash(cur.value || cur.innerText));
  });
  pop.querySelector('.liai-copy-reply').addEventListener('click', (e) => { e.preventDefault(); copyText(replyText.value, e.target); });
  replyText.addEventListener('keydown', (e) => e.stopPropagation());
  replyText.addEventListener('input', () => showFlags(replyText.value));
  instr.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'Escape') { pop.hidden = true; if (cur) cur.focus(); }
  });
  pop.querySelector('.liai-settings').addEventListener('click', (e) => { e.preventDefault(); openOptions(); });

  document.addEventListener('focusin', (e) => {
    if (e.target.closest && e.target.closest('.liai-ui')) return;
    if (isMessagingEditor(e.target)) show(editorRoot(e.target));
  }, true);

  document.addEventListener('focusout', () => {
    setTimeout(() => {
      const a = document.activeElement;
      if (a && a.closest && a.closest('.liai-ui')) return;
      if (a && cur && (a === cur || cur.contains(a))) return;
      hide(false);
    }, 250);
  }, true);

  document.addEventListener('mousedown', (e) => {
    if (!pop.hidden && !(e.target.closest && e.target.closest('.liai-ui'))) pop.hidden = true;
  }, true);

  // Alt+R inside a message box drafts a reply.
  document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyR' && isMessagingEditor(document.activeElement)) {
      e.preventDefault();
      show(editorRoot(document.activeElement));
      run();
    }
  }, true);

  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);

  // One-time hint so you can tell the extension is running.
  try {
    if (!sessionStorage.getItem('liai-hello')) {
      sessionStorage.setItem('liai-hello', '1');
      toast('✨ LinkedIn AI Reply is on. Click into any message box to see the AI Reply button.', null, 5000);
    }
  } catch (_) { /* ignore */ }
})();
