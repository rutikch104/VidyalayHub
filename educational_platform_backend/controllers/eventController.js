const db = require('../database/index');
const { Op, Transaction } = require('sequelize');
const { ilikeContainsPattern } = require('../utils/searchQuery');
const { mergeTenantWhere, denyIfCrossTenant } = require('../utils/tenantScope');
const { processUploadedFiles } = require('../services/mediaUploadService');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');

const VALID_STATUSES = new Set(['interested', 'going', 'not going']);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeHm() {
  return new Date().toTimeString().slice(0, 8);
}

function addDaysStr(fromDate, days) {
  const d = new Date(`${fromDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** college_only | global — map frontend public/private */
function normalizeVisibility(raw) {
  const v = raw ? String(raw).toLowerCase().trim() : 'college_only';
  if (v === 'public' || v === 'global') return 'global';
  return 'college_only';
}

function parseTags(input) {
  if (Array.isArray(input)) return input.map((t) => String(t).trim()).filter(Boolean);
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return [];
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map((t) => String(t).trim()).filter(Boolean);
    } catch {
      /* comma-separated */
    }
    return s.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

/** Browsers often send HH:mm; normalize for TIME columns. */
function normalizeTimeValue(t) {
  if (t == null) return t;
  const s = String(t).trim();
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

function timeToComparable(t) {
  const parts = String(t || '00:00:00').split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const s = parseInt(parts[2], 10) || 0;
  return h * 3600 + m * 60 + s;
}

function validateTimes(start_time, end_time) {
  if (timeToComparable(end_time) <= timeToComparable(start_time)) {
    return 'end_time must be after start_time.';
  }
  return null;
}

async function getViewerNetwork(userId, reqUser) {
  const user = await db.User.findByPk(userId, { attributes: ['tenant_id'] });
  const scopeUser = reqUser || { id: userId, tenant_id: user?.tenant_id };
  const userConnections = await db.Connection.findAll({
    where: mergeTenantWhere(
      {
        status: 'accepted',
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
      },
      scopeUser,
    ),
  });
  const connectedUserIds = userConnections.map((conn) =>
    conn.sender_id === userId ? conn.receiver_id : conn.sender_id
  );
  return {
    tenant_id: user?.tenant_id || null,
    connectedUserIds,
  };
}

/** Private (college_only) = same tenant only; public (global) = all authenticated users. */
function visibilityWhere(userId, tenantId) {
  const or = [{ visibility: 'global' }, { created_by: userId }];
  if (tenantId) {
    or.push({ tenant_id: tenantId, visibility: 'college_only' });
  }
  return { [Op.or]: or };
}

async function resolveBannerFromUpload(req, fallbackUrl) {
  if (!req.files?.length) return fallbackUrl || null;
  const file = req.files.find((f) => f.fieldname === 'banner') || req.files[0];
  const descriptors = await processUploadedFiles([file], 'attachment');
  return descriptors[0]?.url || fallbackUrl || null;
}

function upcomingDateWhere(tStr, hm) {
  return {
    [Op.or]: [
      { date: { [Op.gt]: tStr } },
      { [Op.and]: [{ date: tStr }, { end_time: { [Op.gte]: hm } }] },
    ],
  };
}

function pastDateWhere(tStr, hm) {
  return {
    [Op.or]: [
      { date: { [Op.lt]: tStr } },
      { [Op.and]: [{ date: tStr }, { end_time: { [Op.lt]: hm } }] },
    ],
  };
}

function tabDateScope(tab) {
  const tStr = todayStr();
  const hm = nowTimeHm();
  if (tab === 'Upcoming') return upcomingDateWhere(tStr, hm);
  if (tab === 'Past') return pastDateWhere(tStr, hm);
  if (tab === 'This Week') {
    const end = addDaysStr(tStr, 7);
    return {
      [Op.and]: [{ date: { [Op.between]: [tStr, end] } }, upcomingDateWhere(tStr, hm)],
    };
  }
  if (tab === 'This Month') {
    const end = addDaysStr(tStr, 30);
    return {
      [Op.and]: [{ date: { [Op.between]: [tStr, end] } }, upcomingDateWhere(tStr, hm)],
    };
  }
  return null;
}

async function participantCountsForEvents(eventIds) {
  const detailed = await participantCountsDetailed(eventIds);
  const map = {};
  eventIds.forEach((id) => {
    map[id] = (detailed.going[id] || 0) + (detailed.interested[id] || 0);
  });
  return map;
}

async function participantCountsDetailed(eventIds) {
  const going = {};
  const interested = {};
  if (!eventIds.length) return { going, interested };
  const rows = await db.EventParticipant.findAll({
    attributes: [
      'event_id',
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'cnt'],
    ],
    where: { event_id: { [Op.in]: eventIds }, status: { [Op.in]: ['going', 'interested'] } },
    group: ['event_id', 'status'],
    raw: true,
  });
  rows.forEach((r) => {
    const n = parseInt(r.cnt, 10) || 0;
    if (r.status === 'going') going[r.event_id] = n;
    if (r.status === 'interested') interested[r.event_id] = n;
  });
  return { going, interested };
}

function mapEventRow(eventInstance, countsMap, creatorPlain, detailCounts) {
  const e = eventInstance.get ? eventInstance.get({ plain: true }) : eventInstance;
  const org = creatorPlain || e.creator;
  const orgName = org
    ? [org.first_name, org.last_name].filter(Boolean).join(' ') || 'Organizer'
    : 'Organizer';
  const tenantName = e.tenant?.name || null;
  const goingCount = detailCounts?.going?.[e.id] ?? 0;
  const interestedCount = detailCounts?.interested?.[e.id] ?? 0;
  const banner = e.banner_url ? resolveMediaUrl(e.banner_url) || e.banner_url : '';
  return {
    ...e,
    current_participants: countsMap[e.id] ?? goingCount + interestedCount,
    going_count: goingCount,
    interested_count: interestedCount,
    organizer_id: e.created_by,
    organizer_name: orgName,
    organizer_avatar: org?.profile_picture || '',
    college_name: tenantName,
    visibility_label: e.visibility === 'global' ? 'public' : 'private',
    image_url: banner,
    banner_url: banner,
    start_date: e.date,
    end_date: e.date,
    event_type: e.event_type || 'seminar',
    category: e.category || '',
    max_participants: e.max_participants ?? null,
    tags: Array.isArray(e.tags) ? e.tags : [],
    is_online: !!e.is_online,
    meeting_link: e.meeting_link || '',
    registration_deadline: e.registration_deadline || null,
    is_featured: !!e.is_featured,
    updated_at: e.updated_at || e.created_at,
  };
}

async function resolveTenantId(userId, reqTenant) {
  let tenant_id = reqTenant;
  if (!tenant_id) {
    const u = await db.User.findByPk(userId, { attributes: ['tenant_id'] });
    tenant_id = u?.tenant_id || null;
  }
  return tenant_id;
}

// —— Routes ——

exports.listEvents = async (req, res) => {
  const userId = req.user.id;
  const {
    page = 1,
    limit = 20,
    q,
    category,
    event_type,
    is_online,
    is_featured,
    tab,
    date_from,
    date_to,
    sort,
  } = req.query;

  try {
    const lim = Math.min(100, parseInt(String(limit), 10) || 20);
    const pg = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pg - 1) * lim;

    const { tenant_id } = await getViewerNetwork(userId, req.user);
    const where = {
      [Op.and]: [visibilityWhere(userId, tenant_id)],
    };

    const scope = tabDateScope(tab || 'All');
    if (scope) where[Op.and].push(scope);

    if (date_from || date_to) {
      const d = {};
      if (date_from) d[Op.gte] = String(date_from).slice(0, 10);
      if (date_to) d[Op.lte] = String(date_to).slice(0, 10);
      where[Op.and].push({ date: d });
    }

    if (q && String(q).trim()) {
      const pat = ilikeContainsPattern(q);
      if (pat) {
        where[Op.and].push({
          [Op.or]: [
            { title: { [Op.iLike]: pat } },
            { description: { [Op.iLike]: pat } },
            { location: { [Op.iLike]: pat } },
            { category: { [Op.iLike]: pat } },
          ],
        });
      }
    }

    if (category) where[Op.and].push({ category: { [Op.iLike]: `%${category}%` } });
    if (event_type) where[Op.and].push({ event_type: String(event_type) });
    if (is_online !== undefined) where[Op.and].push({ is_online: is_online === 'true' });
    if (is_featured !== undefined) where[Op.and].push({ is_featured: is_featured === 'true' });

    let order = [
      ['date', 'ASC'],
      ['start_time', 'ASC'],
    ];
    if (sort === 'trending') {
      order = [
        [db.sequelize.literal('(COALESCE("Event"."is_featured", false)::int * 10)'), 'DESC'],
        ['created_at', 'DESC'],
      ];
    }

    const { count, rows } = await db.Event.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
        },
        {
          model: db.Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'name'],
        },
      ],
      order,
      offset,
      limit: lim,
    });

    const ids = rows.map((r) => r.id);
    const counts = await participantCountsForEvents(ids);
    const detailed = await participantCountsDetailed(ids);
    const events = rows.map((r) =>
      mapEventRow(r, counts, r.creator?.get?.({ plain: true }) || r.creator, detailed),
    );
    if (sort === 'trending' && events.length > 1) {
      events.sort(
        (a, b) =>
          (b.going_count + b.interested_count + (b.is_featured ? 5 : 0)) -
          (a.going_count + a.interested_count + (a.is_featured ? 5 : 0)),
      );
    }

    return res.status(200).json({
      status: true,
      data: {
        events,
        total: count,
        page: pg,
        limit: lim,
        pagination: { total: count, page: pg, pages: Math.ceil(count / lim) || 1 },
      },
    });
  } catch (err) {
    console.error('listEvents', err);
    return res.status(500).json({ status: false, message: 'Error fetching events.', error: err.message });
  }
};

exports.getFeatured = async (req, res) => {
  req.query.tab = 'Upcoming';
  req.query.is_featured = 'true';
  req.query.limit = req.query.limit || 10;
  return exports.listEvents(req, res);
};

exports.getUpcoming = async (req, res) => {
  req.query.tab = 'Upcoming';
  return exports.listEvents(req, res);
};

exports.getTrending = async (req, res) => {
  req.query.tab = 'Upcoming';
  req.query.sort = 'trending';
  req.query.limit = req.query.limit || 8;
  return exports.listEvents(req, res);
};

exports.searchEvents = async (req, res) => {
  const { q } = req.query;
  if (!q || !String(q).trim()) {
    return res.status(400).json({ status: false, message: 'Search query q is required.' });
  }
  return exports.listEvents(req, res);
};

exports.getEventById = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const { tenant_id } = await getViewerNetwork(userId, req.user);
    const event = await db.Event.findOne({
      where: {
        id,
        ...visibilityWhere(userId, tenant_id),
      },
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
        },
        { model: db.Tenant, as: 'tenant', attributes: ['tenant_id', 'name'] },
      ],
    });
    if (!event) {
      return res.status(404).json({ status: false, message: 'Event not found.' });
    }
    const counts = await participantCountsForEvents([id]);
    const detailed = await participantCountsDetailed([id]);
    const [participant, bookmark] = await Promise.all([
      db.EventParticipant.findOne({ where: { event_id: id, user_id: userId } }),
      db.Bookmark.findOne({ where: { user_id: userId, type: 'event', type_id: id } }),
    ]);
    const plain = mapEventRow(event, counts, event.creator?.get({ plain: true }), detailed);
    plain.is_registered = !!(participant && participant.status !== 'not going');
    plain.participant_status = participant?.status || null;
    plain.is_bookmarked = !!bookmark;
    return res.status(200).json({ status: true, data: { event: plain } });
  } catch (err) {
    console.error('getEventById', err);
    return res.status(500).json({ status: false, message: 'Error fetching event.', error: err.message });
  }
};

exports.createEvent = async (req, res) => {
  const userId = req.user.id;
  const {
    title,
    description,
    date,
    start_time,
    end_time,
    location,
    visibility: visRaw,
    banner_url,
    event_type,
    category,
    max_participants,
    is_online,
    meeting_link,
    registration_deadline,
    is_featured,
    tags: tagsIn,
    start_date,
    end_date,
  } = req.body;

  try {
    let eventDate = date || (start_date ? String(start_date).slice(0, 10) : null);
    let startTime = normalizeTimeValue(start_time);
    let endTime = normalizeTimeValue(end_time);

    if (!eventDate && end_date) {
      eventDate = String(end_date).slice(0, 10);
    }

    if (!startTime || !endTime) {
      return res.status(400).json({
        status: false,
        message: 'date, start_time, and end_time are required.',
      });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ status: false, message: 'title is required.' });
    }

    if (!eventDate) {
      return res.status(400).json({ status: false, message: 'date is required.' });
    }

    const tErr = validateTimes(startTime, endTime);
    if (tErr) return res.status(400).json({ status: false, message: tErr });

    const tenant_id = await resolveTenantId(userId, req.user.tenant_id);
    if (!tenant_id) {
      return res.status(400).json({
        status: false,
        message: 'Your account must be linked to an organization to create events.',
      });
    }

    if (registration_deadline && String(registration_deadline) > eventDate) {
      return res.status(400).json({
        status: false,
        message: 'registration_deadline cannot be after the event date.',
      });
    }

    const tags = parseTags(tagsIn);
    const visibility = normalizeVisibility(visRaw);
    const maxP =
      max_participants === undefined || max_participants === null || max_participants === ''
        ? null
        : parseInt(String(max_participants), 10);
    if (maxP !== null && (Number.isNaN(maxP) || maxP < 1)) {
      return res.status(400).json({ status: false, message: 'max_participants must be a positive number.' });
    }

    const bannerResolved = await resolveBannerFromUpload(req, banner_url);

    const row = await db.Event.create({
      tenant_id,
      created_by: userId,
      title: String(title).trim(),
      description: description != null ? String(description) : null,
      date: eventDate,
      start_time: startTime,
      end_time: endTime,
      location: location != null ? String(location) : null,
      visibility,
      banner_url: bannerResolved,
      event_type: event_type ? String(event_type) : 'seminar',
      category: category ? String(category) : null,
      max_participants: maxP,
      tags,
      is_online: is_online === true || is_online === 'true',
      meeting_link: meeting_link || null,
      registration_deadline: registration_deadline || null,
      is_featured: is_featured === true || is_featured === 'true',
    });

    const full = await db.Event.findByPk(row.id, {
      include: [
        { model: db.User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'profile_picture'] },
        { model: db.Tenant, as: 'tenant', attributes: ['tenant_id', 'name'] },
      ],
    });
    const counts = await participantCountsForEvents([row.id]);
    const detailed = await participantCountsDetailed([row.id]);
    const event = mapEventRow(full, counts, full.creator?.get({ plain: true }), detailed);

    return res.status(201).json({
      status: true,
      message: 'Event created.',
      data: { event },
    });
  } catch (err) {
    console.error('createEvent', err);
    return res.status(500).json({ status: false, message: 'Error creating event.', error: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const event = await db.Event.findByPk(id);
    if (!event) return res.status(404).json({ status: false, message: 'Event not found.' });
    const crossDenial = denyIfCrossTenant(req, event.tenant_id);
    if (crossDenial) {
      return res.status(crossDenial.status).json({ status: false, message: crossDenial.message });
    }
    if (event.created_by !== userId) {
      return res.status(403).json({ status: false, message: 'Only the organizer can update this event.' });
    }

    const allowed = [
      'title',
      'description',
      'date',
      'start_time',
      'end_time',
      'location',
      'visibility',
      'banner_url',
      'event_type',
      'category',
      'max_participants',
      'tags',
      'is_online',
      'meeting_link',
      'registration_deadline',
      'is_featured',
    ];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    if (patch.visibility !== undefined) patch.visibility = normalizeVisibility(patch.visibility);
    if (patch.tags !== undefined) patch.tags = parseTags(patch.tags);
    if (patch.max_participants !== undefined) {
      if (patch.max_participants === null || patch.max_participants === '') {
        patch.max_participants = null;
      } else {
        const m = parseInt(String(patch.max_participants), 10);
        if (Number.isNaN(m) || m < 1) {
          return res.status(400).json({ status: false, message: 'Invalid max_participants.' });
        }
        patch.max_participants = m;
      }
    }

    const nextDate = patch.date !== undefined ? patch.date : event.date;
    const nextStart =
      patch.start_time !== undefined ? normalizeTimeValue(patch.start_time) : event.start_time;
    const nextEnd = patch.end_time !== undefined ? normalizeTimeValue(patch.end_time) : event.end_time;
    if (patch.start_time !== undefined) patch.start_time = nextStart;
    if (patch.end_time !== undefined) patch.end_time = nextEnd;
    const tErr = validateTimes(nextStart, nextEnd);
    if (tErr) return res.status(400).json({ status: false, message: tErr });

    const rd = patch.registration_deadline !== undefined ? patch.registration_deadline : event.registration_deadline;
    if (rd && String(rd) > String(nextDate)) {
      return res.status(400).json({
        status: false,
        message: 'registration_deadline cannot be after the event date.',
      });
    }

    const uploadedBanner = await resolveBannerFromUpload(req, patch.banner_url);
    if (uploadedBanner) patch.banner_url = uploadedBanner;

    patch.updated_at = new Date();
    await event.update(patch);

    const full = await db.Event.findByPk(id, {
      include: [
        { model: db.User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'profile_picture'] },
        { model: db.Tenant, as: 'tenant', attributes: ['tenant_id', 'name'] },
      ],
    });
    const counts = await participantCountsForEvents([id]);
    const detailed = await participantCountsDetailed([id]);
    return res.status(200).json({
      status: true,
      message: 'Event updated.',
      data: { event: mapEventRow(full, counts, full.creator?.get({ plain: true }), detailed) },
    });
  } catch (err) {
    console.error('updateEvent', err);
    return res.status(500).json({ status: false, message: 'Error updating event.', error: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const t = await db.sequelize.transaction();
  try {
    const event = await db.Event.findByPk(id, { transaction: t, lock: Transaction.LOCK.UPDATE });
    if (!event) {
      await t.rollback();
      return res.status(404).json({ status: false, message: 'Event not found.' });
    }
    const crossDenial = denyIfCrossTenant(req, event.tenant_id);
    if (crossDenial) {
      await t.rollback();
      return res.status(crossDenial.status).json({ status: false, message: crossDenial.message });
    }
    if (event.created_by !== userId) {
      await t.rollback();
      return res.status(403).json({ status: false, message: 'Only the organizer can delete this event.' });
    }
    await db.EventParticipant.destroy({ where: { event_id: id }, transaction: t });
    await event.destroy({ transaction: t });
    await t.commit();
    return res.status(200).json({ status: true, message: 'Event deleted.' });
  } catch (err) {
    await t.rollback();
    console.error('deleteEvent', err);
    return res.status(500).json({ status: false, message: 'Error deleting event.', error: err.message });
  }
};

exports.registerForEvent = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  let status = req.body?.status != null ? String(req.body.status) : 'going';
  if (status === 'confirmed') status = 'going';
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ status: false, message: 'Invalid status. Use interested, going, or not going.' });
  }

  try {
    const event = await db.Event.findByPk(id);
    if (!event) return res.status(404).json({ status: false, message: 'Event not found.' });

    const viewerTenant = await resolveTenantId(userId, req.user.tenant_id);
    const canSee = await db.Event.findOne({
      where: { id, ...visibilityWhere(userId, viewerTenant) },
    });
    if (!canSee) return res.status(404).json({ status: false, message: 'Event not found.' });

    if (
      event.visibility === 'college_only' &&
      viewerTenant &&
      String(event.tenant_id) !== String(viewerTenant) &&
      String(event.created_by) !== String(userId)
    ) {
      return res.status(403).json({
        status: false,
        message: 'This private event is only open to the hosting college.',
      });
    }

    const tStr = todayStr();
    const hm = nowTimeHm();
    const ended =
      String(event.date) < tStr ||
      (String(event.date) === tStr && timeToComparable(event.end_time) < timeToComparable(hm));
    if (ended) {
      return res.status(400).json({ status: false, message: 'This event has already ended.' });
    }

    if (event.registration_deadline && String(event.registration_deadline) < tStr) {
      return res.status(400).json({ status: false, message: 'Registration deadline has passed.' });
    }

    const existing = await db.EventParticipant.findOne({ where: { event_id: id, user_id: userId } });
    const activeCount = await db.EventParticipant.count({
      where: { event_id: id, status: { [Op.in]: ['going', 'interested'] } },
    });
    const cap = event.max_participants;
    if (status !== 'not going' && cap != null && cap > 0) {
      const wasActive = existing && ['going', 'interested'].includes(existing.status);
      const willBeActive = ['going', 'interested'].includes(status);
      if (willBeActive && !wasActive && activeCount >= cap) {
        return res.status(400).json({ status: false, message: 'This event is full.' });
      }
    }

    const [row, created] = await db.EventParticipant.findOrCreate({
      where: { event_id: id, user_id: userId },
      defaults: { status, joined_at: new Date() },
    });
    if (!created) {
      await row.update({ status, joined_at: new Date() });
    }

    return res.status(200).json({ status: true, message: 'Registration saved.', data: { status: row.status } });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(200).json({ status: true, message: 'Already registered.' });
    }
    console.error('registerForEvent', err);
    return res.status(500).json({ status: false, message: 'Error registering.', error: err.message });
  }
};

exports.unregisterFromEvent = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const n = await db.EventParticipant.destroy({ where: { event_id: id, user_id: userId } });
    if (!n) {
      return res.status(200).json({ status: true, message: 'Not registered.' });
    }
    return res.status(200).json({ status: true, message: 'Registration removed.' });
  } catch (err) {
    console.error('unregisterFromEvent', err);
    return res.status(500).json({ status: false, message: 'Error removing registration.', error: err.message });
  }
};

exports.getUserRegistered = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status } = req.query;
  try {
    const lim = Math.min(100, parseInt(String(limit), 10) || 20);
    const pg = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pg - 1) * lim;

    const partWhere = { user_id: userId };
    if (status && VALID_STATUSES.has(String(status))) {
      partWhere.status = status;
    }

    const { count, rows } = await db.EventParticipant.findAndCountAll({
      where: partWhere,
      include: [
        {
          model: db.Event,
          as: 'event',
          required: true,
          include: [
            {
              model: db.User,
              as: 'creator',
              attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
            },
          ],
        },
      ],
      order: [[{ model: db.Event, as: 'event' }, 'date', 'ASC']],
      offset,
      limit: lim,
    });

    const ids = rows.map((r) => r.event_id).filter(Boolean);
    const counts = await participantCountsForEvents(ids);
    const events = rows
      .map((r) => r.event)
      .filter(Boolean)
      .map((ev) => mapEventRow(ev, counts, ev.creator?.get?.({ plain: true }) || ev.creator));

    return res.status(200).json({
      status: true,
      data: {
        events,
        total: count,
        page: pg,
        limit: lim,
        pagination: { total: count, page: pg, pages: Math.ceil(count / lim) || 1 },
      },
    });
  } catch (err) {
    console.error('getUserRegistered', err);
    return res.status(500).json({ status: false, message: 'Error fetching registrations.', error: err.message });
  }
};

exports.getUserOrganized = async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20 } = req.query;
  try {
    const lim = Math.min(100, parseInt(String(limit), 10) || 20);
    const pg = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pg - 1) * lim;

    const { count, rows } = await db.Event.findAndCountAll({
      where: { created_by: userId },
      include: [
        { model: db.User, as: 'creator', attributes: ['id', 'first_name', 'last_name', 'profile_picture'] },
      ],
      order: [
        ['date', 'DESC'],
        ['start_time', 'DESC'],
      ],
      offset,
      limit: lim,
    });

    const ids = rows.map((r) => r.id);
    const counts = await participantCountsForEvents(ids);
    const events = rows.map((r) => mapEventRow(r, counts, r.creator?.get?.({ plain: true }) || r.creator));

    return res.status(200).json({
      status: true,
      data: {
        events,
        total: count,
        page: pg,
        limit: lim,
        pagination: { total: count, page: pg, pages: Math.ceil(count / lim) || 1 },
      },
    });
  } catch (err) {
    console.error('getUserOrganized', err);
    return res.status(500).json({ status: false, message: 'Error fetching your events.', error: err.message });
  }
};

exports.getEventRegistrations = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { page = 1, limit = 50, status } = req.query;
  try {
    const event = await db.Event.findByPk(id);
    if (!event) return res.status(404).json({ status: false, message: 'Event not found.' });
    if (event.created_by !== userId) {
      return res.status(403).json({ status: false, message: 'Only the organizer can view registrations.' });
    }

    const lim = Math.min(200, parseInt(String(limit), 10) || 50);
    const pg = Math.max(1, parseInt(String(page), 10) || 1);
    const offset = (pg - 1) * lim;
    const where = { event_id: id };
    if (status && VALID_STATUSES.has(String(status))) where.status = status;

    const { count, rows } = await db.EventParticipant.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture'],
        },
      ],
      order: [['joined_at', 'DESC']],
      offset,
      limit: lim,
    });

    const registrations = rows.map((r) => {
      const u = r.user?.get?.({ plain: true }) || r.user;
      const name = u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : 'User';
      return {
        id: r.id,
        event_id: r.event_id,
        user_id: r.user_id,
        user_name: name,
        user_avatar: u?.profile_picture || '',
        registration_date: r.joined_at,
        status: r.status,
      };
    });

    return res.status(200).json({
      status: true,
      data: {
        registrations,
        total: count,
        page: pg,
        limit: lim,
      },
    });
  } catch (err) {
    console.error('getEventRegistrations', err);
    return res.status(500).json({ status: false, message: 'Error fetching registrations.', error: err.message });
  }
};

exports.updateRegistrationStatus = async (req, res) => {
  const userId = req.user.id;
  const { id, registrationId } = req.params;
  const { status } = req.body || {};
  if (!status || !VALID_STATUSES.has(String(status))) {
    return res.status(400).json({ status: false, message: 'Invalid status.' });
  }
  try {
    const event = await db.Event.findByPk(id);
    if (!event) return res.status(404).json({ status: false, message: 'Event not found.' });
    if (event.created_by !== userId) {
      return res.status(403).json({ status: false, message: 'Forbidden.' });
    }
    const reg = await db.EventParticipant.findOne({
      where: { id: registrationId, event_id: id },
    });
    if (!reg) return res.status(404).json({ status: false, message: 'Registration not found.' });
    await reg.update({ status: String(status) });
    return res.status(200).json({ status: true, message: 'Updated.' });
  } catch (err) {
    console.error('updateRegistrationStatus', err);
    return res.status(500).json({ status: false, message: 'Error updating registration.', error: err.message });
  }
};

const STATIC_CATEGORIES = [
  { id: '1', name: 'Conference', description: '', icon: 'graduation-cap', color: 'blue' },
  { id: '2', name: 'Workshop', description: '', icon: 'code', color: 'green' },
  { id: '3', name: 'Recruitment', description: '', icon: 'briefcase', color: 'purple' },
  { id: '4', name: 'Hackathon', description: '', icon: 'trophy', color: 'orange' },
  { id: '5', name: 'Networking', description: '', icon: 'network', color: 'pink' },
  { id: '6', name: 'Seminar', description: '', icon: 'calendar', color: 'gray' },
];

const STATIC_TYPES = [
  { id: 'seminar', name: 'Seminar', description: 'Talks and presentations' },
  { id: 'workshop', name: 'Workshop', description: 'Hands-on sessions' },
  { id: 'conference', name: 'Conference', description: 'Multi-track events' },
  { id: 'networking', name: 'Networking', description: 'Meet and connect' },
  { id: 'recruitment', name: 'Recruitment', description: 'Hiring and placements' },
];

exports.getCategories = async (req, res) => {
  return res.status(200).json({ status: true, data: { categories: STATIC_CATEGORIES } });
};

exports.getTypes = async (req, res) => {
  return res.status(200).json({ status: true, data: { types: STATIC_TYPES } });
};

exports.getEventAnalytics = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const event = await db.Event.findByPk(id);
    if (!event) return res.status(404).json({ status: false, message: 'Event not found.' });
    if (event.created_by !== userId) {
      return res.status(403).json({ status: false, message: 'Forbidden.' });
    }
    const [going, interested, notGoing, total] = await Promise.all([
      db.EventParticipant.count({ where: { event_id: id, status: 'going' } }),
      db.EventParticipant.count({ where: { event_id: id, status: 'interested' } }),
      db.EventParticipant.count({ where: { event_id: id, status: 'not going' } }),
      db.EventParticipant.count({ where: { event_id: id } }),
    ]);
    return res.status(200).json({
      status: true,
      data: {
        total_registrations: total,
        confirmed_registrations: going,
        pending_registrations: interested,
        cancelled_registrations: notGoing,
        registration_trend: [],
        demographics: { age_groups: [], locations: [] },
      },
    });
  } catch (err) {
    console.error('getEventAnalytics', err);
    return res.status(500).json({ status: false, message: 'Error fetching analytics.', error: err.message });
  }
};

exports.notImplemented = async (req, res) => {
  return res.status(501).json({ status: false, message: 'Not implemented.' });
};
