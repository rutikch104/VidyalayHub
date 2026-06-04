const db = require('../database/index');
const fs = require('fs');
const { Op } = require('sequelize');
const path = require('path');
const {
  resolveResourceAbsolutePath,
  mimeForResourcePath,
  safeResourceFilename,
} = require('../utils/libraryMediaPaths');
const { ilikeContainsPattern } = require('../utils/searchQuery');
const {
  descriptorFromMulterFile,
  replaceStoredMedia,
} = require('../services/mediaUploadService');
const { recordMediaAsset } = require('../services/mediaAssetService');
const {
  userCanAccessLibraryResource,
  buildLibraryListAccessWhere,
} = require('../utils/libraryAccess');

const UPLOADER_ATTRS = ['id', 'first_name', 'last_name', 'profile_picture', 'tenant_id'];
const TENANT_ATTRS = ['tenant_id', 'name', 'logo_url'];

function resourceIncludes() {
  return [
    { model: db.User, as: 'uploader', attributes: UPLOADER_ATTRS },
    { model: db.Tenant, as: 'tenant', attributes: TENANT_ATTRS, required: false },
  ];
}

function formatResourcePlain(row, { isLiked = false } = {}) {
  const p = row.get ? row.get({ plain: true }) : row;
  const u = p.uploader || {};
  return {
    ...p,
    is_liked: isLiked,
    college_name: p.tenant?.name || null,
    uploader_name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || 'Student',
  };
}

async function attachLikeFlags(rows, userId) {
  if (!rows.length || !userId) return rows.map((r) => formatResourcePlain(r, { isLiked: false }));
  const ids = rows.map((r) => r.id);
  const likes = await db.ResourceLibraryLike.findAll({
    where: { user_id: userId, resource_id: { [Op.in]: ids } },
    attributes: ['resource_id'],
    raw: true,
  });
  const likedSet = new Set(likes.map((l) => String(l.resource_id)));
  return rows.map((r) => formatResourcePlain(r, { isLiked: likedSet.has(String(r.id)) }));
}

function buildListWhere(req) {
  const {
    search,
    tags,
    tenant_id,
    is_public,
    subject,
    resource_type,
    type,
  } = req.query;

  const andParts = [];
  const access = buildLibraryListAccessWhere(req.user, Op);
  if (access) andParts.push(access);

  if (search && String(search).trim()) {
    const pat = ilikeContainsPattern(search);
    if (pat) {
      andParts.push({
        [Op.or]: [
          { title: { [Op.iLike]: pat } },
          { description: { [Op.iLike]: pat } },
          { tags: { [Op.contains]: [String(search).trim().replace(/^#/, '')] } },
        ],
      });
    }
  }

  if (subject && String(subject).trim() && String(subject).trim() !== 'All') {
    andParts.push({ subject: String(subject).trim() });
  }

  const rType = resource_type || type;
  if (rType && String(rType).trim()) {
    andParts.push({ resource_type: { [Op.iLike]: String(rType).trim() } });
  }

  if (tags) {
    const tagArr = Array.isArray(tags) ? tags : String(tags).split(',').map((t) => t.trim()).filter(Boolean);
    if (tagArr.length) andParts.push({ tags: { [Op.overlap]: tagArr } });
  }

  if (tenant_id) andParts.push({ tenant_id });

  if (is_public !== undefined) andParts.push({ is_public: is_public === 'true' });

  return andParts.length ? { [Op.and]: andParts } : {};
}

function listOrder(sort) {
  const s = String(sort || 'recent').toLowerCase();
  if (s === 'popular' || s === 'trending') {
    return [
      ['downloads_count', 'DESC'],
      ['likes_count', 'DESC'],
      ['views_count', 'DESC'],
      ['created_at', 'DESC'],
    ];
  }
  if (s === 'likes') return [['likes_count', 'DESC'], ['created_at', 'DESC']];
  return [['created_at', 'DESC']];
}

async function queryResources(req, { extraWhere = {}, order, limit, offset }) {
  const baseWhere = buildListWhere(req);
  const where =
    extraWhere && Object.keys(extraWhere).length
      ? { [Op.and]: [baseWhere, extraWhere] }
      : baseWhere;

  const { count, rows } = await db.ResourceLibrary.findAndCountAll({
    where,
    include: resourceIncludes(),
    order: order || listOrder(req.query.sort),
    offset,
    limit,
  });

  const resources = await attachLikeFlags(rows, req.user.id);
  return { resources, count };
}

function parseJsonArray(raw, fallback = []) {
    if (raw == null || raw === '') return fallback;
    if (Array.isArray(raw)) return raw;
    try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v : fallback;
    } catch {
        return fallback;
    }
}

// Create a new resource
exports.createResource = async (req, res) => {
    const {
        title,
        description,
        tags,
        subject,
        type,
        is_public,
        allowed_roles
    } = req.body;

    try {
        if (!req.file) {
            return res.status(400).json({
                status: false,
                message: 'Please upload a file'
            });
        }

        if (!title || !String(title).trim()) {
            return res.status(400).json({
                status: false,
                message: 'Title is required',
            });
        }

        const tenantId =
            req.user.tenant_id != null && String(req.user.tenant_id).trim() !== ''
                ? req.user.tenant_id
                : null;

        const fileDescriptor = await descriptorFromMulterFile(req.file, 'library');

        const resource = await db.ResourceLibrary.create({
            tenant_id: tenantId,
            title,
            description,
            subject: subject || null,
            resource_type: type || null,
            file_url: fileDescriptor.url,
            file_size_bytes: req.file.size || null,
            uploaded_by: req.user.id,
            tags: parseJsonArray(tags, []),
            is_public: is_public !== 'false',
            allowed_roles:
                allowed_roles != null && String(allowed_roles).trim() !== ''
                    ? parseJsonArray(allowed_roles, [])
                    : null
        });

        void recordMediaAsset(fileDescriptor, {
            ownerId: req.user.id,
            category: 'library',
            entityType: 'resource_library',
            entityId: resource.id,
        });

        const resourceWithDetails = await db.ResourceLibrary.findByPk(resource.id, {
            include: [{
                model: db.User,
                as: 'uploader',
                attributes: ['id', 'first_name', 'last_name', 'profile_picture']
            }]
        });

        return res.status(201).json({
            status: true,
            message: 'Resource created successfully',
            data: resourceWithDetails
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error creating resource',
            error: err.message
        });
    }
};

// Get all resources with filters (global public library across tenants)
exports.getResources = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const lim = Math.min(100, parseInt(String(limit), 10) || 10);
        const pg = parseInt(String(page), 10) || 1;
        const offset = (pg - 1) * lim;

        const { resources, count } = await queryResources(req, { offset, limit: lim });

        return res.status(200).json({
            status: true,
            data: {
                resources,
                pagination: {
                    total: count,
                    page: pg,
                    pages: Math.ceil(count / lim) || 1,
                    limit: lim,
                },
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching resources',
            error: err.message,
        });
    }
};

// Get a single resource
exports.getResource = async (req, res) => {
    const { id } = req.params;

    try {
        const resource = await db.ResourceLibrary.findByPk(id, {
            include: [{
                model: db.User,
                as: 'uploader',
                attributes: ['id', 'first_name', 'last_name', 'profile_picture']
            }, {
                model: db.Tenant,
                as: 'tenant',
                attributes: ['tenant_id', 'name', 'logo_url']
            }]
        });

        if (!resource) {
            return res.status(404).json({
                status: false,
                message: 'Resource not found'
            });
        }

        if (!userCanAccessLibraryResource(req.user, resource)) {
            return res.status(403).json({
                status: false,
                message: 'Access denied',
            });
        }

        await resource.increment('views_count');
        await resource.reload();
        const liked = await db.ResourceLibraryLike.findOne({
            where: { resource_id: id, user_id: req.user.id },
        });

        return res.status(200).json({
            status: true,
            data: formatResourcePlain(resource, { isLiked: !!liked }),
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching resource',
            error: err.message
        });
    }
};

// Update a resource
exports.updateResource = async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        tags,
        subject,
        type,
        is_public,
        allowed_roles
    } = req.body;

    try {
        const resource = await db.ResourceLibrary.findByPk(id);

        if (!resource) {
            return res.status(404).json({
                status: false,
                message: 'Resource not found'
            });
        }

        // Check if user has permission to update
        if (!req.user.is_admin && resource.uploaded_by !== req.user.id) {
            return res.status(403).json({
                status: false,
                message: 'You do not have permission to update this resource'
            });
        }

        const updateData = {
            title: title !== undefined ? title : resource.title,
            description: description !== undefined ? description : resource.description,
            subject: subject !== undefined ? subject || null : resource.subject,
            resource_type: type !== undefined ? type || null : resource.resource_type,
            tags: tags !== undefined ? parseJsonArray(tags, resource.tags || []) : resource.tags,
            is_public: is_public !== undefined ? is_public === 'true' : resource.is_public,
            allowed_roles:
                allowed_roles !== undefined
                    ? parseJsonArray(allowed_roles, resource.allowed_roles || [])
                    : resource.allowed_roles
        };

        if (req.file) {
            await replaceStoredMedia(resource.file_url);
            const fileDescriptor = await descriptorFromMulterFile(req.file, 'library');
            updateData.file_url = fileDescriptor.url;
            void recordMediaAsset(fileDescriptor, {
                ownerId: req.user.id,
                category: 'library',
                entityType: 'resource_library',
                entityId: resource.id,
            });
        }

        await resource.update(updateData);

        const updatedResource = await db.ResourceLibrary.findByPk(id, {
            include: [{
                model: db.User,
                as: 'uploader',
                attributes: ['id', 'first_name', 'last_name', 'profile_picture']
            }]
        });

        return res.status(200).json({
            status: true,
            message: 'Resource updated successfully',
            data: updatedResource
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error updating resource',
            error: err.message
        });
    }
};

// Delete a resource
exports.deleteResource = async (req, res) => {
    const { id } = req.params;

    try {
        const resource = await db.ResourceLibrary.findByPk(id);

        if (!resource) {
            return res.status(404).json({
                status: false,
                message: 'Resource not found'
            });
        }

        // Check if user has permission to delete
        if (!req.user.is_admin && resource.uploaded_by !== req.user.id) {
            return res.status(403).json({
                status: false,
                message: 'You do not have permission to delete this resource'
            });
        }

        await resource.destroy();

        return res.status(200).json({
            status: true,
            message: 'Resource deleted successfully'
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error deleting resource',
            error: err.message
        });
    }
};

// Get popular tags
exports.getPopularTags = async (req, res) => {
    try {
        const resources = await db.ResourceLibrary.findAll({
            attributes: ['tags'],
            where: {
                tags: {
                    [Op.ne]: []
                }
            }
        });

        // Count tag occurrences
        const tagCount = {};
        resources.forEach(resource => {
            resource.tags.forEach(tag => {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            });
        });

        // Sort tags by frequency
        const popularTags = Object.entries(tagCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .map(([tag, count]) => ({ tag, count }));

        return res.status(200).json({
            status: true,
            data: popularTags
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching popular tags',
            error: err.message
        });
    }
};

async function listCurated(req, res, extraWhere) {
    try {
        const lim = Math.min(50, parseInt(String(req.query.limit), 10) || 12);
        const { resources, count } = await queryResources(req, {
            extraWhere,
            limit: lim,
            offset: 0,
        });
        return res.status(200).json({
            status: true,
            data: {
                resources,
                pagination: { total: count, page: 1, pages: 1, limit: lim },
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: err.message,
        });
    }
}

exports.getPopularResources = (req, res) => {
    req.query.sort = 'popular';
    return listCurated(req, res, {});
};

exports.getRecentResources = (req, res) => {
    req.query.sort = 'recent';
    return listCurated(req, res, {});
};

exports.getFeaturedResources = (req, res) => {
    req.query.sort = 'trending';
    return listCurated(req, res, {
        [Op.or]: [
            { likes_count: { [Op.gte]: 3 } },
            { downloads_count: { [Op.gte]: 5 } },
        ],
    });
};

exports.getResourcesBySubject = async (req, res) => {
    req.query.subject = req.params.subject;
    return exports.getResources(req, res);
};

exports.getMyUploads = async (req, res) => {
    try {
        const page = parseInt(String(req.query.page), 10) || 1;
        const limit = Math.min(50, parseInt(String(req.query.limit), 10) || 20);
        const offset = (page - 1) * limit;
        const { count, rows } = await db.ResourceLibrary.findAndCountAll({
            where: { uploaded_by: req.user.id },
            include: [
                {
                    model: db.User,
                    as: 'uploader',
                    attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
                },
                {
                    model: db.Tenant,
                    as: 'tenant',
                    attributes: ['tenant_id', 'name', 'logo_url'],
                },
            ],
            order: [['created_at', 'DESC']],
            offset,
            limit,
        });
        const resources = await attachLikeFlags(rows, req.user.id);
        return res.status(200).json({
            status: true,
            data: {
                resources,
                pagination: {
                    total: count,
                    page,
                    pages: Math.ceil(count / limit) || 1,
                },
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching uploads',
            error: err.message,
        });
    }
};

exports.previewResource = async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await db.ResourceLibrary.findByPk(id);
        if (!resource) {
            return res.status(404).json({ status: false, message: 'Resource not found' });
        }
        if (!userCanAccessLibraryResource(req.user, resource)) {
            return res.status(403).json({ status: false, message: 'Access denied' });
        }

        const absPath = resolveResourceAbsolutePath(resource.file_url);
        if (!absPath) {
            return res.status(404).json({ status: false, message: 'File not found on server' });
        }

        const mime = mimeForResourcePath(absPath);
        const filename = safeResourceFilename(resource.title, absPath);

        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        res.removeHeader('X-Frame-Options');

        const stream = fs.createReadStream(absPath);
        stream.on('error', () => {
            if (!res.headersSent) {
                res.status(500).json({ status: false, message: 'Error reading file' });
            }
        });
        stream.pipe(res);
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error loading preview',
            error: err.message,
        });
    }
};

exports.downloadResource = async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await db.ResourceLibrary.findByPk(id);
        if (!resource) {
            return res.status(404).json({ status: false, message: 'Resource not found' });
        }
        if (!userCanAccessLibraryResource(req.user, resource)) {
            return res.status(403).json({ status: false, message: 'Access denied' });
        }
        await resource.increment('downloads_count');
        await resource.reload();
        const file_url = resource.file_url;
        const filename =
            resource.title && String(resource.title).trim()
                ? `${String(resource.title).replace(/[/\\?%*:|"<>]/g, '-')}${path.extname(file_url) || ''}`
                : path.basename(file_url) || 'download';
        return res.status(200).json({
            status: true,
            data: {
                file_url,
                filename,
                title: resource.title,
                views_count: resource.views_count,
                downloads_count: resource.downloads_count,
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error preparing download',
            error: err.message,
        });
    }
};

exports.likeResource = async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await db.ResourceLibrary.findByPk(id);
        if (!resource) {
            return res.status(404).json({ status: false, message: 'Resource not found' });
        }
        if (!userCanAccessLibraryResource(req.user, resource)) {
            return res.status(403).json({ status: false, message: 'Access denied' });
        }
        const existing = await db.ResourceLibraryLike.findOne({
            where: { resource_id: id, user_id: req.user.id },
        });
        if (!existing) {
            await db.ResourceLibraryLike.create({ resource_id: id, user_id: req.user.id });
            await resource.increment('likes_count');
        }
        await resource.reload();
        return res.status(200).json({
            status: true,
            data: { likes_count: resource.likes_count, is_liked: true },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error liking resource',
            error: err.message,
        });
    }
};

exports.unlikeResource = async (req, res) => {
    try {
        const { id } = req.params;
        const resource = await db.ResourceLibrary.findByPk(id);
        if (!resource) {
            return res.status(404).json({ status: false, message: 'Resource not found' });
        }
        if (!userCanAccessLibraryResource(req.user, resource)) {
            return res.status(403).json({ status: false, message: 'Access denied' });
        }
        const existing = await db.ResourceLibraryLike.findOne({
            where: { resource_id: id, user_id: req.user.id },
        });
        if (existing) {
            await existing.destroy();
            if (resource.likes_count > 0) await resource.decrement('likes_count');
        }
        await resource.reload();
        return res.status(200).json({
            status: true,
            data: { likes_count: resource.likes_count, is_liked: false },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error unliking resource',
            error: err.message,
        });
    }
};

exports.reportResource = async (req, res) => {
    try {
        const { id } = req.params;
        const reason = String(req.body?.reason || '').trim();
        if (!reason) {
            return res.status(400).json({ status: false, message: 'Reason is required.' });
        }
        const resource = await db.ResourceLibrary.findByPk(id);
        if (!resource) {
            return res.status(404).json({ status: false, message: 'Resource not found' });
        }
        if (!userCanAccessLibraryResource(req.user, resource)) {
            return res.status(403).json({ status: false, message: 'Access denied' });
        }
        await db.ResourceLibraryReport.create({
            resource_id: id,
            reported_by: req.user.id,
            reason: reason.slice(0, 2000),
        });
        return res.status(201).json({ status: true, message: 'Report submitted. Thank you.' });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error submitting report',
            error: err.message,
        });
    }
};

exports.emptyComments = (req, res) => {
    return res.status(200).json({
        status: true,
        data: { comments: [], pagination: { total: 0, page: 1, pages: 1 } },
    });
};

exports.stubOk = (req, res) => {
    return res.status(200).json({ status: true, message: 'OK' });
};

exports.getLibraryStats = async (req, res) => {
    try {
        const where = buildListWhere(req);
        const total = await db.ResourceLibrary.count({ where });
        const totals = await db.ResourceLibrary.findOne({
            where,
            attributes: [
                [db.sequelize.fn('SUM', db.sequelize.col('downloads_count')), 'downloads'],
                [db.sequelize.fn('SUM', db.sequelize.col('views_count')), 'views'],
            ],
            raw: true,
        });
        const subjectRows = await db.ResourceLibrary.findAll({
            where,
            attributes: [
                'subject',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
            ],
            group: ['subject'],
            raw: true,
        });
        const resourcesBySubject = {};
        subjectRows.forEach((r) => {
            if (r.subject) resourcesBySubject[r.subject] = parseInt(r.count, 10) || 0;
        });

        const tagRows = await db.ResourceLibrary.findAll({
            where,
            attributes: ['tags'],
        });
        const tagCount = {};
        tagRows.forEach((r) => {
            (r.tags || []).forEach((tag) => {
                if (!tag) return;
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            });
        });
        const popularTags = Object.entries(tagCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));

        return res.status(200).json({
            status: true,
            data: {
                total_resources: total,
                total_downloads: parseInt(totals?.downloads, 10) || 0,
                total_views: parseInt(totals?.views, 10) || 0,
                resources_by_subject: resourcesBySubject,
                popular_tags: popularTags,
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching stats',
            error: err.message,
        });
    }
};

exports.getBookmarkedResources = async (req, res) => {
    try {
        const bookmarks = await db.Bookmark.findAll({
            where: { user_id: req.user.id, type: 'resource' },
            attributes: ['type_id'],
        });
        const ids = bookmarks.map((b) => b.type_id).filter(Boolean);
        if (!ids.length) {
            return res.status(200).json({
                status: true,
                data: { resources: [], pagination: { total: 0, page: 1, pages: 1 } },
            });
        }
        req.query.limit = req.query.limit || 50;
        const lim = Math.min(100, parseInt(String(req.query.limit), 10) || 50);
        const { resources, count } = await queryResources(req, {
            extraWhere: { id: { [Op.in]: ids } },
            limit: lim,
            offset: 0,
        });
        return res.status(200).json({
            status: true,
            data: {
                resources,
                pagination: { total: count, page: 1, pages: 1 },
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching bookmarks',
            error: err.message,
        });
    }
};

exports.getLibraryColleges = async (req, res) => {
    try {
        const where = buildListWhere(req);
        const idRows = await db.ResourceLibrary.findAll({
            where: { ...where, tenant_id: { [Op.ne]: null } },
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('tenant_id')), 'tenant_id']],
            raw: true,
        });
        const ids = idRows.map((r) => r.tenant_id).filter(Boolean);
        const tenants = ids.length
            ? await db.Tenant.findAll({
                where: { tenant_id: { [Op.in]: ids } },
                attributes: ['tenant_id', 'name'],
                order: [['name', 'ASC']],
            })
            : [];
        return res.status(200).json({
            status: true,
            data: {
                colleges: tenants.map((t) => ({
                    tenant_id: t.tenant_id,
                    name: t.name,
                })),
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching colleges',
            error: err.message,
        });
    }
};

exports.tagsListStub = async (req, res) => {
    try {
        const resources = await db.ResourceLibrary.findAll({ attributes: ['tags'] });
        const set = new Set();
        resources.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
        return res.status(200).json({ status: true, data: { tags: [...set] } });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching tags',
            error: err.message,
        });
    }
};

exports.subjectsStub = async (req, res) => {
    try {
        const rows = await db.ResourceLibrary.findAll({
            attributes: ['subject'],
            where: {
                subject: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
            },
            group: ['subject'],
            raw: true,
        });
        let subjects = rows.map((r) => r.subject).filter(Boolean);
        if (subjects.length === 0) {
            subjects = [
                'Mathematics',
                'Physics',
                'Chemistry',
                'Computer Science',
                'Biology',
                'English',
                'History',
                'General',
            ];
        }
        return res.status(200).json({ status: true, data: { subjects } });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching subjects',
            error: err.message,
        });
    }
};

exports.categoriesStub = (req, res) => {
    return res.status(200).json({ status: true, data: { categories: [] } });
};