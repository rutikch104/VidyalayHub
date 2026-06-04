const express = require('express');
const router = express.Router();
const globalQuestionController = require('../controllers/globalQuestionController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Question routes (static paths before /:id)
router.post('/', upload.attachment, globalQuestionController.createQuestion);
router.get('/', globalQuestionController.getQuestions);
router.get('/tags/popular', globalQuestionController.getPopularQuestionTags);
router.get('/teachers/search', globalQuestionController.searchTeachersForTagging);
router.patch('/:id', globalQuestionController.updateQuestion);
router.get('/:id', globalQuestionController.getQuestion);

// Answer routes
router.post('/:id/answers', upload.attachment, globalQuestionController.addAnswer);
router.post('/:questionId/answers/:answerId/like', globalQuestionController.toggleAnswerLike);
router.post('/:questionId/answers/:answerId/comments', globalQuestionController.addAnswerComment);

// Interaction routes
router.post('/:id/like', globalQuestionController.toggleQuestionLike);
router.post('/:id/comments', globalQuestionController.addQuestionComment);

module.exports = router; 