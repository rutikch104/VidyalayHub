const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const ok = (data) => (req, res) => res.status(200).json({ status: true, data });

router.get('/types', ok({ types: [] }));
router.post('/start', ok({ session_id: 'demo-session', message: 'Interview started (demo).' }));
router.get('/sessions/recent', ok({ sessions: [] }));
router.get('/stats', ok({
  totalSessions: 0,
  averageScore: 0,
  totalQuestions: 0,
  improvementRate: 0,
}));
router.get('/sessions/:sessionId/questions', ok({ questions: [] }));
router.post('/sessions/:sessionId/questions/:questionId/answer', ok({ feedback: 'OK', score: 0 }));
router.post('/sessions/:sessionId/complete', ok({ score: 0, feedback: 'Completed (demo).' }));
router.get('/sessions/:sessionId/report', ok({
  session: {},
  questions: [],
  analysis: { strengths: [], weaknesses: [], recommendations: [] },
}));
router.get('/sessions/history', ok({ sessions: [], total: 0, page: 1, limit: 20 }));
router.get('/practice-questions', ok({ questions: [], total: 0 }));
router.get('/coaching-tips', ok({ tips: [] }));
router.put('/preferences', ok({ message: 'Saved.' }));
router.get('/preferences', ok({
  preferred_difficulty: 'medium',
  preferred_duration: '30',
  preferred_categories: [],
  notification_settings: {
    email_reminders: false,
    practice_reminders: false,
    weekly_reports: false,
  },
}));

module.exports = router;
