const skillsService = require('../services/skillsService');

exports.suggestSkills = async (req, res) => {
  try {
    const q = String(req.query.q || req.query.query || '').trim();
    const limit = req.query.limit;
    const scope = String(req.query.scope || 'profile').toLowerCase();
    const result = await skillsService.searchSkillSuggestions(q, {
      userId: scope === 'profile' ? req.user.id : undefined,
      limit,
    });
    return res.status(200).json({
      status: true,
      data: result,
    });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({
      status: false,
      message: e.message || 'Suggestion search failed.',
      code: e.code,
    });
  }
};
