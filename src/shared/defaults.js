// Shared defaults (loaded by background, content script and options page).
// Personal details are NOT hard-coded here. Set them in the Settings page, or keep
// them in a git-ignored config.local.js (see config.local.example.js) which is merged
// in below. config.local.js is loaded before this file.
const DEFAULT_SETTINGS = Object.assign({
  provider: 'hosted', // 'hosted' (free, no key — default) | 'claudecode' (your Claude subscription, via the native-messaging helper) | 'anthropic' | 'openai'
  claudeCodeModel: 'opus', // alias passed to `claude --model` (sonnet, opus, haiku) or a full model name; blank = Claude Code default
  hostedUrl: '', // base URL of the free hosted backend (server/). Model + key live on the server; this is the only client setting.
  anthropicKey: '',
  anthropicModel: 'claude-opus-4-8',
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
  userRole: 'candidate', // 'candidate' (job seeker) | 'founder' — picks which outreach templates are offered
  myName: '',
  aboutMe: [
    'Add a few lines about yourself so replies can introduce you accurately.',
    'For example: what you do, your background or focus areas, and your location.',
    '',
    'Add any preferences you want replies to rely on — how you like to be contacted, availability for a call, and (for job search) remote/hybrid, locations, employment type, rate or salary expectations, notice period.'
  ].join('\n'),
  whoYouAre: '', // the "I'm ___" line used in Reach out / Ask for a referral
  targetRole: '', // default role for No open position / Recruiter when none is given
  emailPersonal: '',
  skillStack: [
    'Backend: ...',
    'Frontend: ...',
    'Cloud/DevOps: ...',
    'Testing: ...'
  ].join('\n'),
  style: 'Warm, concise and professional. Usually 2-4 short sentences. Plain language, no emojis, no buzzwords, no em dashes. Match the other person\'s level of formality. Greet them by first name. No sign-off needed.'
}, (typeof LIAI_LOCAL_CONFIG !== 'undefined' && LIAI_LOCAL_CONFIG) || {});
