// / Load environment variables from .env file

require('dotenv').config();

// Import core modules
const express = require('express');
const path = require('path');
const winston = require("./middleware/logger");
// Import third-party modules
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');

// Initialize the Express app
const app = express();
const { isProduction, corsOriginOption } = require('./middleware/productionHttp');
const { applySecurityMiddleware } = require('./middleware/securityStack');
const envConfig = require('./config/env');

if (envConfig.trustProxy) {
	app.set('trust proxy', 1);
}

applySecurityMiddleware(app);

// Middleware — allow browser previews (e.g. HTTPS Lovable) to reach http://localhost:3030 (Private Network Access)
app.use((req, res, next) => {
	if (req.get('access-control-request-private-network') === 'true') {
		res.setHeader('Access-Control-Allow-Private-Network', 'true');
	}
	next();
});
app.use(
	cors({
		origin: corsOriginOption(),
		credentials: true,
	})
);
app.use(bodyParser.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(morgan(isProduction() ? 'combined' : 'dev'));
const { UPLOAD_ROOT, PUBLIC_BASE_PATH } = require('./config/storageConfig');
app.use(PUBLIC_BASE_PATH, express.static(UPLOAD_ROOT));
app.use('/uploads', express.static(UPLOAD_ROOT));
const db = require("./database/index")
const { ensurePostsSchema } = require('./database/ensurePostsSchema');
const { ensureUserProfileSchema } = require('./database/ensureUserProfileSchema');
const { ensureUserProfileSectionsSchema } = require('./database/ensureUserProfileSectionsSchema');
const { ensureResourceLibrarySchema } = require('./database/ensureResourceLibrarySchema');
const { ensureMessagesSchema } = require('./database/ensureMessagesSchema');
const { ensureGlobalQuestionsSchema } = require('./database/ensureGlobalQuestionsSchema');
const { ensureSocialMentionsSchema } = require('./database/ensureSocialMentionsSchema');
const { ensureJobsEnhancementsSchema } = require('./database/ensureJobsEnhancementsSchema');
const { ensureNetworkEnhancementsSchema } = require('./database/ensureNetworkEnhancementsSchema');
const { ensureBookmarksSchema } = require('./database/ensureBookmarksSchema');
const { ensureTenantNoticesSchema } = require('./database/ensureTenantNoticesSchema');
const { ensureEventsSchema } = require('./database/ensureEventsSchema');
const { ensureInterviewSchema } = require('./database/ensureInterviewSchema');
const { ensureRbacSchema } = require('./database/ensureRbacSchema');
const { ensureMediaSchema } = require('./database/ensureMediaSchema');
const { ensureSuperAdminSchema } = require('./database/ensureSuperAdminSchema');
const { ensureTenantSaasSchema } = require('./database/ensureTenantSaasSchema');
const { tenantResolver } = require('./middleware/tenant');
const http = require("http");

/** Tenant context for all API routes (slug from header, host, or DEFAULT_TENANT_SLUG). */
app.use('/api', tenantResolver);

async function healthPayload() {
	const payload = {
		ok: true,
		service: 'educational_platform_backend',
		uptime: Math.round(process.uptime()),
		env: process.env.NODE_ENV || 'development',
		timestamp: new Date().toISOString(),
	};
	try {
		await db.sequelize.authenticate();
		payload.database = 'connected';
	} catch {
		payload.ok = false;
		payload.database = 'disconnected';
	}
	return payload;
}

app.get('/health', async (_req, res) => {
	const payload = await healthPayload();
	res.status(payload.ok ? 200 : 503).json(payload);
});
app.get('/api/health', async (_req, res) => {
	const payload = await healthPayload();
	res.status(payload.ok ? 200 : 503).json(payload);
});

	// Post routes

	const userRoutes = require('./routes/userRoutes');
	const userAppRoutes = require('./routes/userAppRoutes');
	// Legacy routes first so /getallusers, /createusers, etc. are not captured by userAppRoutes /:id
	app.use('/api/users', userRoutes);
	app.use('/api/users', userAppRoutes);

	const authRoutes = require('./routes/authRoutes');
	app.use('/api/auth', authRoutes);

	const collegeAdminRoutes = require('./routes/collegeAdminRoutes');
	app.use('/api/college-admin', collegeAdminRoutes);

	const tenantRoutes = require('./routes/tenantRoutes');
	app.use('/api/tenants', tenantRoutes);

	const brandingRoutes = require('./routes/brandingRoutes');
	app.use('/api/branding', brandingRoutes);

	
	const tenantVerificationRoutes = require('./routes/tenantVerificationControllerRoutes');
	app.use('/api/tenant-verification', tenantVerificationRoutes);


	// console.log(tenantVerificationRoutes); // Should log the router object

	const mainAdminRoutes = require('./routes/mainAdminRoutes');
	app.use('/api/main-admin', mainAdminRoutes);

	const postRoutes = require('./routes/postRoutes');
	app.use('/api/posts', postRoutes);
	
	const likeRoutes = require('./routes/likeRoutes.js');
	app.use('/api/likes', likeRoutes);
	
	const commentRoutes = require('./routes/commentRoutes');
	app.use('/api/comments', commentRoutes);

	const feedRoutes = require('./routes/feedRoutes');
	const jobRoutes = require('./routes/jobRoutes');
	const bookmarkRoutes = require('./routes/bookmarkRoutes');
	const messageRoutes = require('./routes/messageRoutes');
	const notificationRoutes = require('./routes/notificationRoutes');
	const connectionRoutes = require('./routes/connectionRoutes');
	const globalQuestionRoutes = require('./routes/globalQuestionRoutes');
	const socialRoutes = require('./routes/socialRoutes');
	const resourceLibraryRoutes = require('./routes/resourceLibraryRoutes');
	const communityRoutes = require('./routes/communityRoutes');
	const adminCompatRoutes = require('./routes/adminCompatRoutes');
	const superAdminCompatRoutes = require('./routes/superAdminCompatRoutes');
	const aiEnglishStubRoutes = require('./routes/aiEnglishStubRoutes');
	const aiInterviewRoutes = require('./routes/aiInterviewRoutes');
	const rbacRoutes = require('./routes/rbacRoutes');
	const superAdminAuthRoutes = require('./routes/superAdminAuthRoutes');
	const eventRoutes = require('./routes/eventRoutes');

	app.use('/api/feed', feedRoutes);
	app.use('/api/jobs', jobRoutes);
	app.use('/api/events', eventRoutes);
	app.use('/api/bookmarks', bookmarkRoutes);
	app.use('/api/messages', messageRoutes);
	app.use('/api/notifications', notificationRoutes);
	app.use('/api/connections', connectionRoutes);
	app.use('/api/global-questions', globalQuestionRoutes);
	app.use('/api/social', socialRoutes);
	app.use('/api/resource-library', resourceLibraryRoutes);
	app.use('/api/communities', communityRoutes);
	app.use('/api/admin', adminCompatRoutes);
	app.use('/api/super-admin', superAdminCompatRoutes);
	app.use('/api/ai-english', aiEnglishStubRoutes);
	app.use('/api/ai-interview', aiInterviewRoutes);
	app.use('/api/rbac', rbacRoutes);
	app.use('/api/super-admin-auth', superAdminAuthRoutes);

	app.use((err, req, res, next) => {
		if (err instanceof multer.MulterError) {
			return res.status(400).json({ status: false, message: 'File upload error.', error: err.message });
		}
		if (err && err.message && String(err.message).includes('Invalid file type')) {
			return res.status(400).json({ status: false, message: err.message });
		}
		next(err);
	});

	app.use((req, res) => {
		if (req.path.startsWith('/api')) {
			return res.status(404).json({ status: false, message: 'Not found.' });
		}
		return res.status(404).type('text/plain').send('Not found');
	});

	app.use((err, req, res, _next) => {
		winston.error(err.stack || err.message || String(err));
		const prod = isProduction();
		const status = Number(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
		const expose = !prod || (status >= 400 && status < 500);
		res.status(status).json({
			status: false,
			message: expose && err.message ? err.message : 'Internal server error.',
		});
	});

async function runSchemaBootstrap() {
	await ensurePostsSchema(db.sequelize);
	await ensureUserProfileSchema(db.sequelize);
	await ensureUserProfileSectionsSchema(db.sequelize);
	await ensureResourceLibrarySchema(db.sequelize);
	await ensureMessagesSchema(db.sequelize);
	await ensureGlobalQuestionsSchema(db.sequelize);
	await ensureSocialMentionsSchema(db.sequelize);
	await ensureJobsEnhancementsSchema(db.sequelize);
	await ensureNetworkEnhancementsSchema(db.sequelize);
	await ensureBookmarksSchema(db.sequelize);
	await ensureTenantNoticesSchema(db.sequelize);
	await ensureEventsSchema(db.sequelize);
	await ensureInterviewSchema(db.sequelize);
	await ensureSuperAdminSchema(db.sequelize);
	await ensureRbacSchema(db.sequelize);
	await ensureMediaSchema(db.sequelize);
	await ensureTenantSaasSchema(db.sequelize);
}

function skipSequelizeSync() {
	const v = String(process.env.SKIP_SEQUELIZE_SYNC || '').toLowerCase();
	return v === 'true' || v === '1' || v === 'yes';
}

function startHttpServer() {
	const server = http.createServer(app);
	server.timeout = 7200000;

	const port = envConfig.port;
	server.listen(port, () => {
		const syncNote = skipSequelizeSync() ? ' (sequelize.sync skipped)' : '';
		winston.info(`App running on PORT: ${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})${syncNote}`);
	});

	const shutdown = async (signal) => {
		winston.info(`Received ${signal}, shutting down gracefully…`);
		server.close(async () => {
				try {
					await db.sequelize.close();
					winston.info('Database connection closed.');
				} catch (err) {
					winston.error('Error closing database: %s', err.message);
				}
				process.exit(0);
			});
			setTimeout(() => {
				winston.error('Forced shutdown after timeout.');
				process.exit(1);
			}, 15000).unref();
		};

	process.on('SIGTERM', () => shutdown('SIGTERM'));
	process.on('SIGINT', () => shutdown('SIGINT'));
}

async function bootstrapDatabase() {
	if (!skipSequelizeSync()) {
		await db.sequelize.sync({ force: false });
	}
	await runSchemaBootstrap();
	startHttpServer();
}

bootstrapDatabase().catch((err) => {
	winston.error('Database bootstrap failed: %s', err.stack || err.message);
	if (isProduction()) {
		process.exit(1);
	}
});


// Import routes

// const userRoutes = require('./src/routes/users');

// const authenticationRoutes = require('./src/routes/authentications');

// const customerRoutes = require('./src/routes/customers');
// const bupRevenueRoutes = require('./src/routes/bup_revenue');
// const adminRoutes = require('./src/routes/admin');
// const trackRecordRoutes = require('./src/routes/track_record');
// const bupFTERoutes = require('./src/routes/bup_fte');
// const bupCostRoutes = require('./src/routes/bup_cost');
// const engineRoutes = require('./src/routes/engines');
// const historyRoutes = require('./src/routes/history');

// Use routes
// app.use('/api/users', userRoutes);

// app.use('/api/authentication', authenticationRoutes);

// app.use('/api/customers', customerRoutes);
// app.use('/api/bup-revenue', bupRevenueRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api/track-record', trackRecordRoutes);
// app.use('/api/bup-fte', bupFTERoutes);
// app.use('/api/bup-cost', bupCostRoutes);
// app.use('/api/engines', engineRoutes);
// app.use('/api/history', historyRoutes);
