/**
 * OpenAI-backed interview question generation, scoring, and session reports.
 */

const FALLBACK_QUESTIONS = {
  technical: [
    'Explain the difference between a stack and a queue with a real-world example.',
    'How would you design a rate limiter for an API?',
    'What is time complexity and how do you analyze an algorithm?',
    'Describe how you would debug a production outage.',
    'When would you choose SQL vs NoSQL for a new feature?',
  ],
  hr: [
    'Tell me about yourself and why you are interested in this role.',
    'Describe a time you worked under pressure and how you handled it.',
    'What is your greatest professional strength?',
    'Tell me about a conflict with a teammate and how you resolved it.',
    'Where do you see yourself in three years?',
  ],
  behavioral: [
    'Give an example of leadership when you were not the official lead.',
    'Describe a failure and what you learned from it.',
    'How do you prioritize when everything seems urgent?',
    'Tell me about feedback you received that changed your approach.',
    'Describe a situation where you had to persuade others.',
  ],
  coding: [
    'How would you find the first non-repeating character in a string?',
    'Explain Big-O for binary search vs linear search.',
    'What is a hash map and when is it the right tool?',
    'How do you test edge cases for array problems?',
    'Walk through how you would refactor duplicated logic in a codebase.',
  ],
  mock: [
    'Why should we hire you for this position?',
    'Explain a recent project you are proud of.',
    'How do you stay current with technology trends?',
    'Describe your approach to code reviews.',
    'What questions do you have for us?',
  ],
};

function parseJsonFromText(text) {
  if (!text) return null;
  const raw = String(text).trim();
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function chatJson(systemPrompt, userPrompt, { maxTokens = 800, temperature = 0.3 } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

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
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(userPrompt || '').slice(0, 12000) },
        ],
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[interviewLlmService]', j?.error?.message || r.statusText);
      return null;
    }
    const text = j?.choices?.[0]?.message?.content?.trim();
    return parseJsonFromText(text);
  } catch (e) {
    console.error('[interviewLlmService]', e.message || e);
    return null;
  }
}

function fallbackQuestions(category, count) {
  const bank = FALLBACK_QUESTIONS[category] || FALLBACK_QUESTIONS.technical;
  return bank.slice(0, count).map((prompt, i) => ({
    prompt,
    question_type: category,
    difficulty: 'medium',
    sort_order: i,
  }));
}

async function generateSessionQuestions({ category, difficulty, count, title }) {
  const n = Math.min(Math.max(Number(count) || 5, 3), 8);
  const system = `You are an expert interview coach. Return JSON only with shape:
{"questions":[{"prompt":"...","question_type":"...","difficulty":"easy|medium|hard"}]}
Generate exactly ${n} distinct interview questions for a ${title || category} interview.
Difficulty target: ${difficulty || 'medium'}. Questions must be answerable in 2-4 minutes each.`;

  const user = `Interview category: ${category}. Create ${n} questions.`;
  const parsed = await chatJson(system, user, { maxTokens: 1200 });
  const list = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (list.length >= 3) {
    return list.slice(0, n).map((q, i) => ({
      prompt: String(q.prompt || q.question || '').trim() || `Question ${i + 1}`,
      question_type: String(q.question_type || category).slice(0, 64),
      difficulty: String(q.difficulty || difficulty || 'medium').slice(0, 32),
      sort_order: i,
    }));
  }
  return fallbackQuestions(category, n);
}

function ruleBasedScore(answerText) {
  const len = String(answerText || '').trim().length;
  if (len < 20) return { score: 35, feedback: 'Your answer was very brief. Add structure, examples, and outcomes.' };
  if (len < 80) return { score: 58, feedback: 'Good start. Expand with a concrete example and measurable result.' };
  if (len < 200) return { score: 72, feedback: 'Solid answer. Strengthen impact by stating results and lessons learned.' };
  return { score: 82, feedback: 'Well-developed response. Polish delivery and keep answers concise under 2 minutes.' };
}

async function evaluateAnswer({ question, answerText, category }) {
  const system = `You are an interview evaluator. Return JSON only:
{"score":0-100,"feedback":"2-3 sentences","strengths":["..."],"improvements":["..."]}
Score fairly for ${category} interviews. Be constructive.`;

  const user = `Question: ${question}\n\nCandidate answer:\n${answerText}`;
  const parsed = await chatJson(system, user, { maxTokens: 450, temperature: 0.2 });
  if (parsed && typeof parsed.score === 'number') {
    const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    return {
      score,
      feedback: String(parsed.feedback || '').trim() || 'Thanks for your response.',
      feedback_json: {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      },
    };
  }
  const fb = ruleBasedScore(answerText);
  return {
    score: fb.score,
    feedback: fb.feedback,
    feedback_json: { strengths: [], improvements: ['Add STAR structure (Situation, Task, Action, Result).'] },
  };
}

async function generateSessionReport({ category, qaPairs }) {
  const system = `You are an interview coach. Return JSON only:
{"overall_score":0-100,"summary":"paragraph","analysis":{"strengths":["..."],"weaknesses":["..."],"recommendations":["..."]}}`;

  const condensed = qaPairs
    .map((q, i) => `Q${i + 1}: ${q.prompt}\nA: ${q.answer}\nScore: ${q.score ?? 'n/a'}`)
    .join('\n\n');
  const user = `Category: ${category}\n\nSession Q&A:\n${condensed}`;
  const parsed = await chatJson(system, user, { maxTokens: 900, temperature: 0.25 });
  if (parsed) {
    const overall = Math.max(0, Math.min(100, Math.round(Number(parsed.overall_score) || 0)));
    return {
      overall_score: overall,
      summary_feedback: String(parsed.summary || '').trim() || 'Session complete.',
      report_json: {
        analysis: {
          strengths: parsed.analysis?.strengths || [],
          weaknesses: parsed.analysis?.weaknesses || [],
          recommendations: parsed.analysis?.recommendations || [],
        },
      },
    };
  }

  const scores = qaPairs.map((q) => Number(q.score)).filter((s) => !Number.isNaN(s));
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  return {
    overall_score: avg,
    summary_feedback: 'Practice complete. Review each answer and refine structure using STAR.',
    report_json: {
      analysis: {
        strengths: ['You completed all questions.'],
        weaknesses: ['Some answers could use more specific examples.'],
        recommendations: ['Practice aloud and time yourself to 90–120 seconds per answer.'],
      },
    },
  };
}

const PRACTICE_BANK = {
  technical: [
    'What happens when you type a URL in the browser?',
    'Explain CAP theorem in simple terms.',
    'How do indexes speed up database queries?',
  ],
  hr: ['Why do you want to join our organization?', 'What motivates you at work?'],
  behavioral: ['Tell me about a time you had to learn something quickly.'],
  coding: ['Reverse a linked list — explain your approach.', 'Detect a cycle in a linked list.'],
  mock: ['Walk me through your resume highlights.'],
};

const COACHING_TIPS = {
  technical: [
    'Think aloud — interviewers want your reasoning process.',
    'Clarify constraints before diving into solutions.',
    'Use examples from projects you actually shipped.',
  ],
  hr: [
    'Use the STAR method: Situation, Task, Action, Result.',
    'Keep answers under two minutes unless asked to elaborate.',
    'Align your story with the role and company values.',
  ],
  behavioral: [
    'Pick recent, specific examples — avoid hypotheticals.',
    'Focus on your actions, not only the team outcome.',
    'End with what you learned or would do differently.',
  ],
  coding: [
    'State brute force first, then optimize.',
    'Discuss time and space complexity explicitly.',
    'Write clean variable names and test edge cases.',
  ],
  mock: [
    'Prepare 3 stories you can adapt to many questions.',
    'Have thoughtful questions ready for the interviewer.',
    'Practice with a timer to build pacing confidence.',
  ],
};

function getPracticeQuestions(category, difficulty) {
  const cat = PRACTICE_BANK[category] ? category : 'technical';
  const items = PRACTICE_BANK[cat] || PRACTICE_BANK.technical;
  return items.map((prompt, i) => ({
    id: `${cat}-${i}`,
    prompt,
    category: cat,
    difficulty: difficulty || 'medium',
  }));
}

function getCoachingTips(category) {
  const cat = COACHING_TIPS[category] ? category : 'technical';
  return (COACHING_TIPS[cat] || COACHING_TIPS.technical).map((tip, i) => ({ id: `${cat}-tip-${i}`, tip, category: cat }));
}

module.exports = {
  generateSessionQuestions,
  evaluateAnswer,
  generateSessionReport,
  getPracticeQuestions,
  getCoachingTips,
  fallbackQuestions,
};
