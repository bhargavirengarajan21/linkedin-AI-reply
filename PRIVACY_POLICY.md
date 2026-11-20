# Privacy Policy — AI Reply Drafts for LinkedIn

_Last updated: 2026-11-19_

AI Reply Drafts for LinkedIn ("the extension") is a browser extension that drafts
reply and outreach messages inside LinkedIn for you to review and send. This policy
explains what the extension handles and where it goes.

## Which AI path you choose decides where your data goes
The extension offers several providers, selectable in Settings. **By default it uses a
free hosted backend that we operate** (so it works with no API key and no setup). On
that default path, the text you ask it to draft from **is sent to our server**, which
forwards it to the AI provider on our key and returns the draft. We do not store that
text, and our key is never exposed to your browser; see "Where your data goes" below.

If you prefer not to send anything to our server, switch to one of the other providers
(your Claude subscription via a local helper, or your own Anthropic/OpenAI API key) —
on those paths nothing reaches any server we operate.

## What the extension handles
- **Your settings** — the "About you" text, chosen provider, and send-from address
  you enter. Stored locally in `chrome.storage.local` on your device.
- **A short per-contact recap** — a brief summary used to keep replies consistent.
  Stored locally in `chrome.storage.local`.
- **Your API key** (only if you choose an API-key provider) — stored locally in
  `chrome.storage.local`. It is never transmitted anywhere except, as an
  authentication header, to the AI provider you selected.
- **Message / profile content** — when you click "AI Reply" or "Draft message," the
  text of the open conversation or profile is read in order to generate a draft.

## Where your data goes
When you request a draft, your "About you" text, the open conversation (or profile
text), and the short recap are sent to the AI path **you have selected**:
- **Free hosted (default):** the text is sent to our backend (hosted at
  `linkedin-ai-reply-jpyk.onrender.com`), which forwards it to Anthropic on our API
  key and returns the draft. The text is processed in memory to generate the reply and
  is **not stored** on our server; we keep only a per-IP request/token counter to
  enforce the daily free limit. Our API key stays on the server and is never sent to
  your browser.
- **Claude subscription:** the text goes to a native helper running on your own
  computer, which runs Claude Code; Claude Code sends it to Anthropic under your plan.
  Nothing reaches our server.
- **Anthropic API key:** sent directly from your browser to `api.anthropic.com`.
  Nothing reaches our server.
- **OpenAI API key:** sent directly from your browser to `api.openai.com`. Nothing
  reaches our server.

Except for the free hosted path described above, no data is sent to any server
operated by the extension or its author. We do not sell, rent, or share your data
with anyone. Data handled by the AI provider is subject to that provider's own
privacy policy:
- Anthropic: https://www.anthropic.com/legal/privacy
- OpenAI: https://openai.com/policies/privacy-policy

## Data retention and deletion
All data stored by the extension lives in your browser's local storage. You can
remove it at any time by clearing the extension's data or by uninstalling the
extension. Uninstalling deletes all locally stored settings, recaps, and keys.

## Contact
Questions: bhargavirengarajan21@gmail.com
