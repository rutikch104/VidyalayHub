const db = require('../database/index');

async function loadUserWithDetails(userId) {
  return db.User.findByPk(userId, {
    attributes: { exclude: ['password_hash'] },
    include: [
      { model: db.StudentDetail, as: 'studentDetails', required: false },
      { model: db.TeacherDetail, as: 'teacherDetails', required: false },
      { model: db.AlumniDetail, as: 'alumniDetails', required: false },
    ],
  });
}

async function fullProfilePayload(userId) {
  const user = await loadUserWithDetails(userId);
  if (!user) return null;
  const { buildProfilePayload } = require('./userApiController');
  return buildProfilePayload(user, { includePrivate: true });
}

async function respondProfile(req, res, status = 200, message) {
  const data = await fullProfilePayload(req.user.id);
  if (!data) return res.status(404).json({ status: false, message: 'User not found.' });
  const out = { status: true, data };
  if (message) out.message = message;
  return res.status(status).json(out);
}

function normalizeTechnologies(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((t) => String(t || '').trim()).filter(Boolean);
  if (typeof raw === 'string') {
    return raw.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parseSkillLevel(level) {
  if (level === undefined || level === null || level === '') return null;
  const lvl = parseInt(String(level), 10);
  if (Number.isNaN(lvl)) return NaN;
  return lvl;
}

function projectToClient(row) {
  const x = row.get ? row.get({ plain: true }) : row;
  const tech = Array.isArray(x.technologies) ? x.technologies : [];
  return {
    id: String(x.id),
    title: x.title,
    description: x.description || '',
    technologies: tech,
    status: x.status || 'Completed',
    image_url: x.image_url || '',
    github_url: x.github_url || '',
    live_url: x.live_url || '',
  };
}

function publicationToClient(row) {
  const x = row.get ? row.get({ plain: true }) : row;
  return {
    id: String(x.id),
    title: x.title,
    venue: x.venue || '',
    year: x.year || '',
    description: x.description || '',
    url: x.url || '',
  };
}

exports.putProfileAbout = async (req, res) => {
  try {
    const { bio, location, headline, website } = req.body;
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ status: false, message: 'User not found.' });

    const uUp = {};
    if (bio !== undefined) uUp.bio = String(bio || '').trim() || null;
    if (location !== undefined) uUp.location = String(location || '').trim() || null;
    if (website !== undefined) uUp.website_url = String(website || '').trim() || null;
    if (Object.keys(uUp).length) await user.update(uUp);

    const [row] = await db.UserAbout.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { user_id: req.user.id },
    });
    const aUp = { updated_at: new Date() };
    if (bio !== undefined) aUp.bio = String(bio || '').trim() || null;
    if (location !== undefined) aUp.location = String(location || '').trim() || null;
    if (headline !== undefined) aUp.headline = String(headline || '').trim() || null;
    if (website !== undefined) aUp.website = String(website || '').trim() || null;
    await row.update(aUp);

    return respondProfile(req, res, 200, 'About updated.');
  } catch (e) {
    console.error('putProfileAbout', e);
    return res.status(500).json({ status: false, message: e.message || 'Update failed.' });
  }
};

exports.postProfileExperience = async (req, res) => {
  try {
    const { title, company, duration, description, sort_order } = req.body;
    const t = String(title || '').trim();
    if (!t) return res.status(400).json({ status: false, message: 'title is required.' });
    const row = await db.UserExperience.create({
      user_id: req.user.id,
      title: t,
      company: company != null ? String(company).trim() || null : null,
      duration: duration != null ? String(duration).trim() || null : null,
      description: description != null ? String(description).trim() || null : null,
      sort_order: sort_order != null ? parseInt(String(sort_order), 10) || 0 : 0,
    });
    const data = await fullProfilePayload(req.user.id);
    return res.status(201).json({
      status: true,
      message: 'Experience added.',
      item: row.get({ plain: true }),
      data,
    });
  } catch (e) {
    console.error('postProfileExperience', e);
    return res.status(500).json({ status: false, message: e.message || 'Create failed.' });
  }
};

exports.putProfileExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserExperience.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Experience not found.' });
    const { title, company, duration, description, sort_order } = req.body;
    const up = { updated_at: new Date() };
    if (title !== undefined) {
      const t = String(title || '').trim();
      if (!t) return res.status(400).json({ status: false, message: 'title cannot be empty.' });
      up.title = t;
    }
    if (company !== undefined) up.company = String(company || '').trim() || null;
    if (duration !== undefined) up.duration = String(duration || '').trim() || null;
    if (description !== undefined) up.description = String(description || '').trim() || null;
    if (sort_order !== undefined) up.sort_order = parseInt(String(sort_order), 10) || 0;
    await row.update(up);
    return respondProfile(req, res, 200, 'Experience updated.');
  } catch (e) {
    console.error('putProfileExperience', e);
    return res.status(500).json({ status: false, message: e.message || 'Update failed.' });
  }
};

exports.deleteProfileExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserExperience.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Experience not found.' });
    await row.destroy();
    return respondProfile(req, res, 200, 'Experience removed.');
  } catch (e) {
    console.error('deleteProfileExperience', e);
    return res.status(500).json({ status: false, message: e.message || 'Delete failed.' });
  }
};

exports.postProfileAchievement = async (req, res) => {
  try {
    const { title, description, sort_order } = req.body;
    const t = String(title || '').trim();
    if (!t) return res.status(400).json({ status: false, message: 'title is required.' });
    await db.UserAchievement.create({
      user_id: req.user.id,
      title: t,
      description: description != null ? String(description).trim() || null : null,
      sort_order: sort_order != null ? parseInt(String(sort_order), 10) || 0 : 0,
    });
    return respondProfile(req, res, 201, 'Achievement added.');
  } catch (e) {
    console.error('postProfileAchievement', e);
    return res.status(500).json({ status: false, message: e.message || 'Create failed.' });
  }
};

exports.putProfileAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserAchievement.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Achievement not found.' });
    const { title, description, sort_order } = req.body;
    const up = { updated_at: new Date() };
    if (title !== undefined) {
      const t = String(title || '').trim();
      if (!t) return res.status(400).json({ status: false, message: 'title cannot be empty.' });
      up.title = t;
    }
    if (description !== undefined) up.description = String(description || '').trim() || null;
    if (sort_order !== undefined) up.sort_order = parseInt(String(sort_order), 10) || 0;
    await row.update(up);
    return respondProfile(req, res, 200, 'Achievement updated.');
  } catch (e) {
    console.error('putProfileAchievement', e);
    return res.status(500).json({ status: false, message: e.message || 'Update failed.' });
  }
};

exports.deleteProfileAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserAchievement.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Achievement not found.' });
    await row.destroy();
    return respondProfile(req, res, 200, 'Achievement removed.');
  } catch (e) {
    console.error('deleteProfileAchievement', e);
    return res.status(500).json({ status: false, message: e.message || 'Delete failed.' });
  }
};

exports.postProfileSkill = async (req, res) => {
  try {
    const { skill_name, level, sort_order } = req.body;
    const name = String(skill_name || '').trim();
    if (!name) return res.status(400).json({ status: false, message: 'skill_name is required.' });
    const lvl = parseSkillLevel(level);
    if (lvl != null && (Number.isNaN(lvl) || lvl < 0 || lvl > 10)) {
      return res.status(400).json({ status: false, message: 'level must be between 0 and 10.' });
    }
    await db.UserSkill.create({
      user_id: req.user.id,
      skill_name: name,
      level: lvl == null || Number.isNaN(lvl) ? null : lvl,
      sort_order: sort_order != null ? parseInt(String(sort_order), 10) || 0 : 0,
    });
    return respondProfile(req, res, 201, 'Skill added.');
  } catch (e) {
    console.error('postProfileSkill', e);
    return res.status(500).json({ status: false, message: e.message || 'Create failed.' });
  }
};

exports.putProfileSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserSkill.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Skill not found.' });
    const { skill_name, level, sort_order } = req.body;
    const up = { updated_at: new Date() };
    if (skill_name !== undefined) {
      const name = String(skill_name || '').trim();
      if (!name) return res.status(400).json({ status: false, message: 'skill_name cannot be empty.' });
      up.skill_name = name;
    }
    if (level !== undefined) {
      const lvl = parseSkillLevel(level);
      if (lvl !== null && (Number.isNaN(lvl) || lvl < 0 || lvl > 10)) {
        return res.status(400).json({ status: false, message: 'level must be between 0 and 10.' });
      }
      up.level = lvl === null || Number.isNaN(lvl) ? null : lvl;
    }
    if (sort_order !== undefined) up.sort_order = parseInt(String(sort_order), 10) || 0;
    await row.update(up);
    return respondProfile(req, res, 200, 'Skill updated.');
  } catch (e) {
    console.error('putProfileSkill', e);
    return res.status(500).json({ status: false, message: e.message || 'Update failed.' });
  }
};

exports.deleteProfileSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserSkill.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Skill not found.' });
    await row.destroy();
    return respondProfile(req, res, 200, 'Skill removed.');
  } catch (e) {
    console.error('deleteProfileSkill', e);
    return res.status(500).json({ status: false, message: e.message || 'Delete failed.' });
  }
};

exports.putProfileTeachingInfo = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ status: false, message: 'User not found.' });
    if (user.user_type !== 'teacher') {
      return res.status(403).json({ status: false, message: 'Teaching info is only for teacher accounts.' });
    }
    const { subjects, experience_years, notes } = req.body;
    const [row] = await db.UserTeachingInfo.findOrCreate({
      where: { user_id: req.user.id },
      defaults: { user_id: req.user.id, subjects: [] },
    });
    const up = { updated_at: new Date() };
    if (subjects !== undefined) {
      if (!Array.isArray(subjects)) {
        return res.status(400).json({ status: false, message: 'subjects must be an array of strings.' });
      }
      up.subjects = subjects.map((s) => String(s || '').trim()).filter(Boolean);
    }
    if (experience_years !== undefined) {
      const n = Number(experience_years);
      if (experience_years !== '' && experience_years != null && Number.isNaN(n)) {
        return res.status(400).json({ status: false, message: 'experience_years must be a number.' });
      }
      up.experience_years = experience_years === '' || experience_years == null ? null : n;
    }
    if (notes !== undefined) up.notes = String(notes || '').trim() || null;
    await row.update(up);
    return respondProfile(req, res, 200, 'Teaching info updated.');
  } catch (e) {
    console.error('putProfileTeachingInfo', e);
    return res.status(500).json({ status: false, message: e.message || 'Update failed.' });
  }
};

exports.getUserProjects = async (req, res) => {
  try {
    const { userId } = req.params;
    const rows = await db.UserProject.findAll({
      where: { user_id: userId },
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'ASC'],
      ],
    });
    return res.status(200).json({
      status: true,
      data: { projects: rows.map((r) => projectToClient(r)) },
    });
  } catch (e) {
    console.error('getUserProjects', e);
    return res.status(500).json({ status: false, message: e.message || 'Failed to load projects.' });
  }
};

exports.postProfileProject = async (req, res) => {
  try {
    const { title, description, technologies, status, image_url, github_url, live_url, sort_order } = req.body;
    const t = String(title || '').trim();
    if (!t) return res.status(400).json({ status: false, message: 'title is required.' });
    const row = await db.UserProject.create({
      user_id: req.user.id,
      title: t,
      description: description != null ? String(description).trim() || null : null,
      technologies: normalizeTechnologies(technologies),
      status: status != null ? String(status).trim() || 'Completed' : 'Completed',
      image_url: image_url != null ? String(image_url).trim() || null : null,
      github_url: github_url != null ? String(github_url).trim() || null : null,
      live_url: live_url != null ? String(live_url).trim() || null : null,
      sort_order: sort_order != null ? parseInt(String(sort_order), 10) || 0 : 0,
    });
    return res.status(201).json({
      status: true,
      message: 'Project added.',
      project: projectToClient(row),
    });
  } catch (e) {
    console.error('postProfileProject', e);
    return res.status(500).json({ status: false, message: e.message || 'Create failed.' });
  }
};

exports.putProfileProject = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserProject.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Project not found.' });
    const { title, description, technologies, status, image_url, github_url, live_url, sort_order } = req.body;
    const up = { updated_at: new Date() };
    if (title !== undefined) {
      const t = String(title || '').trim();
      if (!t) return res.status(400).json({ status: false, message: 'title cannot be empty.' });
      up.title = t;
    }
    if (description !== undefined) up.description = String(description || '').trim() || null;
    if (technologies !== undefined) up.technologies = normalizeTechnologies(technologies);
    if (status !== undefined) up.status = String(status || '').trim() || 'Completed';
    if (image_url !== undefined) up.image_url = String(image_url || '').trim() || null;
    if (github_url !== undefined) up.github_url = String(github_url || '').trim() || null;
    if (live_url !== undefined) up.live_url = String(live_url || '').trim() || null;
    if (sort_order !== undefined) up.sort_order = parseInt(String(sort_order), 10) || 0;
    await row.update(up);
    return res.status(200).json({ status: true, message: 'Project updated.', project: projectToClient(row) });
  } catch (e) {
    console.error('putProfileProject', e);
    return res.status(500).json({ status: false, message: e.message || 'Update failed.' });
  }
};

exports.deleteProfileProject = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserProject.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Project not found.' });
    await row.destroy();
    return res.status(200).json({ status: true, message: 'Project removed.' });
  } catch (e) {
    console.error('deleteProfileProject', e);
    return res.status(500).json({ status: false, message: e.message || 'Delete failed.' });
  }
};

exports.getUserPublications = async (req, res) => {
  try {
    const { userId } = req.params;
    const rows = await db.UserPublication.findAll({
      where: { user_id: userId },
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'DESC'],
      ],
    });
    return res.status(200).json({
      status: true,
      data: { publications: rows.map((r) => publicationToClient(r)) },
    });
  } catch (e) {
    console.error('getUserPublications', e);
    return res.status(500).json({ status: false, message: e.message || 'Failed to load publications.' });
  }
};

exports.postProfilePublication = async (req, res) => {
  try {
    const { title, venue, year, description, url, sort_order } = req.body;
    const t = String(title || '').trim();
    if (!t) return res.status(400).json({ status: false, message: 'title is required.' });
    const row = await db.UserPublication.create({
      user_id: req.user.id,
      title: t,
      venue: venue != null ? String(venue).trim() || null : null,
      year: year != null ? String(year).trim() || null : null,
      description: description != null ? String(description).trim() || null : null,
      url: url != null ? String(url).trim() || null : null,
      sort_order: sort_order != null ? parseInt(String(sort_order), 10) || 0 : 0,
    });
    return res.status(201).json({
      status: true,
      message: 'Publication added.',
      publication: publicationToClient(row),
    });
  } catch (e) {
    console.error('postProfilePublication', e);
    return res.status(500).json({ status: false, message: e.message || 'Create failed.' });
  }
};

exports.putProfilePublication = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserPublication.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Publication not found.' });
    const { title, venue, year, description, url, sort_order } = req.body;
    const up = { updated_at: new Date() };
    if (title !== undefined) {
      const t = String(title || '').trim();
      if (!t) return res.status(400).json({ status: false, message: 'title cannot be empty.' });
      up.title = t;
    }
    if (venue !== undefined) up.venue = String(venue || '').trim() || null;
    if (year !== undefined) up.year = String(year || '').trim() || null;
    if (description !== undefined) up.description = String(description || '').trim() || null;
    if (url !== undefined) up.url = String(url || '').trim() || null;
    if (sort_order !== undefined) up.sort_order = parseInt(String(sort_order), 10) || 0;
    await row.update(up);
    return res.status(200).json({
      status: true,
      message: 'Publication updated.',
      publication: publicationToClient(row),
    });
  } catch (e) {
    console.error('putProfilePublication', e);
    return res.status(500).json({ status: false, message: e.message || 'Update failed.' });
  }
};

exports.deleteProfilePublication = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await db.UserPublication.findOne({ where: { id, user_id: req.user.id } });
    if (!row) return res.status(404).json({ status: false, message: 'Publication not found.' });
    await row.destroy();
    return res.status(200).json({ status: true, message: 'Publication removed.' });
  } catch (e) {
    console.error('deleteProfilePublication', e);
    return res.status(500).json({ status: false, message: e.message || 'Delete failed.' });
  }
};
