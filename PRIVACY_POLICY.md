# Privacy Policy — AI Reply Drafts for LinkedIn

_Last updated: 2026-10-19_

AI Reply Drafts for LinkedIn ("the extension") is a browser extension that drafts
reply and outreach messages inside LinkedIn for you to review and send. This policy
explains what the extension handles and where it goes.

## No server of our own
The extension has no backend. We do not operate any server, and we never receive,
store, or see your data. Everything happens in your browser or on your own computer.

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
text), and the short recap are sent to the AI provider **you have selected**:
- **Claude subscription (default):** the text goes to a native helper running on
  your own computer, which runs Claude Code; Claude Code sends it to Anthropic under
  your plan.
- **Anthropic API key:** sent directly from your browser to `api.anthropic.com`.
- **OpenAI API key:** sent directly from your browser to `api.openai.com`.

No data is sent to any server operated by the extension or its author. We do not
sell, rent, or share your data with anyone. Data handled by the AI provider you
chose is subject to that provider's own privacy policy:
- Anthropic: https://www.anthropic.com/legal/privacy
- OpenAI: https://openai.com/policies/privacy-policy

## Data retention and deletion
All data stored by the extension lives in your browser's local storage. You can
remove it at any time by clearing the extension's data or by uninstalling the
extension. Uninstalling deletes all locally stored settings, recaps, and keys.

## Contact
Questions: bhargavirengarajan21@gmail.com
