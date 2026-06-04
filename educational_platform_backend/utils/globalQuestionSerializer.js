const db = require('../database/index');
const { resolveMediaUrl } = require('./resolveMediaUrl');

const USER_ATTRS = ['id', 'first_name', 'last_name', 'profile_picture', 'user_type', 'tenant_id', 'bio'];

function shapeUser(user, tenantMap = {}) {
  if (!user) return null;
  const plain = user.get ? user.get({ plain: true }) : user;
  const tid = plain.tenant_id != null ? String(plain.tenant_id) : '';
  const tenant = tid && tenantMap[tid] ? tenantMap[tid] : null;
  const td = plain.teacherDetails;
  return {
    id: plain.id,
    first_name: plain.first_name,
    last_name: plain.last_name,
    profile_picture: plain.profile_picture ? resolveMediaUrl(plain.profile_picture) : null,
    user_type: plain.user_type,
    tenant_id: tid || null,
    college_name: tenant?.name || null,
    department: td?.department || null,
    designation: td?.designation || null,
    expertise: Array.isArray(td?.area_of_expertise) ? td.area_of_expertise : [],
  };
}

function countArray(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

function userLiked(likes, userId) {
  if (!userId || !Array.isArray(likes)) return false;
  return likes.some((l) => String(l.user_id) === String(userId));
}

async function loadTenantMap(userRows) {
  const ids = new Set();
  const collect = (u) => {
    if (u?.tenant_id) ids.add(String(u.tenant_id));
  };
  (userRows || []).forEach(collect);
  if (!ids.size) return {};
  const tenants = await db.Tenant.findAll({
    where: { tenant_id: [...ids] },
    attributes: ['tenant_id', 'name', 'slug'],
  });
  const map = {};
  tenants.forEach((t) => {
    const p = t.get ? t.get({ plain: true }) : t;
    map[String(p.tenant_id)] = p;
  });
  return map;
}

function collectUsersFromQuestion(q) {
  const users = [];
  if (q.asker) users.push(q.asker);
  (q.answers || []).forEach((a) => {
    if (a.answerer) users.push(a.answerer);
    (a.mentions || []).forEach((m) => m.mentionedUser && users.push(m.mentionedUser));
    (a.comments || []).forEach((c) => c.user && users.push(c.user));
  });
  (q.comments || []).forEach((c) => c.user && users.push(c.user));
  (q.mentions || []).forEach((m) => m.mentionedUser && users.push(m.mentionedUser));
  return users;
}

function shapeComment(comment, tenantMap) {
  const plain = comment.get ? comment.get({ plain: true }) : comment;
  return {
    ...plain,
    user: shapeUser(plain.user, tenantMap),
  };
}

function buildAnswerCommentTree(comments, tenantMap) {
  const shaped = (comments || []).map((c) => {
    const s = shapeComment(c, tenantMap);
    return { ...s, replies: [] };
  });
  const byId = new Map();
  shaped.forEach((c) => byId.set(String(c.id), c));
  const roots = [];
  shaped.forEach((c) => {
    const pid = c.parent_id ? String(c.parent_id) : '';
    if (pid && byId.has(pid)) {
      byId.get(pid).replies.push(c);
    } else if (!pid) {
      roots.push(c);
    }
  });
  const sortAsc = (list) => {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    list.forEach((n) => sortAsc(n.replies || []));
  };
  sortAsc(roots);
  return roots;
}

function countFlatComments(comments) {
  return Array.isArray(comments) ? comments.length : 0;
}

function shapeAnswer(answer, viewerId, tenantMap) {
  const plain = answer.get ? answer.get({ plain: true }) : answer;
  const likes = plain.likes || [];
  const flatComments = plain.comments || [];
  const commentTree = buildAnswerCommentTree(flatComments, tenantMap);
  return {
    ...plain,
    answerer: shapeUser(plain.answerer, tenantMap),
    tags: Array.isArray(plain.tags) ? plain.tags : [],
    mentions: (plain.mentions || []).map((m) => ({
      ...m,
      mentionedUser: shapeUser(m.mentionedUser, tenantMap),
    })),
    likes_count: countArray(likes),
    comments_count: countFlatComments(flatComments),
    comments: commentTree,
    is_liked: userLiked(likes, viewerId),
    likes: undefined,
  };
}

function shapeQuestion(question, viewerId, tenantMap, { includeAnswers = true } = {}) {
  const plain = question.get ? question.get({ plain: true }) : question;
  const likes = plain.likes || [];
  const answers = plain.answers || [];
  const shaped = {
    ...plain,
    asker: plain.is_anonymous ? null : shapeUser(plain.asker, tenantMap),
    likes_count: countArray(likes),
    comments_count: countArray(plain.comments),
    answers_count: countArray(answers),
    is_liked: userLiked(likes, viewerId),
    mentions: (plain.mentions || []).map((m) => ({
      ...m,
      mentionedUser: shapeUser(m.mentionedUser, tenantMap),
    })),
    likes: undefined,
  };
  if (includeAnswers) {
    shaped.answers = answers
      .map((a) => shapeAnswer(a, viewerId, tenantMap))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else {
    shaped.answers = answers.slice(0, 1).map((a) => shapeAnswer(a, viewerId, tenantMap));
    shaped.answers_count = shaped.answers_count || countArray(answers);
  }
  if (plain.comments) {
    shaped.comments = plain.comments.map((c) => ({
      ...c,
      user: shapeUser(c.user, tenantMap),
    }));
  }
  return shaped;
}

async function serializeQuestions(rows, viewerId, opts = {}) {
  const users = rows.flatMap(collectUsersFromQuestion);
  const tenantMap = await loadTenantMap(users);
  return rows.map((q) => shapeQuestion(q, viewerId, tenantMap, opts));
}

async function serializeQuestion(row, viewerId) {
  const [one] = await serializeQuestions([row], viewerId, { includeAnswers: true });
  return one;
}

function userInclude(as = 'asker') {
  return {
    model: db.User,
    as,
    attributes: USER_ATTRS,
    include: [
      {
        model: db.TeacherDetail,
        as: 'teacherDetails',
        attributes: ['department', 'designation', 'area_of_expertise'],
        required: false,
      },
    ],
  };
}

module.exports = {
  USER_ATTRS,
  userInclude,
  shapeUser,
  shapeQuestion,
  shapeAnswer,
  serializeQuestions,
  serializeQuestion,
  loadTenantMap,
};
