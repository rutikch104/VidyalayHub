// Import routes
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const resourceLibraryRoutes = require('./routes/resourceLibraryRoutes');
const globalQuestionRoutes = require('./routes/globalQuestionRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const jobRoutes = require('./routes/jobRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const feedRoutes = require('./routes/feedRoutes');
const communityRoutes = require('./routes/communityRoutes');

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Use routes
app.use('/api', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/resources', resourceLibraryRoutes);
app.use('/api/questions', globalQuestionRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/communities', communityRoutes);