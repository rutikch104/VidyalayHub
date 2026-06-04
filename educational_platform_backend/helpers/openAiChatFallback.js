/**
 * Fallback when no demo Q&A match. Uses OPENAI_API_KEY if set.
 */

async function openAiChatFallback(userMessage) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return 'Thanks for your question. For details not covered in our knowledge base, please contact your team lead or admin.';
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise enterprise assistant (IoT, servers, mobile, QA, AI/data, PM, DevOps). Reply in at most 3 short sentences. If you lack specifics, direct the user to their manager or platform owner.',
          },
          { role: 'user', content: String(userMessage || '').slice(0, 4000) },
        ],
      }),
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      // eslint-disable-next-line no-console
      console.error('openAiChatFallback:', j?.error?.message || r.statusText);
      return 'Please contact your team lead or admin for assistance.';
    }
    const text = j?.choices?.[0]?.message?.content?.trim();
    return text || 'Please contact your team lead or admin for assistance.';
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('openAiChatFallback:', e.message || e);
    return 'Please contact your team lead or admin for assistance.';
  }
}

module.exports = { openAiChatFallback };
