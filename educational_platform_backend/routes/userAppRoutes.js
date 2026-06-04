const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');
const userApiController = require('../controllers/userApiController');
const profileSectionsController = require('../controllers/profileSectionsController');
const skillsController = require('../controllers/skillsController');
const userController = require('../controllers/userController');

router.use(authenticate);

router.get('/me', userApiController.getMe);
router.get('/me/sidebar-summary', userApiController.getMeSidebarSummary);
router.get('/skills/suggest', skillsController.suggestSkills);
router.put('/profile/about', profileSectionsController.putProfileAbout);
router.post('/profile/experience', profileSectionsController.postProfileExperience);
router.put('/profile/experience/:id', profileSectionsController.putProfileExperience);
router.delete('/profile/experience/:id', profileSectionsController.deleteProfileExperience);
router.post('/profile/education', profileSectionsController.postProfileEducation);
router.put('/profile/education/:id', profileSectionsController.putProfileEducation);
router.delete('/profile/education/:id', profileSectionsController.deleteProfileEducation);
router.post('/profile/achievements', profileSectionsController.postProfileAchievement);
router.put('/profile/achievements/:id', profileSectionsController.putProfileAchievement);
router.delete('/profile/achievements/:id', profileSectionsController.deleteProfileAchievement);
router.post('/profile/skills', profileSectionsController.postProfileSkill);
router.put('/profile/skills/:id', profileSectionsController.putProfileSkill);
router.delete('/profile/skills/:id', profileSectionsController.deleteProfileSkill);
router.post('/profile/publications', profileSectionsController.postProfilePublication);
router.put('/profile/publications/:id', profileSectionsController.putProfilePublication);
router.delete('/profile/publications/:id', profileSectionsController.deleteProfilePublication);
router.post('/projects', profileSectionsController.postProfileProject);
router.put('/projects/:id', profileSectionsController.putProfileProject);
router.delete('/projects/:id', profileSectionsController.deleteProfileProject);
router.put('/profile/teaching-info', profileSectionsController.putProfileTeachingInfo);
router.get('/profile', userApiController.getProfile);
router.put('/profile', userApiController.updateProfile);
router.post('/profile/avatar', upload.avatar, userApiController.uploadAvatar);
router.post('/profile/cover', upload.cover, userApiController.uploadCover);
router.get('/settings', userApiController.getSettings);
router.put('/settings', userApiController.updateUserSettings);
router.post('/password/change', userApiController.changePassword);
router.get('/export-data', userApiController.exportUserData);
router.post('/account/close', userApiController.closeAccount);
router.get('/search', userApiController.searchUsers);
router.get('/stats', userApiController.getUserStatsMe);
router.get('/blocked', userApiController.blockedUsers);

router.get('/:userId/public-profile', userApiController.getPublicProfile);
router.get('/:userId/connections', userApiController.getUserConnections);
router.get('/:userId/posts', userApiController.userPosts);
router.get('/:userId/projects', profileSectionsController.getUserProjects);
router.get('/:userId/publications', profileSectionsController.getUserPublications);
router.get('/:userId/stats', userApiController.getUserStatsById);

router.get('/:id', userController.getUser);

module.exports = router;
