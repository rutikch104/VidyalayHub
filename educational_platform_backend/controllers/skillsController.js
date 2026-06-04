const skillsService = require('../services/skillsService');

exports.suggestSkills = async (req, res) => {
  try {
    const q = String(req.query.q || req.query.query || '').trim();
    const limit = req.query.limit;
    const result = await skillsService.searchSkillSuggestions(q, {
      userId: req.user.id,
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
