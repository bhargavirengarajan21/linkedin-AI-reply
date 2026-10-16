// "✨ Draft message" panel on LinkedIn profile pages (/in/...).
(() => {
  'use strict';
  if (window.__liaiProfileLoaded) return;
  window.__liaiProfileLoaded = true;

  const isProfile = () => /^\/in\/[^/]+\/?$/.test(location.pathname) || /^\/in\/[^/]+\/(details|recent-activity)/.test(location.pathname);
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stripEnd = (s) => (s || '').trim().replace(/[.?!\s]+$/, '');

  // ---------- read the profile ----------
  function readProfile() {
    const main = document.querySelector('main') || document.body;
    const h1 = main.querySelector('h1');
    const name = h1 ? h1.innerText.trim().split('\n')[0] : '';
    let text = (main.innerText || '').replace(/\n{3,}/g, '\n\n').trim();
    if (text.length > 7000) text = text.slice(0, 7000);
    return { name, text };
  }

  // ---------- insert into an open LinkedIn box ----------
  function findTargetBox() {
    const dialogTa = document.querySelector('[role="dialog"] textarea');
    if (dialogTa && dialogTa.offsetParent) return dialogTa; // "Add a note" to a connection request
    const eds = [...document.querySelectorAll('.msg-form__contenteditable[contenteditable="true"], [class*="msg-form"] [contenteditable="true"], [class*="msg-overlay"] [contenteditable="true"]')]
      .filter((e) => e.offsetParent);
    return eds[eds.length - 1] || null;
  }

  function setBoxText(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA') {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (_) { ok = false; }
    if (!ok || !(el.innerText || '').trim()) {
      el.innerHTML = text.split('\n').map((l) => `<p>${l ? escapeHtml(l) : '<br>'}</p>`).join('');
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
  }

  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const old = btn.textContent;
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = old; }, 1500);
  }

  // ---------- UI ----------
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'liai-fab liai-ui';
  fab.textContent = '✨ Draft message';
  fab.hidden = true;

  const panel = document.createElement('div');
  panel.className = 'liai-panel liai-ui';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="liai-panel-head">
      <strong>Draft message</strong>
      <button type="button" class="liai-x" title="Close">✕</button>
    </div>
    <div class="liai-for"></div>
    <label>Message type
      <select class="liai-type">${Object.entries(LIAI_TEMPLATES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join('')}</select>
    </label>
    <label class="liai-f-referrer" hidden>Referred by
      <input class="liai-referrer" type="text" placeholder="Referrer's name">
    </label>
    <label class="liai-f-date" hidden>Applied on
      <input class="liai-date" type="text" placeholder="e.g. September 18">
    </label>
    <label>What to say / context <small>(optional)</small>
      <textarea class="liai-notes" rows="3" placeholder="e.g. mention we met at the Node meetup, keep it casual — or paste a JD"></textarea>
    </label>
    <button type="button" class="liai-generate">Generate</button>
    <div class="liai-out" hidden>
      <div class="liai-sendfrom"></div>
      <label class="liai-f-subject">Subject
        <input class="liai-subject" type="text">
      </label>
      <label>Message <small class="liai-count"></small>
        <textarea class="liai-body" rows="10"></textarea>
      </label>
      <div class="liai-actions">
        <button type="button" class="liai-copy-body">Copy message</button>
        <button type="button" class="liai-copy-all">Copy all</button>
        <button type="button" class="liai-insert">Insert into LinkedIn box</button>
      </div>
    </div>`;

  document.documentElement.appendChild(fab);
  document.documentElement.appendChild(panel);

  const q = (s) => panel.querySelector(s);
  const typeSel = q('.liai-type');
  const out = q('.liai-out');
  const bodyTa = q('.liai-body');
  const subjectIn = q('.liai-subject');
  const genBtn = q('.liai-generate');
  let current = { sendFrom: '' };

  function syncFields() {
    const k = typeSel.value;
    q('.liai-f-referrer').hidden = k !== 'referral';
    q('.liai-f-date').hidden = k !== 'followup';
  }

  function updateCount() {
    const n = bodyTa.value.length;
    q('.liai-count').textContent = LIAI_TEMPLATES[typeSel.value].email ? `${n} chars` : `${n} chars${n > 300 ? ' (over the 300 limit for connection notes; fine for messages)' : ''}`;
  }

  async function generate() {
    const key = typeSel.value;
    const t = LIAI_TEMPLATES[key];
    if (!(chrome.runtime && chrome.runtime.id)) {
      out.hidden = false;
      bodyTa.value = 'The extension was updated. Refresh this LinkedIn tab (F5) and try again.';
      return;
    }
    const profile = readProfile();
    const notes = q('.liai-notes').value.trim();

    genBtn.disabled = true;
    genBtn.textContent = 'Reading profile & drafting…';
    try {
      const s = await chrome.storage.local.get(DEFAULT_SETTINGS);
      const res = await chrome.runtime.sendMessage({
        type: 'profileBlanks',
        templateKey: key,
        profileName: profile.name,
        profileText: profile.text,
        jobTitle: '',
        notes
      });
      if (!res || !res.ok) throw new Error(res ? res.error : 'No response from the extension.');
      const b = res.blanks || {};
      const role = b.jobTitle || (t.defaultRole ? s.targetRole : '');
      const filled = liaiFillTemplate(key, {
        yourName: s.myName,
        recipient: (b.recipientFirstName || '').trim(),
        company: (b.company || '').trim(),
        jobTitle: role,
        skills: (b.relevantSkills || '').trim(),
        referrer: q('.liai-referrer').value.trim(),
        date: q('.liai-date').value.trim(),
        whoYouAre: s.whoYouAre,
        why: stripEnd(b.why),
        how: stripEnd(b.how),
        ask: stripEnd(b.ask)
      });
      current.sendFrom = t.email ? s.emailPersonal : '';
      q('.liai-sendfrom').textContent = current.sendFrom ? `Send from: ${current.sendFrom}` : '';
      q('.liai-sendfrom').hidden = !current.sendFrom;
      q('.liai-f-subject').hidden = !t.email;
      subjectIn.value = filled.subject;
      bodyTa.value = filled.body;
      out.hidden = false;
      updateCount();
    } catch (e) {
      let msg = e.message || String(e);
      if (/context invalidated|reading 'sendMessage'|reading 'local'/i.test(msg)) msg = 'The extension was reloaded. Refresh this LinkedIn tab.';
      out.hidden = false;
      q('.liai-sendfrom').hidden = true;
      q('.liai-f-subject').hidden = true;
      bodyTa.value = `Error: ${msg}`;
    } finally {
      genBtn.disabled = false;
      genBtn.textContent = 'Generate';
    }
  }

  function allText() {
    const parts = [];
    if (current.sendFrom) parts.push(`Send from: ${current.sendFrom}`);
    if (!q('.liai-f-subject').hidden && subjectIn.value) parts.push(`Subject: ${subjectIn.value}`);
    parts.push(bodyTa.value);
    return parts.join('\n\n');
  }

  fab.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      const p = readProfile();
      q('.liai-for').textContent = p.name ? `For ${p.name}` : '';
    }
  });
  q('.liai-x').addEventListener('click', () => { panel.hidden = true; });
  typeSel.addEventListener('change', () => { syncFields(); out.hidden = true; });
  genBtn.addEventListener('click', generate);
  bodyTa.addEventListener('input', updateCount);
  q('.liai-copy-body').addEventListener('click', (e) => copy(bodyTa.value, e.target));
  q('.liai-copy-all').addEventListener('click', (e) => copy(allText(), e.target));
  q('.liai-insert').addEventListener('click', (e) => {
    const box = findTargetBox();
    if (!box) {
      e.target.textContent = 'Open "Message" or "Add a note" first';
      setTimeout(() => { e.target.textContent = 'Insert into LinkedIn box'; }, 2500);
      return;
    }
    setBoxText(box, bodyTa.value);
  });
  panel.addEventListener('keydown', (e) => e.stopPropagation()); // keep LinkedIn shortcuts out of the panel
  syncFields();

  // LinkedIn is a single-page app: show the button only on profile pages, reset when the profile changes.
  let lastPath = '';
  setInterval(() => {
    const onProfile = isProfile();
    fab.hidden = !onProfile;
    if (!onProfile) panel.hidden = true;
    const slug = (location.pathname.match(/^\/in\/[^/]+/) || [''])[0];
    if (slug !== lastPath) {
      lastPath = slug;
      out.hidden = true;
      q('.liai-for').textContent = '';
    }
  }, 800);
})();
