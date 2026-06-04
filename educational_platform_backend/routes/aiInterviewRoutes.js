const express = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/aiInterviewController');

const router = express.Router();
router.use(authenticate);

router.get('/types', ctrl.getTypes);
router.post('/start', ctrl.startInterview);
router.get('/sessions/recent', ctrl.getRecentSessions);
router.get('/stats', ctrl.getStats);
router.get('/sessions/history', ctrl.getHistory);
router.get('/practice-questions', ctrl.getPracticeQuestions);
router.get('/coaching-tips', ctrl.getCoachingTips);
router.put('/preferences', ctrl.updatePreferences);
router.get('/preferences', ctrl.getPreferences);

router.get('/sessions/:sessionId/questions', ctrl.getSessionQuestions);
router.post('/sessions/:sessionId/questions/:questionId/answer', ctrl.submitAnswer);
router.post('/sessions/:sessionId/complete', ctrl.completeSession);
router.get('/sessions/:sessionId/report', ctrl.getSessionReport);

module.exports = router;
