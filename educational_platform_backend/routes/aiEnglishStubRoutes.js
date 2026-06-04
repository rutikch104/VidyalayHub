const express = require('express');
const { authenticate } = require('../middleware/auth');
const aiEnglishConversationController = require('../controllers/aiEnglishConversationController');

const router = express.Router();
router.use(authenticate);

const ok = (data) => (req, res) => res.status(200).json({ status: true, data });

router.get('/courses', ok({ courses: [] }));
router.get('/activities', ok({ activities: [] }));
router.get('/progress', ok({
  totalLessons: 0,
  completedLessons: 0,
  currentStreak: 0,
  overallScore: 0,
  vocabularyWords: 0,
  speakingScore: 0,
  listeningScore: 0,
  writingScore: 0,
  readingScore: 0,
}));

router.post('/courses/start', ok({ course_id: '', message: 'Course started (demo).' }));
router.post('/activities/start', ok({ activity_id: '', message: 'Activity started (demo).' }));
router.get('/courses/:courseId/content', ok({ lessons: [] }));
router.get('/activities/:activityId/content', ok({ steps: [] }));
router.post('/courses/:courseId/lessons/:lessonId/complete', ok({ score: 0, feedback: '', next_lesson: undefined }));
router.post('/activities/:activityId/complete', ok({ score: 0, feedback: '', improvements: [] }));
router.post('/pronunciation-feedback', ok({
  score: 0,
  feedback: 'Demo mode.',
  suggestions: [],
  pronunciation_guide: '',
}));
router.get('/vocabulary', ok({ words: [], total: 0 }));
router.post('/vocabulary/practice', ok({ quiz: [] }));
router.get('/grammar/exercises', ok({ exercises: [], total: 0 }));
router.get('/writing/prompts', ok({ prompts: [], total: 0 }));
router.post('/writing/submit', ok({
  score: 0,
  feedback: { grammar: [], vocabulary: [], structure: [], style: [] },
  suggestions: [],
  corrected_text: '',
}));
router.get('/conversation/topics', ok({ topics: [], total: 0 }));
router.post('/conversation/start', ok({
  conversation_id: 'demo',
  topic: 'Demo',
  initial_question: 'Hello! How are you today?',
  suggested_responses: ['I am fine, thank you.', 'I am practicing English.'],
}));
router.post(
  '/conversation/:conversationId/continue',
  aiEnglishConversationController.continueConversation,
);
router.get('/recommendations', ok({
  recommended_courses: [],
  recommended_activities: [],
  daily_goal: '',
  weekly_focus: '',
}));
router.put('/preferences', ok({ message: 'Saved.' }));
router.get('/preferences', ok({
  preferred_level: 'beginner',
  preferred_topics: [],
  daily_goal: 10,
  notification_settings: {
    daily_reminders: false,
    weekly_reports: false,
    achievement_notifications: false,
  },
}));

module.exports = router;
