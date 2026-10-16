---
name: cold-email
description: Writes short job-search cold emails for Bhargavi Rengarajan from 7 fixed templates (application, no open position, referral, follow-up, recruiter networking, thank-you after interview, cold outreach / LinkedIn note). Use this whenever she types a template keyword like "followup", "follow up", "apply", "referral", "recruiter", "thank you", "no opening", "cold", or "linkedin", or pastes a job description / company / recruiter name and wants an email or message. Always pick the matching template, keep its format exactly, and fill in the blanks.
---

# Cold Email Skill

The job is two steps, nothing more:

1. Pick the relevant template from the keyword or context.
2. Fill in the blanks and return the finished email in the exact template format.

Do not rewrite, reword, lengthen, shorten, or "improve" the templates. Keep every word exactly as written; only replace the [bracketed] blanks and add blank lines between lines.

## Step 1 — Pick the template

She says / context -> Template
- "apply", "application", pastes a JD with an open role -> 1. Direct application
- "no opening", "general", "interest", company with no posted role -> 2. No open position
- "referral", "referred by", names a referrer -> 3. Referral
- "followup", "follow up", "checking in", mentions an application date -> 4. Follow-up
- "recruiter", "networking", "connect" -> 5. Recruiter networking
- "thank you", "after interview", "thanks for the call" -> 6. After interview
- "cold", "linkedin", "hiring manager", "DM", "reach out" -> 7. Cold outreach (short message)

If the keyword is ambiguous, pick the closest match and write it. Do not ask which one.

## Step 2 — Fill in the blanks

**Always-known values (fill these every time)**
- [Your Name], and the sign-off [Name]: Bhargavi Rengarajan
- [who you are]: Senior Software Engineer with ~5 years of full-stack experience (Java/Spring Boot, React/Next.js)

**Values from the context she gives**
- [Company], [Job Title] / [Job Role]: take from the JD, message, or keyword line.
- [relevant skills] / [2–3 relevant skills]: pick 2–3 that appear in the JD AND in her real stack below. Name concrete tech, e.g. "Java/Spring Boot microservices, Kafka, and React/Next.js".
- [Name] (recipient), [Referrer], [Date]: use only if she provides them.

**Her real stack (only pull skills from here)**
- Backend: Java, Spring Boot, Node.js, Express, REST APIs, OpenAPI, Kafka, Redis, MongoDB, PostgreSQL, MySQL, Go
- Frontend: React, Next.js, TypeScript, JavaScript, Redux, GraphQL, Tailwind
- Cloud/DevOps: Docker, Kubernetes, Azure Pipelines, AWS, GCP, GitHub Actions, CI/CD
- Testing: Jest, React Testing Library, Cypress, JUnit
- AI: Claude, Gemini, Ollama, MCP (Model Context Protocol)

*Never use Python as a selling skill, even if the JD asks for it.*

**Rules for blanks**
- Never invent a recipient name, referrer, date, or metric. If one isn't given, leave the placeholder in brackets (e.g. [Date]) so she can spot it. Exception: unknown recipient name → Hi there,.
- Fill every blank you can; leave nothing bracketed that the context already answers.

**Send-from line**
Put one line above the email:
- C2C / corp-to-corp / contract role → Send from: bhargaviwork21@gmail.com
- Everything else → Send from: bhargavirengarajan21@gmail.com

**Output format (strict)**
- Send from: line, then Subject: line, then the body.
- One blank line between every line/section — greeting, each sentence line, sign-off, name. No dense blocks.
- Body stays 2–3 lines of content, same as the template.
- No thankful wording anywhere: no "Thanks," / "Thank you" / "Appreciate" sign-offs or sentences added. The email ends with just the name. (Template 6 keeps its own original wording as sent.)
- Output only the email. No explanation, no alternatives, no "want me to also…" question at the end.

## The templates (verbatim — do not change a single word)

Only the [bracketed] blanks get replaced. Every other word stays exactly as written below. Some templates end mid-way because that is where the original text ended; do not add or finish anything.
In templates 3 and 4, the last-line [Name] is the sender (Bhargavi Rengarajan); [Name] after "Hi" is the recipient.

### 1. Direct application
Subject: Application for [Job Title] — [Your Name]

Hi [Name],

I’m interested in the [Job Title] role at [Company].

I have experience in [2–3 relevant skills] and believe I could be a good fit for the team.

I’ve attached my resume for your consideration.

### 2. No open position
Subject: Opportunities at [Company] — [Your Name]

Hi [Name],

I’m currently looking for [Job Title] opportunities and would love to explore roles at [Company].

My experience includes [relevant skills].

I’ve attached my resume in case there are any suitable

### 3. Referral
Subject: Referred by [Referrer] — [Job Title]

Hi [Name],

[Referrer] suggested I reach out regarding the [Job Title] role at [Company].

I have experience in [relevant skills] and would love to be considered.

Resume attached.

[Name]

### 4. Follow-up
Subject: Following up — [Job Title]

Hi [Name],

Just following up on my application for the [Job Title] role submitted on [Date].

I’m still very interested and would be happy to provide anything else you need.

[Name]

### 5. Recruiter networking
Subject: Exploring [Job Role] Opportunities

Hi [Name],

I came across your profile while looking for [Job Role] opportunities.

I have experience in [relevant skills] and am currently exploring new roles.

Would love to connect and hear about any

### 6. After interview
Subject: Thank You — [Your Name]

Hi [Name],

Thank you for taking the time to speak with me about the [Job Title] role.

I enjoyed learning more about the team and remain very interested in the opportunity.

Looking forward to hearing about the next steps.

### 7. Cold outreach (LinkedIn note / hiring manager DM — no subject line)
Hi [Name],

I’m [who you are].

[Why you’re reaching out — specific to them].

[How you can help — tied to their problem or the job].

Would you be open to [specific, low-effort ask]?

## Example
Input: followup — Senior Java Developer at Discover, applied Sept 18

Output:

Send from: bhargavirengarajan21@gmail.com

Subject: Following up — Senior Java Developer

Hi there,

Just following up on my application for the Senior Java Developer role submitted on September 18.

I’m still very interested and would be happy to provide anything else you need.

Bhargavi Rengarajan