const express = require('express');
const router = express.Router();
const resourceLibraryController = require('../controllers/resourceLibraryController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');

router.use(authenticate);

router.post('/', upload.library, resourceLibraryController.createResource);
router.get('/', resourceLibraryController.getResources);

router.get('/tags/popular', resourceLibraryController.getPopularTags);
router.get('/featured', resourceLibraryController.getFeaturedResources);
router.get('/popular', resourceLibraryController.getPopularResources);
router.get('/recent', resourceLibraryController.getRecentResources);
router.get('/subjects', resourceLibraryController.subjectsStub);
router.get('/tags', resourceLibraryController.tagsListStub);
router.get('/colleges', resourceLibraryController.getLibraryColleges);
router.get('/search', resourceLibraryController.getResources);
router.get('/stats', resourceLibraryController.getLibraryStats);
router.get('/my-uploads', resourceLibraryController.getMyUploads);
router.get('/categories', resourceLibraryController.categoriesStub);
router.get('/bookmarked', resourceLibraryController.getBookmarkedResources);
router.get('/subject/:subject', resourceLibraryController.getResourcesBySubject);

router.get('/:id/preview', resourceLibraryController.previewResource);
router.get('/:id/download', resourceLibraryController.downloadResource);
router.post('/:id/report', resourceLibraryController.reportResource);
router.post('/:id/like', resourceLibraryController.likeResource);
router.delete('/:id/like', resourceLibraryController.unlikeResource);
router.post('/:id/comments', resourceLibraryController.stubOk);
router.get('/:id/comments', resourceLibraryController.emptyComments);

router.get('/:id', resourceLibraryController.getResource);
router.put('/:id', upload.library, resourceLibraryController.updateResource);
router.delete('/:id', resourceLibraryController.deleteResource);

module.exports = router;
