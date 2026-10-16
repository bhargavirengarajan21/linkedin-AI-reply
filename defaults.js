// Shared defaults (loaded by background, content script and options page).
// Personal details are NOT hard-coded here. Set them in the Settings page, or keep
// them in a git-ignored config.local.js (see config.local.example.js) which is merged
// in below. config.local.js is loaded before this file.
const DEFAULT_SETTINGS = Object.assign({
  provider: 'claudecode', // 'claudecode' (your Claude subscription, via local bridge) | 'anthropic' | 'openai'
  bridgeUrl: 'http://127.0.0.1:3917',
  claudeCodeModel: 'sonnet', // alias passed to `claude --model` (sonnet, opus, haiku) or a full model name; blank = Claude Code default
  anthropicKey: '',
  anthropicModel: 'claude-sonnet-5-5',
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
  myName: '',
  aboutMe: [
    'Add a few lines about yourself so replies can introduce you accurately.',
    'For example: your role and years of experience, your main tech stack, your location.',
    '',
    'Add your preferences here so replies can answer recruiter questions: remote/hybrid, locations, W2/C2C/FTE, rate or salary expectations, availability for calls, notice period.'
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
