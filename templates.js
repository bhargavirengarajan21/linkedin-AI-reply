// Outreach message templates. Only the [bracketed] blanks are ever replaced.
const LIAI_TEMPLATES = {
  cold: {
    label: 'Reach out (LinkedIn DM)',
    email: false,
    body: [
      'Hi [Name],',
      'I’m [who you are].',
      '[Why you’re reaching out — specific to them].',
      '[How you can help — tied to their problem or the job].',
      'Would you be open to [specific, low-effort ask]?'
    ]
  },
  askReferral: {
    label: 'Ask for a referral (LinkedIn DM)',
    email: false,
    body: [
      'Hi [Name],',
      'I’m [who you are].',
      '[Why you’re reaching out — specific to them].',
      '[How you can help — tied to their problem or the job].',
      'Would you be open to [specific, low-effort ask]?'
    ]
  },
  referral: {
    label: 'Referred by someone',
    email: true,
    subject: 'Referred by [Referrer] — [Job Title]',
    body: [
      'Hi [Name],',
      '[Referrer] suggested I reach out regarding the [Job Title] role at [Company].',
      'I have experience in [relevant skills] and would love to be considered.',
      'Resume attached.',
      '[Name]'
    ],
    senderLast: true
  },
  application: {
    label: 'Application',
    email: true,
    subject: 'Application for [Job Title] — [Your Name]',
    body: [
      'Hi [Name],',
      'I’m interested in the [Job Title] role at [Company].',
      'I have experience in [2–3 relevant skills] and believe I could be a good fit for the team.',
      'I’ve attached my resume for your consideration.'
    ]
  },
  noOpening: {
    label: 'No open position',
    email: true,
    subject: 'Opportunities at [Company] — [Your Name]',
    body: [
      'Hi [Name],',
      'I’m currently looking for [Job Title] opportunities and would love to explore roles at [Company].',
      'My experience includes [relevant skills].',
      'I’ve attached my resume in case there are any suitable'
    ],
    defaultRole: true
  },
  recruiter: {
    label: 'Recruiter networking',
    email: true,
    subject: 'Exploring [Job Role] Opportunities',
    body: [
      'Hi [Name],',
      'I came across your profile while looking for [Job Role] opportunities.',
      'I have experience in [relevant skills] and am currently exploring new roles.',
      'Would love to connect and hear about any'
    ],
    defaultRole: true
  },
  followup: {
    label: 'Follow-up',
    email: true,
    subject: 'Following up — [Job Title]',
    body: [
      'Hi [Name],',
      'Just following up on my application for the [Job Title] role submitted on [Date].',
      'I’m still very interested and would be happy to provide anything else you need.',
      '[Name]'
    ],
    senderLast: true
  },
  thanks: {
    label: 'After interview',
    email: true,
    subject: 'Thank You — [Your Name]',
    body: [
      'Hi [Name],',
      'Thank you for taking the time to speak with me about the [Job Title] role.',
      'I enjoyed learning more about the team and remain very interested in the opportunity.',
      'Looking forward to hearing about the next steps.'
    ]
  }
};

// v: { yourName, recipient, company, jobTitle, skills, referrer, date, whoYouAre, why, how, ask }
function liaiFillTemplate(key, v) {
  const t = LIAI_TEMPLATES[key];
  const body = t.body.slice();
  if (t.senderLast) body[body.length - 1] = v.yourName;
  else if (t.email) body.push(v.yourName);

  const map = {
    '[Your Name]': v.yourName,
    '[Name]': v.recipient || 'there',
    '[Company]': v.company,
    '[Job Title]': v.jobTitle,
    '[Job Role]': v.jobTitle,
    '[2–3 relevant skills]': v.skills,
    '[relevant skills]': v.skills,
    '[Referrer]': v.referrer,
    '[Date]': v.date,
    '[who you are]': v.whoYouAre,
    '[Why you’re reaching out — specific to them]': v.why,
    '[How you can help — tied to their problem or the job]': v.how,
    '[specific, low-effort ask]': v.ask
  };
  // Unknown values stay bracketed so they are easy to spot.
  const fill = (s) => s.replace(/\[[^\]]+\]/g, (m) => (map[m] ? map[m] : m));
  return {
    subject: t.subject ? fill(t.subject) : '',
    body: body.map(fill).join('\n\n')
  };
}
