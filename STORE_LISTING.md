# Chrome Web Store listing — copy/paste

Paste each block into the matching field in the Developer Dashboard draft for
`dist/linkedin-ai-reply-v1.2.5.zip`. Fields are grouped by dashboard tab.

---

## Store listing tab

**Item name**
AI Reply Drafts for LinkedIn

**Summary** (132 char max)
Drafts AI replies to your LinkedIn messages. Uses your Claude subscription or your own API key. You review and send — it never sends.

**Description**
AI Reply Drafts for LinkedIn adds a floating "✨ AI Reply" button above any
LinkedIn message box. Click it and the extension reads the open conversation and
drafts a reply into the box. It never sends anything — you review, edit, and
press Send yourself.

On LinkedIn profiles, a "✨ Draft message" button fills one of its outreach
templates (reach out, ask for a referral, application, follow-up, after
interview, and more — tailored sets for job seekers, founders, investors and
general networking) using the details on that profile.

How it talks to the AI — you pick one in Settings:
• Free hosted (default) — a small backend run by this extension provides the API
  key, rate-limited per IP address, so it works with no key and no setup.
• Your Claude subscription — runs Claude Code on your own computer, no API key.
  Requires a one-time local setup.
• Anthropic API key — paste your key; requests go straight to Anthropic.
• OpenAI API key — paste your key; requests go straight to OpenAI.

Privacy: the extension ships with no personal data. On the default free hosted
path, the text you draft from is sent to this extension's backend, which forwards
it to the AI provider on our key and returns the draft (it is not stored there).
On the Claude subscription and API-key paths, your request goes only to the AI
provider you chose and never to our server. The conversation text is treated as
untrusted and the model is told to ignore any instructions hidden inside it. Every
draft that mentions money or contact details is flagged for your review.

**YouTube video** (optional)
https://www.youtube.com/watch?v=H3J-Ux9NG-o

**Category**
Social & Communication  (alternative: Productivity)

**Language**
English

---

## Privacy tab

**Single purpose**
The extension has one purpose: to draft replies and outreach messages for the
user inside LinkedIn, which the user then reviews and sends manually.

**Permission justifications**

`storage`
Stores the user's own settings (their "About you" text, chosen provider, send-from
address) and a short per-contact recap, plus the user's API key if they choose the
API-key path. All of it stays in chrome.storage.local on the user's machine.

`nativeMessaging`
Only used for the optional "Claude subscription" provider. When the user selects
it, the extension sends the draft request to a small native helper the user
installs themselves (nativehost/install.bat), which runs their locally installed
Claude Code. This lets users who already pay for Claude draft replies without
pasting an API key. The helper is launched on demand and is not bundled or
auto-installed by the store; the API-key paths do not use this permission at all.

**Are you using remote code?**  → Select **"No, I am not using remote code."**
Justification (if a text box is shown):
The extension executes no remotely hosted code. All JavaScript is bundled in the
package. The extension only sends the user's request to an AI API and receives
plain text back (the drafted message) — it never fetches, evaluates, or injects
code from a remote source. The optional nativeMessaging path launches a program
the user already installed locally (Claude Code); no remote code is downloaded or
run.

`host_permissions: https://api.anthropic.com/*`
Used only when the user selects the "Anthropic API key" provider, to send the
draft request directly from the browser to the Anthropic API with the user's own
key. No request is made unless the user has entered a key and chosen this provider.

`host_permissions: https://api.openai.com/*`
Used only when the user selects the "OpenAI API key" provider, to send the draft
request directly from the browser to the OpenAI API with the user's own key. No
request is made unless the user has entered a key and chosen this provider.

`host_permissions: https://linkedin-ai-reply-jpyk.onrender.com/*` (and
`http://localhost:8787/*` for local development)
Used for the default "Free hosted" provider. The extension sends the draft request
(the "About you" text and the open conversation/profile text) to this backend, which
we operate; the backend forwards it to the AI provider on our key and returns the
drafted text. This lets users try the extension with no API key and no setup. The
request text is processed in memory to produce the reply and is not stored; the only
state kept server-side is a per-IP request/token counter for the daily free limit.
The localhost entry is only for developers running the backend on their own machine.

`content scripts on https://www.linkedin.com/*`
Needed to show the "AI Reply" / "Draft message" buttons, read the open
conversation or profile the user is viewing, and insert the drafted text into the
message box. The extension runs on LinkedIn only.

**Data usage disclosures** (check these boxes)
• The extension collects/handles: "Personal communications" (message content the
  user chooses to draft a reply to) and "Authentication information" (the user's
  own API key, stored locally).
• I do NOT sell or transfer user data to third parties (beyond the AI provider, and
  — on the default free hosted path — our own backend that relays the request to that
  provider).
• I do NOT use the data for anything unrelated to the single purpose.
• Message content is sent to generate the requested draft only. On the default free
  hosted path it goes to our backend, which relays it to the AI provider on our key
  and does not store it (only a per-IP rate-limit counter is kept). On the Claude
  subscription and API-key paths it goes only to the AI provider the user selected,
  never to our server.

**Privacy policy URL**
https://github.com/bhargavirengarajan21/linkedin-AI-reply/blob/master/PRIVACY_POLICY.md

---

## Assets you still need to produce (not text)

- **At least 1 screenshot**, 1280×800 or 640×400 PNG/JPEG. A shot of the ✨ AI Reply
  button + review panel on a LinkedIn thread is ideal.
- **Store icon** 128×128 — you already have icons/icon128.png.
- (Optional) small promo tile 440×280.
