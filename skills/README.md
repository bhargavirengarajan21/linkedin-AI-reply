# Outreach skills

Each outreach **message type** is documented here as its own skill file — one folder per category, each with a generic, PII-free `SKILL.md` describing the template and its blanks.

These files are **documentation**. The runtime source of truth is [`templates.js`](../templates.js) (`LIAI_TEMPLATES`), which the extension loads to fill the blanks. Personal context (your name, intro, stack, emails) is defined in the app's **Settings** page or a git-ignored `config.local.js` — never hardcoded in these skills.

| Skill | `template_key` | Channel |
|---|---|---|
| [cold](cold/SKILL.md) — Reach out | `cold` | LinkedIn DM |
| [ask-referral](ask-referral/SKILL.md) — Ask for a referral | `askReferral` | LinkedIn DM |
| [reconnect](reconnect/SKILL.md) — Reconnect | `reconnect` | LinkedIn DM |
| [congratulate](congratulate/SKILL.md) — Congratulate | `congrats` | LinkedIn DM |
| [referral](referral/SKILL.md) — Referred by someone | `referral` | Email |
| [application](application/SKILL.md) — Application | `application` | Email |
| [no-opening](no-opening/SKILL.md) — No open position | `noOpening` | Email |
| [recruiter](recruiter/SKILL.md) — Recruiter networking | `recruiter` | Email |
| [follow-up](follow-up/SKILL.md) — Follow-up | `followup` | Email |
| [thank-you](thank-you/SKILL.md) — After interview | `thanks` | Email |

The first four (DMs) work for networking, reconnecting and congratulating as well as job search; the rest are job-search emails.
