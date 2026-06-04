const db = require('../database/index');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const { ilikeContainsPattern, normalizeSearchQuery, stripLikeMetacharacters } = require('../utils/searchQuery');
const {
  processUploadedFiles,
  toAttachmentShape,
} = require('../services/mediaUploadService');
const { recordMediaAsset } = require('../services/mediaAssetService');
const {
  userInclude,
  serializeQuestion,
  serializeQuestions,
} = require('../utils/globalQuestionSerializer');
const { mergeUniqueTags, stripHashtagsFromContent } = require('../utils/hashtagUtils');

function actorLabel(reqUser) {
  return [reqUser.first_name, reqUser.last_name].filter(Boolean).join(' ').trim() || reqUser.name || 'Someone';
}

function parseMentionedUsers(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}

function questionDetailIncludes() {
  return [
    userInclude('asker'),
    {
      model: db.QuestionMention,
      as: 'mentions',
      include: [userInclude('mentionedUser')],
    },
        {
          model: db.GlobalAnswer,
          as: 'answers',
          include: [
            userInclude('answerer'),
            { model: db.AnswerLike, as: 'likes', attributes: ['user_id'] },
            {
              model: db.AnswerMention,
              as: 'mentions',
              include: [userInclude('mentionedUser')],
            },
            {
              model: db.AnswerComment,
              as: 'comments',
              include: [userInclude('user')],
            },
            { model: db.Attachment, as: 'attachments' },
          ],
        },
    { model: db.QuestionLike, as: 'likes', attributes: ['user_id'] },
    {
      model: db.QuestionComment,
      as: 'comments',
      include: [userInclude('user')],
    },
    { model: db.Attachment, as: 'attachments' },
  ];
}

// Create a new question
exports.createQuestion = async (req, res) => {
    const {
        title,
        description,
        tags,
        is_anonymous,
        mentioned_users: mentionedRaw
    } = req.body;

    const mentioned_users = parseMentionedUsers(mentionedRaw);

    try {
        const result = await db.sequelize.transaction(async (t) => {
            // Create question
            const question = await db.GlobalQuestion.create({
                asked_by: req.user.id,
                title,
                description,
                tags: mergeUniqueTags(parseTags(tags), description),
                is_anonymous: is_anonymous === 'true' || is_anonymous === true
            }, { transaction: t });

            if (req.files?.length) {
                const descriptors = await processUploadedFiles(req.files, 'attachment');
                const attachments = descriptors.map((d) =>
                    toAttachmentShape(d, 'question', question.id, req.user.id),
                );
                await db.Attachment.bulkCreate(attachments, { transaction: t });
                for (const d of descriptors) {
                    void recordMediaAsset(d, {
                        ownerId: req.user.id,
                        category: 'attachment',
                        entityType: 'global_question',
                        entityId: question.id,
                    });
                }
            }

            // Handle mentions if any
            if (mentioned_users && mentioned_users.length > 0) {
                const mentions = mentioned_users.map(user_id => ({
                    question_id: question.id,
                    mentioned_user: user_id
                }));

                await db.QuestionMention.bulkCreate(mentions, { transaction: t });

                const mentionRows = [];
                for (const user_id of mentioned_users) {
                    if (String(user_id) === String(req.user.id)) continue;
                    const ok = await NotificationService.shouldSendNotification(user_id, 'mention');
                    if (!ok) continue;
                    mentionRows.push({
                        user_id,
                        type: 'mention',
                        title: 'You were mentioned in a question',
                        body: `${actorLabel(req.user)} mentioned you in a question: ${title}`,
                        link_url: `/questions/${question.id}`,
                        metadata: { actor_id: req.user.id, target_id: question.id, context: 'question' },
                    });
                }
                if (mentionRows.length) {
                    await db.Notification.bulkCreate(mentionRows, { transaction: t });
                }
            }

            return question;
        });

        // Fetch question with associations
        const questionWithDetails = await db.GlobalQuestion.findByPk(result.id, {
            include: [
                userInclude('asker'),
                {
                    model: db.QuestionMention,
                    as: 'mentions',
                    include: [userInclude('mentionedUser')],
                },
                { model: db.Attachment, as: 'attachments' },
            ],
        });

        const data = await serializeQuestion(questionWithDetails, req.user.id);

        return res.status(201).json({
            status: true,
            message: 'Question created successfully',
            data,
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error creating question',
            error: err.message
        });
    }
};

// Get all questions with filters
exports.getQuestions = async (req, res) => {
    const {
        page = 1,
        limit = 10,
        search,
        tags,
        answered,
        user_id,
        status
    } = req.query;

    try {
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const lim = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));
        const offset = (pageNum - 1) * lim;
        const where = {};

        // Search in title and description
        if (search) {
            const pat = ilikeContainsPattern(search);
            if (pat) {
                where[Op.or] = [
                    { title: { [Op.iLike]: pat } },
                    { description: { [Op.iLike]: pat } },
                ];
            }
        }

        // Filter by tags
        if (tags) {
            where.tags = {
                [Op.overlap]: Array.isArray(tags) ? tags : [tags]
            };
        }

        // Filter by user
        if (user_id) {
            where.asked_by = user_id;
        }

        let answeredQuestionIds = null;
        if (status === 'open' || status === 'answered') {
            const rows = await db.GlobalAnswer.findAll({
                attributes: ['question_id'],
                group: ['question_id'],
                raw: true,
            });
            answeredQuestionIds = [...new Set(rows.map((r) => r.question_id).filter(Boolean))];
        }

        if (status === 'open') {
            if (answeredQuestionIds.length) {
                where.id = { [Op.notIn]: answeredQuestionIds };
            }
        } else if (status === 'answered') {
            if (!answeredQuestionIds.length) {
                return res.status(200).json({
                    status: true,
                    data: {
                        questions: [],
                        pagination: {
                            total: 0,
                            page: pageNum,
                            pages: 0,
                        },
                    },
                });
            }
            where.id = { [Op.in]: answeredQuestionIds };
            where.is_resolved = false;
        } else if (status === 'resolved') {
            where.is_resolved = true;
        }

        const include = [
            userInclude('asker'),
            {
                model: db.QuestionMention,
                as: 'mentions',
                include: [userInclude('mentionedUser')],
            },
            {
                model: db.GlobalAnswer,
                as: 'answers',
                separate: true,
                attributes: ['id'],
            },
            {
                model: db.QuestionLike,
                as: 'likes',
                attributes: ['user_id'],
            },
            {
                model: db.QuestionComment,
                as: 'comments',
                attributes: ['id'],
            },
            { model: db.Attachment, as: 'attachments' },
        ];

        if (!status && answered !== undefined && answered !== '') {
            const rows = await db.GlobalAnswer.findAll({
                attributes: ['question_id'],
                group: ['question_id'],
                raw: true,
            });
            const ids = [...new Set(rows.map((r) => r.question_id).filter(Boolean))];
            const wantAnswered = answered === 'true' || answered === true;
            if (wantAnswered) {
                if (!ids.length) {
                    return res.status(200).json({
                        status: true,
                        data: {
                            questions: [],
                            pagination: {
                                total: 0,
                                page: pageNum,
                                pages: 0,
                            },
                        },
                    });
                }
                where.id = { [Op.in]: ids };
            } else if (ids.length) {
                where.id = { [Op.notIn]: ids };
            }
        }

        const { count, rows } = await db.GlobalQuestion.findAndCountAll({
            where,
            include,
            order: [['created_at', 'DESC']],
            offset,
            limit: lim,
            distinct: true
        });

        const questions = await serializeQuestions(rows, req.user.id, { includeAnswers: false });

        return res.status(200).json({
            status: true,
            data: {
                questions,
                pagination: {
                    total: count,
                    page: pageNum,
                    pages: Math.ceil(count / lim) || 1,
                },
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching questions',
            error: err.message
        });
    }
};

exports.updateQuestion = async (req, res) => {
    const { id } = req.params;
    const { is_resolved } = req.body;

    try {
        const question = await db.GlobalQuestion.findByPk(id);
        if (!question) {
            return res.status(404).json({ status: false, message: 'Question not found' });
        }

        const isAsker = String(question.asked_by) === String(req.user.id);
        const isTeacher = req.user.user_type === 'teacher';
        if (!isAsker && !isTeacher) {
            return res.status(403).json({
                status: false,
                message: 'Only the author or a teacher can update this question.',
            });
        }

        if (typeof is_resolved === 'boolean') {
            question.is_resolved = is_resolved;
            await question.save();
        }

        const updated = await db.GlobalQuestion.findByPk(id, {
            include: questionDetailIncludes(),
        });

        const data = await serializeQuestion(updated, req.user.id);

        return res.status(200).json({
            status: true,
            message: 'Question updated',
            data,
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error updating question',
            error: err.message,
        });
    }
};

// Get a single question with details
exports.getQuestion = async (req, res) => {
    const { id } = req.params;

    try {
        const question = await db.GlobalQuestion.findByPk(id, {
            include: questionDetailIncludes(),
        });

        if (!question) {
            return res.status(404).json({
                status: false,
                message: 'Question not found'
            });
        }

        const data = await serializeQuestion(question, req.user.id);

        return res.status(200).json({
            status: true,
            data,
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching question',
            error: err.message
        });
    }
};

// Add an answer to a question
exports.addAnswer = async (req, res) => {
    const { id } = req.params;
    const { content, tags: tagsRaw, mentioned_users: mentionedRaw } = req.body;

    try {
        if (!content || !String(content).trim()) {
            return res.status(400).json({ status: false, message: 'Answer content is required' });
        }

        const question = await db.GlobalQuestion.findByPk(id);

        if (!question) {
            return res.status(404).json({
                status: false,
                message: 'Question not found'
            });
        }

        const mergedTags = mergeUniqueTags(tagsRaw, content);
        const cleanContent = stripHashtagsFromContent(content) || String(content).trim();
        const mentioned_users = [...new Set(parseMentionedUsers(mentionedRaw).map(String))];

        const result = await db.sequelize.transaction(async (t) => {
            const answer = await db.GlobalAnswer.create({
                question_id: id,
                answered_by: req.user.id,
                content: cleanContent,
                tags: mergedTags.length ? mergedTags : null,
            }, { transaction: t });

            if (mentioned_users.length > 0) {
                const mentionRows = mentioned_users.map((user_id) => ({
                    answer_id: answer.id,
                    mentioned_user: user_id,
                }));
                await db.AnswerMention.bulkCreate(mentionRows, { transaction: t });

                const notifyRows = [];
                for (const user_id of mentioned_users) {
                    if (String(user_id) === String(req.user.id)) continue;
                    const ok = await NotificationService.shouldSendNotification(user_id, 'mention');
                    if (!ok) continue;
                    notifyRows.push({
                        user_id,
                        type: 'mention',
                        title: 'You were mentioned in an answer',
                        body: `${actorLabel(req.user)} mentioned you in an answer`,
                        link_url: `/questions/${id}#answer-${answer.id}`,
                        metadata: {
                            actor_id: req.user.id,
                            target_id: id,
                            answer_id: answer.id,
                        },
                    });
                }
                if (notifyRows.length) {
                    await db.Notification.bulkCreate(notifyRows, { transaction: t });
                }
            }

            if (req.files?.length) {
                const descriptors = await processUploadedFiles(req.files, 'attachment');
                const attachments = descriptors.map((d) =>
                    toAttachmentShape(d, 'answer', answer.id, req.user.id),
                );
                await db.Attachment.bulkCreate(attachments, { transaction: t });
                for (const d of descriptors) {
                    void recordMediaAsset(d, {
                        ownerId: req.user.id,
                        category: 'attachment',
                        entityType: 'global_answer',
                        entityId: answer.id,
                    });
                }
            }

            if (question.asked_by !== req.user.id) {
                const ok = await NotificationService.shouldSendNotification(question.asked_by, 'answer');
                if (ok) {
                    await db.Notification.create({
                        user_id: question.asked_by,
                        type: 'answer',
                        title: 'Your question received an answer',
                        body: `${actorLabel(req.user)} answered your question`,
                        link_url: `/questions/${id}#answer-${answer.id}`,
                        metadata: { actor_id: req.user.id, target_id: id, answer_id: answer.id },
                    }, { transaction: t });
                }
            }

            return answer;
        });

        // Fetch answer with associations
        const answerWithDetails = await db.GlobalAnswer.findByPk(result.id, {
            include: [
                userInclude('answerer'),
                { model: db.AnswerLike, as: 'likes', attributes: ['user_id'] },
                {
                    model: db.AnswerMention,
                    as: 'mentions',
                    include: [userInclude('mentionedUser')],
                },
                { model: db.AnswerComment, as: 'comments', include: [userInclude('user')] },
                { model: db.Attachment, as: 'attachments' },
            ],
        });

        const { shapeAnswer, loadTenantMap } = require('../utils/globalQuestionSerializer');
        const tenantMap = await loadTenantMap([answerWithDetails.answerer].filter(Boolean));
        const data = shapeAnswer(answerWithDetails, req.user.id, tenantMap);

        return res.status(201).json({
            status: true,
            message: 'Answer added successfully',
            data,
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error adding answer',
            error: err.message
        });
    }
};

// Toggle like on question
exports.toggleQuestionLike = async (req, res) => {
    const { id } = req.params;

    try {
        const question = await db.GlobalQuestion.findByPk(id);

        if (!question) {
            return res.status(404).json({
                status: false,
                message: 'Question not found'
            });
        }

        const existingLike = await db.QuestionLike.findOne({
            where: {
                question_id: id,
                user_id: req.user.id
            }
        });

        if (existingLike) {
            await existingLike.destroy();
            const likes_count = await db.QuestionLike.count({ where: { question_id: id } });
            return res.status(200).json({
                status: true,
                message: 'Question unliked successfully',
                data: { is_liked: false, likes_count },
            });
        }

        await db.QuestionLike.create({
            question_id: id,
            user_id: req.user.id
        });

        if (question.asked_by !== req.user.id) {
            const ok = await NotificationService.shouldSendNotification(question.asked_by, 'like');
            if (ok) {
                await db.Notification.create({
                    user_id: question.asked_by,
                    type: 'like',
                    title: 'Your question received a like',
                    body: `${actorLabel(req.user)} liked your question`,
                    link_url: `/questions/${id}`,
                    metadata: { actor_id: req.user.id, target_id: id, context: 'question' },
                });
            }
        }

        const likes_count = await db.QuestionLike.count({ where: { question_id: id } });

        return res.status(200).json({
            status: true,
            message: 'Question liked successfully',
            data: { is_liked: true, likes_count },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error toggling question like',
            error: err.message
        });
    }
};

// Add comment to question
exports.addQuestionComment = async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;

    try {
        const question = await db.GlobalQuestion.findByPk(id);

        if (!question) {
            return res.status(404).json({
                status: false,
                message: 'Question not found'
            });
        }

        const comment = await db.QuestionComment.create({
            question_id: id,
            user_id: req.user.id,
            text
        });

        if (question.asked_by !== req.user.id) {
            const ok = await NotificationService.shouldSendNotification(question.asked_by, 'comment');
            if (ok) {
                await db.Notification.create({
                    user_id: question.asked_by,
                    type: 'comment',
                    title: 'New comment on your question',
                    body: `${actorLabel(req.user)} commented on your question`,
                    link_url: `/questions/${id}`,
                    metadata: { actor_id: req.user.id, target_id: id, context: 'question' },
                });
            }
        }

        // Fetch comment with user details
        const commentWithUser = await db.QuestionComment.findByPk(comment.id, {
            include: [userInclude('user')],
        });

        const { shapeUser, loadTenantMap } = require('../utils/globalQuestionSerializer');
        const tenantMap = await loadTenantMap([commentWithUser.user].filter(Boolean));
        const plain = commentWithUser.get({ plain: true });
        plain.user = shapeUser(plain.user, tenantMap);

        return res.status(201).json({
            status: true,
            message: 'Comment added successfully',
            data: plain,
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error adding comment',
            error: err.message
        });
    }
};

/** Global teacher search for @-tagging (no tenant filter). */
exports.searchTeachersForTagging = async (req, res) => {
    try {
        const needle = normalizeSearchQuery(req.query.q || req.query.search);
        const inner = stripLikeMetacharacters(needle);
        const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
        const limit = Math.min(30, Math.max(1, parseInt(String(req.query.limit), 10) || 12));
        const offset = (page - 1) * limit;

        if (!inner) {
            return res.status(200).json({
                status: true,
                data: { teachers: [], pagination: { total: 0, page, pages: 1, limit } },
            });
        }

        const pat = ilikeContainsPattern(inner);
        if (!pat) {
            return res.status(200).json({
                status: true,
                data: { teachers: [], pagination: { total: 0, page, pages: 1, limit } },
            });
        }

        const { count, rows } = await db.User.findAndCountAll({
            where: {
                user_type: 'teacher',
                is_approved: true,
                id: { [Op.ne]: req.user.id },
                [Op.or]: [
                    { first_name: { [Op.iLike]: pat } },
                    { last_name: { [Op.iLike]: pat } },
                    { email: { [Op.iLike]: pat } },
                ],
            },
            attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type', 'tenant_id', 'bio'],
            include: [
                {
                    model: db.TeacherDetail,
                    as: 'teacherDetails',
                    attributes: ['department', 'designation', 'area_of_expertise'],
                    required: false,
                },
            ],
            order: [['first_name', 'ASC'], ['last_name', 'ASC']],
            limit,
            offset,
        });

        const { shapeUser, loadTenantMap } = require('../utils/globalQuestionSerializer');
        const tenantMap = await loadTenantMap(rows);
        const teachers = rows.map((u) => shapeUser(u, tenantMap));

        return res.status(200).json({
            status: true,
            data: {
                teachers,
                pagination: {
                    total: count,
                    page,
                    pages: Math.ceil(count / limit) || 1,
                    limit,
                },
            },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error searching teachers',
            error: err.message,
        });
    }
};

exports.toggleAnswerLike = async (req, res) => {
    const { questionId, answerId } = req.params;

    try {
        const answer = await db.GlobalAnswer.findOne({
            where: { id: answerId, question_id: questionId },
        });
        if (!answer) {
            return res.status(404).json({ status: false, message: 'Answer not found' });
        }

        const existing = await db.AnswerLike.findOne({
            where: { answer_id: answerId, user_id: req.user.id },
        });

        if (existing) {
            await existing.destroy();
            const likes_count = await db.AnswerLike.count({ where: { answer_id: answerId } });
            return res.status(200).json({
                status: true,
                data: { is_liked: false, likes_count },
            });
        }

        await db.AnswerLike.create({ answer_id: answerId, user_id: req.user.id });

        if (String(answer.answered_by) !== String(req.user.id)) {
            const ok = await NotificationService.shouldSendNotification(answer.answered_by, 'like');
            if (ok) {
                await db.Notification.create({
                    user_id: answer.answered_by,
                    type: 'like',
                    title: 'Your answer received a like',
                    body: `${actorLabel(req.user)} liked your answer`,
                    link_url: `/questions/${questionId}#answer-${answerId}`,
                    metadata: { actor_id: req.user.id, target_id: questionId, answer_id: answerId },
                });
            }
        }

        const likes_count = await db.AnswerLike.count({ where: { answer_id: answerId } });
        return res.status(200).json({
            status: true,
            data: { is_liked: true, likes_count },
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error toggling answer like',
            error: err.message,
        });
    }
};

exports.addAnswerComment = async (req, res) => {
    const { questionId, answerId } = req.params;
    const { text, parent_id: parentIdRaw, mentioned_users: mentionedRaw } = req.body;
    const { parseMentionedUsers, notifyMentionedUsers } = require('../utils/mentionNotify');
    const { stripHashtagsFromContent } = require('../utils/hashtagUtils');

    try {
        if (!text || !String(text).trim()) {
            return res.status(400).json({ status: false, message: 'Comment text is required' });
        }

        const mentioned_users = [...new Set(parseMentionedUsers(mentionedRaw).map(String))];
        const cleanText = stripHashtagsFromContent(text) || String(text).trim();

        const answer = await db.GlobalAnswer.findOne({
            where: { id: answerId, question_id: questionId },
        });
        if (!answer) {
            return res.status(404).json({ status: false, message: 'Answer not found' });
        }

        let parent_id = null;
        if (parentIdRaw) {
            const parent = await db.AnswerComment.findOne({
                where: { id: parentIdRaw, answer_id: answerId },
            });
            if (!parent) {
                return res.status(404).json({ status: false, message: 'Parent reply not found' });
            }
            parent_id = parent.id;
        }

        const comment = await db.AnswerComment.create({
            answer_id: answerId,
            user_id: req.user.id,
            text: cleanText,
            parent_id,
        });

        if (mentioned_users.length) {
            await db.AnswerCommentMention.bulkCreate(
                mentioned_users.map((mentioned_user) => ({
                    comment_id: comment.id,
                    mentioned_user,
                })),
            );
            await notifyMentionedUsers({
                mentionedUserIds: mentioned_users,
                reqUser: req.user,
                title: 'You were mentioned in a reply',
                body: `${actorLabel(req.user)} mentioned you in a discussion reply`,
                link_url: `/questions/${questionId}#answer-${answerId}`,
                metadata: {
                    question_id: questionId,
                    answer_id: answerId,
                    comment_id: comment.id,
                },
            });
        }

        const notifyUserId = parent_id
            ? (await db.AnswerComment.findByPk(parent_id, { attributes: ['user_id'] }))?.user_id
            : answer.answered_by;

        if (notifyUserId && String(notifyUserId) !== String(req.user.id)) {
            const ok = await NotificationService.shouldSendNotification(notifyUserId, 'comment');
            if (ok) {
                await db.Notification.create({
                    user_id: notifyUserId,
                    type: 'comment',
                    title: parent_id ? 'New reply to your comment' : 'New comment on your answer',
                    body: `${actorLabel(req.user)} replied to your ${parent_id ? 'comment' : 'answer'}`,
                    link_url: `/questions/${questionId}#answer-${answerId}`,
                    metadata: {
                        actor_id: req.user.id,
                        target_id: questionId,
                        answer_id: answerId,
                        comment_id: comment.id,
                        parent_id,
                    },
                });
            }
        }

        const commentWithUser = await db.AnswerComment.findByPk(comment.id, {
            include: [userInclude('user')],
        });

        const { shapeUser, loadTenantMap } = require('../utils/globalQuestionSerializer');
        const tenantMap = await loadTenantMap([commentWithUser.user].filter(Boolean));
        const plain = commentWithUser.get({ plain: true });
        plain.user = shapeUser(plain.user, tenantMap);

        return res.status(201).json({
            status: true,
            message: 'Comment added successfully',
            data: plain,
        });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error adding answer comment',
            error: err.message,
        });
    }
};

exports.getPopularQuestionTags = async (req, res) => {
    try {
        const qRaw = typeof req.query.q === 'string' ? req.query.q.trim().replace(/^#/, '') : '';
        const qLower = qRaw.toLowerCase();
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

        const [questions, answers] = await Promise.all([
            db.GlobalQuestion.findAll({
                attributes: ['tags'],
                where: { tags: { [Op.ne]: [] } },
            }),
            db.GlobalAnswer.findAll({
                attributes: ['tags'],
                where: { tags: { [Op.ne]: [] } },
            }),
        ]);

        /** key (lowercase) -> { tag: display label, count } */
        const tagCount = new Map();
        const ingest = (tag) => {
            const name = String(tag || '').trim().replace(/^#+/, '');
            if (!name) return;
            const key = name.toLowerCase();
            const existing = tagCount.get(key);
            if (existing) {
                existing.count += 1;
            } else {
                tagCount.set(key, { tag: name, count: 1 });
            }
        };

        questions.forEach((row) => (row.tags || []).forEach(ingest));
        answers.forEach((row) => (row.tags || []).forEach(ingest));

        let popular = [...tagCount.values()].sort((a, b) => b.count - a.count);

        if (qLower) {
            popular = popular.filter((entry) => entry.tag.toLowerCase().startsWith(qLower));
        }

        popular = popular.slice(0, limit);

        return res.status(200).json({ status: true, data: popular });
    } catch (err) {
        return res.status(500).json({
            status: false,
            message: 'Error fetching popular tags',
            error: err.message,
        });
    }
};
