const config = require('../db/config');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        logging: false, // Disable logging
        dialect: config.dialect,
        operatorsAliases: config.operatorAliases,
        pool: {
            max: parseInt(config.pool.max, 10) || 30,       // Default to 30 if not provided
            min: parseInt(config.pool.min, 10) || 10,       // Default to 10 if not provided
            acquire: parseInt(config.pool.acquire, 10) || 10000, // Default to 10000 ms if not provided
            idle: parseInt(config.pool.idle, 10) || 10000, 
        }
    }
);

const db = {};

// Import models
db.User = require('./models/user')(sequelize, DataTypes);
db.Role = require('./models/role')(sequelize, DataTypes);
db.Permission = require('./models/permission')(sequelize, DataTypes);
db.RolePermission = require('./models/role_permission')(sequelize, DataTypes);
db.StudentDetail = require('./models/student_details')(sequelize, DataTypes);
db.TeacherDetail = require('./models/teacher_details')(sequelize, DataTypes);
db.AlumniDetail = require('./models/allumini_details')(sequelize, DataTypes);
db.UserAbout = require('./models/user_about')(sequelize, DataTypes);
db.UserExperience = require('./models/user_experience')(sequelize, DataTypes);
db.UserEducation = require('./models/user_education')(sequelize, DataTypes);
db.UserEducationSkill = require('./models/user_education_skill')(sequelize, DataTypes);
db.UserAchievement = require('./models/user_achievement')(sequelize, DataTypes);
db.Skill = require('./models/skill')(sequelize, DataTypes);
db.UserSkill = require('./models/user_skill')(sequelize, DataTypes);
db.UserTeachingInfo = require('./models/user_teaching_info')(sequelize, DataTypes);
db.UserProject = require('./models/user_project')(sequelize, DataTypes);
db.UserPublication = require('./models/user_publication')(sequelize, DataTypes);
db.Tenant = require('./models/tenant')(sequelize, DataTypes);
db.TenantAddress = require('./models/tenant_address')(sequelize, DataTypes);
db.TenantAdmin = require('./models/tenant_admins')(sequelize, DataTypes);
db.TenantAcademic = require('./models/tenant_academics')(sequelize, DataTypes);
db.TenantVerification = require('./models/tenant_verification')(sequelize, DataTypes);
db.TenantNotice = require('./models/tenant_notice')(sequelize, DataTypes);
db.Post = require('./models/post')(sequelize, DataTypes);
db.Comment = require('./models/comments')(sequelize, DataTypes);
db.CommentLike = require('./models/comment_like')(sequelize, DataTypes);
db.MediaAsset = require('./models/media_asset')(sequelize, DataTypes);
db.Like = require('./models/likes')(sequelize, DataTypes);
db.ResourceLibrary = require('./models/resource_library')(sequelize, DataTypes);
db.ResourceLibraryLike = require('./models/resource_library_like')(sequelize, DataTypes);
db.ResourceLibraryReport = require('./models/resource_library_report')(sequelize, DataTypes);
// Register PostMention model used by Post associations
db.PostMention = require('./models/post_mention')(sequelize, DataTypes);
db.GlobalQuestion = require('./models/global_question')(sequelize, DataTypes);
db.GlobalAnswer = require('./models/global_answer')(sequelize, DataTypes);
db.QuestionMention = require('./models/question_mention')(sequelize, DataTypes);
db.AnswerMention = require('./models/answer_mention')(sequelize, DataTypes);
db.QuestionLike = require('./models/question_like')(sequelize, DataTypes);
db.AnswerLike = require('./models/answer_likes')(sequelize, DataTypes);
db.QuestionComment = require('./models/question_comments')(sequelize, DataTypes);
db.AnswerComment = require('./models/answer_comments')(sequelize, DataTypes);
db.AnswerCommentMention = require('./models/answer_comment_mention')(sequelize, DataTypes);
db.CommunityPostCommentMention = require('./models/community_post_comment_mention')(sequelize, DataTypes);
db.CommunityPostMention = require('./models/community_post_mention')(sequelize, DataTypes);
db.Attachment = require('./models/attachedment')(sequelize, DataTypes);
db.Bookmark = require('./models/bookmark')(sequelize, DataTypes);
db.Community = require('./models/community')(sequelize, DataTypes);
db.CommunityMember = require('./models/community_member')(sequelize, DataTypes);
db.CommunityPostLike = require('./models/community_post_like')(sequelize, DataTypes);
db.CommunityPost = require('./models/community_post')(sequelize, DataTypes);
db.CommunityPostComment = require('./models/community_post_comment')(sequelize, DataTypes);
db.MessageThread = require('./models/message_thread')(sequelize, DataTypes);
db.Message = require('./models/message')(sequelize, DataTypes);
db.MessageThreadParticipant = require('./models/message_thread_participant')(sequelize, DataTypes);
db.Notification = require('./models/notification')(sequelize, DataTypes);
db.NotificationSetting = require('./models/notification_setting')(sequelize, DataTypes);
db.JobPost = require('./models/job_post')(sequelize, DataTypes);
db.JobApplication = require('./models/job_application')(sequelize, DataTypes);
db.Event = require('./models/events')(sequelize, DataTypes);
db.EventParticipant = require('./models/event_participant')(sequelize, DataTypes);
db.Connection = require('./models/connection')(sequelize, DataTypes);
db.UserFollow = require('./models/user_follow')(sequelize, DataTypes);
db.UserBlock = require('./models/user_block')(sequelize, DataTypes);
db.mainAdmin = require('./models/mainAdmin')(sequelize, DataTypes);
db.superAdmin = require('./models/superAdmin')(sequelize, DataTypes);
db.collegeAdmin = require('./models/collegeAdmin')(sequelize, DataTypes);
db.InterviewType = require('./models/interview_type')(sequelize, DataTypes);
db.InterviewSession = require('./models/interview_session')(sequelize, DataTypes);
db.InterviewQuestion = require('./models/interview_question')(sequelize, DataTypes);
db.InterviewAnswer = require('./models/interview_answer')(sequelize, DataTypes);

// Associate models
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.Sequelize = Sequelize;
db.sequelize = sequelize;

module.exports = db;