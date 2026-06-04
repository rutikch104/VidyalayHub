const db = require('../database/index');
const { Op } = require('sequelize');
const { mergeTenantWhere } = require('../utils/tenantScope');
const {
  generateSessionQuestions,
  evaluateAnswer,
  generateSessionReport,
  getPracticeQuestions,
  getCoachingTips,
} = require('../services/interviewLlmService');

function ok(res, data) {
  return res.status(200).json({ status: true, data });
}

function fail(res, status, message) {
  return res.status(status).json({ status: false, message });
}

function userId(req) {
  return req.user?.id;
}

function formatType(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    id: plain.id,
    title: plain.title,
    description: plain.description || '',
    type: plain.slug || plain.category,
    difficulty: plain.difficulty,
    duration: `${plain.duration_minutes} min`,
    questions: plain.question_count,
  };
}

async function loadOwnedSession(sessionId, reqUser) {
  const session = await db.InterviewSession.findOne({
    where: mergeTenantWhere({ id: sessionId, user_id: reqUser.id }, reqUser),
    include: [{ model: db.InterviewType, as: 'type' }],
  });
  return session;
}

exports.getTypes = async (req, res) => {
  try {
    const tid = req.user?.tenant_id || null;
    const where = {
      is_active: true,
      [Op.or]: [{ tenant_id: null }, ...(tid ? [{ tenant_id: tid }] : [])],
    };
    const types = await db.InterviewType.findAll({
      where,
      order: [
        ['sort_order', 'ASC'],
        ['title', 'ASC'],
      ],
    });
    return ok(res, { types: types.map(formatType) });
  } catch (e) {
    console.error('getTypes:', e);
    return fail(res, 500, 'Failed to load interview types.');
  }
};

exports.startInterview = async (req, res) => {
  const typeId = req.body?.type_id || req.body?.typeId;
  if (!typeId) return fail(res, 400, 'type_id is required.');

  const transaction = await db.sequelize.transaction();
  try {
    const tid = req.user?.tenant_id || null;
    const interviewType = await db.InterviewType.findOne({
      where: {
        id: typeId,
        is_active: true,
        [Op.or]: [{ tenant_id: null }, ...(tid ? [{ tenant_id: tid }] : [])],
      },
      transaction,
    });
    if (!interviewType) {
      await transaction.rollback();
      return fail(res, 404, 'Interview type not found.');
    }

    const plainType = interviewType.get({ plain: true });
    const questionRows = await generateSessionQuestions({
      category: plainType.slug || plainType.category,
      difficulty: plainType.difficulty,
      count: plainType.question_count,
      title: plainType.title,
    });

    const session = await db.InterviewSession.create(
      {
        user_id: userId(req),
        tenant_id: req.user?.tenant_id || null,
        type_id: plainType.id,
        status: 'in_progress',
        current_question_index: 0,
      },
      { transaction },
    );

    const createdQuestions = [];
    for (const q of questionRows) {
      const row = await db.InterviewQuestion.create(
        {
          session_id: session.id,
          sort_order: q.sort_order,
          prompt: q.prompt,
          question_type: q.question_type,
          difficulty: q.difficulty,
        },
        { transaction },
      );
      createdQuestions.push(row);
    }

    await transaction.commit();

    const first = createdQuestions[0];
    return ok(res, {
      session_id: session.id,
      message: 'Interview started.',
      total_questions: createdQuestions.length,
      first_question: first
        ? {
            id: first.id,
            prompt: first.prompt,
            question_type: first.question_type,
            difficulty: first.difficulty,
            sort_order: first.sort_order,
          }
        : null,
    });
  } catch (e) {
    await transaction.rollback();
    console.error('startInterview:', e);
    return fail(res, 500, 'Failed to start interview.');
  }
};

exports.getRecentSessions = async (req, res) => {
  try {
    const sessions = await db.InterviewSession.findAll({
      where: mergeTenantWhere({ user_id: userId(req) }, req.user),
      include: [{ model: db.InterviewType, as: 'type', attributes: ['title', 'slug'] }],
      order: [['created_at', 'DESC']],
      limit: 10,
    });

    const payload = sessions.map((s) => {
      const p = s.get({ plain: true });
      return {
        id: p.id,
        interview_type: p.type?.title || p.type?.slug || 'Interview',
        created_at: p.created_at,
        score: p.overall_score != null ? `${Math.round(Number(p.overall_score))}%` : null,
        status: p.status === 'completed' ? 'completed' : 'in-progress',
        feedback: p.summary_feedback || null,
      };
    });
    return ok(res, { sessions: payload });
  } catch (e) {
    console.error('getRecentSessions:', e);
    return fail(res, 500, 'Failed to load recent sessions.');
  }
};

exports.getStats = async (req, res) => {
  try {
    const where = mergeTenantWhere({ user_id: userId(req) }, req.user);
    const sessions = await db.InterviewSession.findAll({
      where,
      attributes: ['id', 'status', 'overall_score', 'created_at'],
      order: [['created_at', 'ASC']],
    });

    const completed = sessions.filter((s) => s.status === 'completed');
    const scores = completed
      .map((s) => Number(s.overall_score))
      .filter((n) => !Number.isNaN(n));
    const averageScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const sessionIds = sessions.map((s) => s.id);
    const answerCount = sessionIds.length
      ? await db.InterviewAnswer.count({ where: { session_id: { [Op.in]: sessionIds } } })
      : 0;

    let improvementRate = 0;
    if (scores.length >= 2) {
      const mid = Math.floor(scores.length / 2);
      const early = scores.slice(0, mid);
      const late = scores.slice(mid);
      const avgEarly = early.reduce((a, b) => a + b, 0) / early.length;
      const avgLate = late.reduce((a, b) => a + b, 0) / late.length;
      improvementRate = Math.max(0, Math.round(avgLate - avgEarly));
    }

    return ok(res, {
      totalSessions: sessions.length,
      averageScore,
      totalQuestions: answerCount,
      improvementRate,
    });
  } catch (e) {
    console.error('getStats:', e);
    return fail(res, 500, 'Failed to load interview stats.');
  }
};

exports.getSessionQuestions = async (req, res) => {
  try {
    const session = await loadOwnedSession(req.params.sessionId, req.user);
    if (!session) return fail(res, 404, 'Session not found.');

    const questions = await db.InterviewQuestion.findAll({
      where: { session_id: session.id },
      include: [{ model: db.InterviewAnswer, as: 'answer', required: false }],
      order: [['sort_order', 'ASC']],
    });

    const payload = questions.map((q) => {
      const p = q.get({ plain: true });
      return {
        id: p.id,
        prompt: p.prompt,
        question_type: p.question_type,
        difficulty: p.difficulty,
        sort_order: p.sort_order,
        answered: Boolean(p.answer),
        answer: p.answer?.answer_text || null,
        score: p.answer?.score != null ? Number(p.answer.score) : null,
        feedback: p.answer?.feedback_text || null,
      };
    });
    return ok(res, { questions: payload, session_status: session.status });
  } catch (e) {
    console.error('getSessionQuestions:', e);
    return fail(res, 500, 'Failed to load questions.');
  }
};

exports.submitAnswer = async (req, res) => {
  const answerText = String(req.body?.answer || '').trim();
  if (!answerText) return fail(res, 400, 'answer is required.');

  try {
    const session = await loadOwnedSession(req.params.sessionId, req.user);
    if (!session) return fail(res, 404, 'Session not found.');
    if (session.status === 'completed') return fail(res, 400, 'Session already completed.');

    const question = await db.InterviewQuestion.findOne({
      where: { id: req.params.questionId, session_id: session.id },
    });
    if (!question) return fail(res, 404, 'Question not found.');

    const existing = await db.InterviewAnswer.findOne({ where: { question_id: question.id } });
    if (existing) return fail(res, 400, 'Question already answered.');

    const category = session.type?.slug || session.type?.category || 'technical';
    const evaluation = await evaluateAnswer({
      question: question.prompt,
      answerText,
      category,
    });

    await db.InterviewAnswer.create({
      question_id: question.id,
      session_id: session.id,
      answer_text: answerText,
      score: evaluation.score,
      feedback_text: evaluation.feedback,
      feedback_json: evaluation.feedback_json,
    });

    const allQuestions = await db.InterviewQuestion.findAll({
      where: { session_id: session.id },
      include: [{ model: db.InterviewAnswer, as: 'answer', required: false }],
      order: [['sort_order', 'ASC']],
    });
    const answeredCount = allQuestions.filter((q) => q.answer).length;
    const nextUnanswered = allQuestions.find((q) => !q.answer);

    await session.update({
      current_question_index: answeredCount,
    });

    return ok(res, {
      feedback: evaluation.feedback,
      score: evaluation.score,
      strengths: evaluation.feedback_json?.strengths || [],
      improvements: evaluation.feedback_json?.improvements || [],
      session_complete: !nextUnanswered,
      next_question_id: nextUnanswered?.id || null,
      answered_count: answeredCount,
      total_questions: allQuestions.length,
    });
  } catch (e) {
    console.error('submitAnswer:', e);
    return fail(res, 500, 'Failed to submit answer.');
  }
};

exports.completeSession = async (req, res) => {
  try {
    const session = await loadOwnedSession(req.params.sessionId, req.user);
    if (!session) return fail(res, 404, 'Session not found.');
    if (session.status === 'completed') {
      return ok(res, {
        score: session.overall_score != null ? Number(session.overall_score) : 0,
        feedback: session.summary_feedback || 'Session already completed.',
      });
    }

    const questions = await db.InterviewQuestion.findAll({
      where: { session_id: session.id },
      include: [{ model: db.InterviewAnswer, as: 'answer', required: false }],
      order: [['sort_order', 'ASC']],
    });

    const qaPairs = questions.map((q) => {
      const p = q.get({ plain: true });
      return {
        prompt: p.prompt,
        answer: p.answer?.answer_text || '(no answer)',
        score: p.answer?.score != null ? Number(p.answer.score) : null,
      };
    });

    const category = session.type?.slug || 'technical';
    const report = await generateSessionReport({ category, qaPairs });

    await session.update({
      status: 'completed',
      overall_score: report.overall_score,
      summary_feedback: report.summary_feedback,
      report_json: report.report_json,
      completed_at: new Date(),
    });

    return ok(res, {
      score: report.overall_score,
      feedback: report.summary_feedback,
    });
  } catch (e) {
    console.error('completeSession:', e);
    return fail(res, 500, 'Failed to complete session.');
  }
};

exports.getSessionReport = async (req, res) => {
  try {
    const session = await loadOwnedSession(req.params.sessionId, req.user);
    if (!session) return fail(res, 404, 'Session not found.');

    const questions = await db.InterviewQuestion.findAll({
      where: { session_id: session.id },
      include: [{ model: db.InterviewAnswer, as: 'answer', required: false }],
      order: [['sort_order', 'ASC']],
    });

    const plain = session.get({ plain: true });
    const analysis = plain.report_json?.analysis || {
      strengths: [],
      weaknesses: [],
      recommendations: [],
    };

    return ok(res, {
      session: {
        id: plain.id,
        status: plain.status,
        overall_score: plain.overall_score != null ? Number(plain.overall_score) : null,
        summary_feedback: plain.summary_feedback,
        interview_type: session.type?.title,
        completed_at: plain.completed_at,
      },
      questions: questions.map((q) => {
        const p = q.get({ plain: true });
        return {
          id: p.id,
          prompt: p.prompt,
          answer: p.answer?.answer_text || null,
          score: p.answer?.score != null ? Number(p.answer.score) : null,
          feedback: p.answer?.feedback_text || null,
        };
      }),
      analysis,
    });
  } catch (e) {
    console.error('getSessionReport:', e);
    return fail(res, 500, 'Failed to load report.');
  }
};

exports.getHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = mergeTenantWhere({ user_id: userId(req) }, req.user);
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.date_from || req.query.date_to) {
      where.created_at = {};
      if (req.query.date_from) where.created_at[Op.gte] = new Date(req.query.date_from);
      if (req.query.date_to) where.created_at[Op.lte] = new Date(req.query.date_to);
    }

    const include = [{ model: db.InterviewType, as: 'type', attributes: ['title', 'slug', 'category'] }];
    if (req.query.type) {
      include[0].where = {
        [Op.or]: [{ slug: req.query.type }, { category: req.query.type }],
      };
    }

    const { rows, count } = await db.InterviewSession.findAndCountAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const sessions = rows.map((s) => {
      const p = s.get({ plain: true });
      return {
        id: p.id,
        interview_type: p.type?.title || p.type?.slug,
        status: p.status,
        score: p.overall_score != null ? Number(p.overall_score) : null,
        created_at: p.created_at,
        completed_at: p.completed_at,
      };
    });

    return ok(res, { sessions, total: count, page, limit });
  } catch (e) {
    console.error('getHistory:', e);
    return fail(res, 500, 'Failed to load history.');
  }
};

exports.getPracticeQuestions = async (req, res) => {
  const category = req.query.category || 'technical';
  const difficulty = req.query.difficulty;
  const questions = getPracticeQuestions(category, difficulty);
  return ok(res, { questions, total: questions.length });
};

exports.getCoachingTips = async (req, res) => {
  const category = req.query.category || 'technical';
  const tips = getCoachingTips(category);
  return ok(res, { tips });
};

const DEFAULT_PREFS = {
  preferred_difficulty: 'medium',
  preferred_duration: '30',
  preferred_categories: [],
  notification_settings: {
    email_reminders: false,
    practice_reminders: false,
    weekly_reports: false,
  },
};

exports.getPreferences = async (req, res) => {
  try {
    const user = await db.User.findByPk(userId(req), { attributes: ['app_settings'] });
    const app = user?.app_settings && typeof user.app_settings === 'object' ? user.app_settings : {};
    const prefs = { ...DEFAULT_PREFS, ...(app.interview_preferences || {}) };
    return ok(res, prefs);
  } catch (e) {
    console.error('getPreferences:', e);
    return fail(res, 500, 'Failed to load preferences.');
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const user = await db.User.findByPk(userId(req));
    if (!user) return fail(res, 404, 'User not found.');
    const app = user.app_settings && typeof user.app_settings === 'object' ? { ...user.app_settings } : {};
    app.interview_preferences = { ...DEFAULT_PREFS, ...(app.interview_preferences || {}), ...req.body };
    await user.update({ app_settings: app });
    return ok(res, { message: 'Saved.', preferences: app.interview_preferences });
  } catch (e) {
    console.error('updatePreferences:', e);
    return fail(res, 500, 'Failed to save preferences.');
  }
};
