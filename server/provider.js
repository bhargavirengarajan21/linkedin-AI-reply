// Server-side provider call. The API key lives here (in the server's environment),
// never in the extension. Mirrors the extension's own Anthropic/OpenAI calls so the
// drafted replies are identical whether the user brings their own key or uses this
// hosted tier. Returns { text, tokens } where tokens is the provider-reported usage
// (used to charge the per-IP budget).

const ANTHROPIC_VERSION = '2023-06-01';

export async function callProvider({ provider, apiKey, model, system, user, maxTokens }) {
  if (provider === 'openai') return callOpenAI({ apiKey, model, system, user, maxTokens });
  return callAnthropic({ apiKey, model, system, user, maxTokens });
}

async function callAnthropic({ apiKey, model, system, user, maxTokens }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data.error && data.error.message) || res.statusText;
    throw new ProviderError(`Anthropic API error ${res.status}: ${msg}`, res.status);
  }
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const u = data.usage || {};
  const tokens = (u.input_tokens || 0) + (u.output_tokens || 0);
  return { text, tokens };
}

async function callOpenAI({ apiKey, model, system, user, maxTokens }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data.error && data.error.message) || res.statusText;
    throw new ProviderError(`OpenAI API error ${res.status}: ${msg}`, res.status);
  }
  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  const tokens = (data.usage && data.usage.total_tokens) || 0;
  return { text, tokens };
}

export class ProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }
}
