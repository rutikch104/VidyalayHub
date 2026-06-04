const db = require('../database/index');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const { ilikeContainsPattern } = require('../utils/searchQuery');
const { descriptorFromMulterFile, processUploadedFiles } = require('../services/mediaUploadService');
const { resolveMediaUrl } = require('../utils/resolveMediaUrl');
const { recordMediaAsset } = require('../services/mediaAssetService');
const { mergeTenantWhere, denyIfCrossTenant, isPlatformUser } = require('../utils/tenantScope');
const { buildVisibilityWhere } = require('../utils/tenantVisibility');
const { tenantIdForCreate } = require('../utils/tenantHelpers');

function respondIfCrossTenant(res, req, resource) {
  const denial = denyIfCrossTenant(req, resource?.tenant_id);
  if (!denial) return false;
  res.status(denial.status).json({ status: false, message: denial.message });
  return true;
}

function canAccessJob(req, job) {
  if (!job || !job.is_active) return false;
  if (isPlatformUser(req.user)) return true;
  if (String(job.posted_by) === String(req.user.id)) return true;
  if (job.visibility === 'global') return true;
  const denial = denyIfCrossTenant(req, job.tenant_id);
  return !denial;
}

function normalizeJobType(raw) {
  if (!raw) return raw;
  const t = String(raw).toLowerCase().trim();
  if (t === 'internship') return 'intern';
  return t;
}

function normalizeExperienceLevel(raw) {
  const key = raw ? String(raw).toLowerCase().trim() : 'entry';
  const map = {
    entry: 'entry',
    junior: 'junior',
    mid: 'mid-level',
    'mid-level': 'mid-level',
    senior: 'senior',
    lead: 'lead',
    executive: 'executive',
  };
  return map[key] || 'entry';
}

function normalizeEducationLevel(raw) {
  const allowed = new Set(['high_school', 'associate', 'bachelor', 'master', 'phd', 'other']);
  const r = raw ? String(raw).toLowerCase().trim() : 'bachelor';
  if (allowed.has(r)) return r;
  return 'bachelor';
}

/** DB enum is college_only | global — map frontend public/private/college_only */
function normalizeJobVisibility(raw) {
  const v = raw ? String(raw).toLowerCase().trim() : 'college_only';
  if (v === 'public' || v === 'global') return 'global';
  return 'college_only';
}

const JOB_CATEGORIES = ['internship', 'full_time', 'part_time', 'contract', 'freelance', 'referral', 'campus'];

function normalizeCategory(raw) {
  if (!raw) return 'full_time';
  const c = String(raw).toLowerCase().trim().replace(/-/g, '_');
  if (c === 'intern') return 'internship';
  if (JOB_CATEGORIES.includes(c)) return c;
  return 'full_time';
}

function canPostJobs(user) {
  if (!user) return false;
  if (user.is_admin || isPlatformUser(user)) return true;
  const t = String(user.user_type || '').toLowerCase();
  return t === 'teacher' || t === 'alumni' || t === 'staff';
}

function shapeJobRow(job) {
  const plain = job.get ? job.get({ plain: true }) : job;
  if (plain.company_logo) {
    plain.company_logo = resolveMediaUrl(plain.company_logo) || plain.company_logo;
  }
  return plain;
}

async function resolveCompanyLogoFromUpload(req) {
  if (!req.files?.length) return req.body.company_logo || null;
  const logoFile = req.files.find((f) => f.fieldname === 'company_logo') || req.files[0];
  const descriptors = await processUploadedFiles([logoFile], 'attachment');
  const d = descriptors[0];
  return d?.url || d?.path || null;
}

// Create a new job posting
exports.createJob = async (req, res) => {
  const {
    company_name,
    location,
    description,
    requirements,
    responsibilities,
    benefits,
    salary_range,
    skills_required,
    tags,
    apply_url,
    application_deadline,
    is_remote,
    visa_sponsorship,
    relocation_assistance,
    contact_email,
    contact_phone,
    visibility: visibilityRaw,
  } = req.body;

  const title = req.body.title || req.body.job_title;
  const job_type = normalizeJobType(req.body.job_type);
  const experience_level = normalizeExperienceLevel(req.body.experience_level);
  const education_level = normalizeEducationLevel(req.body.education_level);
  const visibility = normalizeJobVisibility(visibilityRaw);

  const posted_by = req.user.id;
  let tenant_id = tenantIdForCreate(req);
  const category = normalizeCategory(req.body.category);
  let parsedSalary = salary_range;
  if (typeof parsedSalary === 'string') {
    try {
      parsedSalary = JSON.parse(parsedSalary);
    } catch {
      parsedSalary = {};
    }
  }

  try {
    if (!canPostJobs(req.user)) {
      return res.status(403).json({
        status: false,
        message: 'Only teachers, alumni, and staff can post job opportunities.',
      });
    }

    if (!tenant_id) {
      const u = await db.User.findByPk(posted_by, { attributes: ['tenant_id'] });
      tenant_id = u?.tenant_id || null;
    }
    if (!tenant_id) {
      return res.status(400).json({
        status: false,
        message: 'Your account must be linked to an organization to post jobs. Update your profile or contact support.',
      });
    }

    if (!title || !company_name || !job_type || !description) {
      return res.status(400).json({
        status: false,
        message: 'Title, company name, job type, and description are required.'
      });
    }

    const validJobTypes = ['full-time', 'part-time', 'intern', 'contract', 'freelance'];
    if (!validJobTypes.includes(job_type)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid job type. Must be full-time, part-time, intern (or internship), contract, or freelance.'
      });
    }

    const validExperienceLevels = ['entry', 'junior', 'mid-level', 'senior', 'lead', 'executive'];
    if (!validExperienceLevels.includes(experience_level)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid experience level.'
      });
    }

    const company_logo = await resolveCompanyLogoFromUpload(req);

    const job = await db.JobPost.create({
      tenant_id,
      posted_by,
      title,
      company_name,
      company_logo,
      category,
      job_type,
      location,
      description,
      requirements: requirements || [],
      responsibilities: responsibilities || [],
      benefits: benefits || [],
      salary_range: parsedSalary || {},
      experience_level,
      education_level,
      skills_required: skills_required || [],
      tags: tags || [],
      apply_url,
      application_deadline: application_deadline ? new Date(application_deadline) : null,
      is_remote: is_remote || false,
      visa_sponsorship: visa_sponsorship || false,
      relocation_assistance: relocation_assistance || false,
      contact_email: contact_email && String(contact_email).trim() ? String(contact_email).trim() : null,
      contact_phone,
      visibility,
      is_active: true
    });

    // Fetch job with creator details
    const jobWithDetails = await db.JobPost.findByPk(job.id, {
      include: [
        {
          model: db.User,
          as: 'poster',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        },
        {
          model: db.Tenant,
          as: 'tenant',
          attributes: ['name', 'type']
        }
      ]
    });

    return res.status(201).json({
      status: true,
      message: 'Job posting created successfully.',
      data: shapeJobRow(jobWithDetails),
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error creating job posting.',
      error: err.message
    });
  }
};

// Get all job postings with filters
exports.getJobs = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    location,
    job_type,
    experience_level,
    is_remote,
    company_name,
    skills,
    tags,
    category,
    sort = 'latest', // latest, deadline, salary_high, salary_low, trending
    tenant_id: filter_tenant_id
  } = req.query;

  try {
    const lim = Math.min(100, parseInt(String(limit), 10) || 10);
    const pg = parseInt(String(page), 10) || 1;
    const offset = (pg - 1) * lim;
    const andClauses = [];
    if (!isPlatformUser(req.user)) {
      andClauses.push(buildVisibilityWhere(req.user, { postedByField: 'posted_by' }));
    }

    // Apply filters (avoid iLike on ARRAY columns — breaks on Postgres)
    if (search) {
      const pat = ilikeContainsPattern(search);
      if (pat) {
        andClauses.push({
          [Op.or]: [
            { title: { [Op.iLike]: pat } },
            { description: { [Op.iLike]: pat } },
            { company_name: { [Op.iLike]: pat } },
          ],
        });
      }
    }

    const where = { is_active: true };
    if (andClauses.length) where[Op.and] = andClauses;
    if (filter_tenant_id && isPlatformUser(req.user)) where.tenant_id = filter_tenant_id;

    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (job_type) where.job_type = normalizeJobType(job_type);
    if (experience_level) where.experience_level = normalizeExperienceLevel(experience_level);
    if (is_remote !== undefined) where.is_remote = is_remote === 'true';
    if (company_name) where.company_name = { [Op.iLike]: `%${company_name}%` };
    if (filter_tenant_id && isPlatformUser(req.user)) where.tenant_id = filter_tenant_id;

    // Skills filter
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      where.skills_required = { [Op.overlap]: skillsArray };
    }

    // Tags filter
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      where.tags = { [Op.overlap]: tagsArray };
    }

    if (category) {
      where.category = normalizeCategory(category);
    }

    // Determine sorting
    let order = [];
    if (sort === 'trending') {
      order = [
        [db.sequelize.literal('(COALESCE(views_count, 0) + COALESCE(applications_count, 0) * 2)'), 'DESC'],
        ['created_at', 'DESC'],
      ];
    } else if (sort === 'deadline') {
      order = [['application_deadline', 'ASC'], ['created_at', 'DESC']];
    } else if (sort === 'salary_high') {
      order = [['salary_range', 'DESC'], ['created_at', 'DESC']];
    } else if (sort === 'salary_low') {
      order = [['salary_range', 'ASC'], ['created_at', 'DESC']];
    } else {
      order = [['created_at', 'DESC']];
    }

    const { count, rows } = await db.JobPost.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'poster',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        },
        {
          model: db.Tenant,
          as: 'tenant',
          attributes: ['name', 'type']
        }
      ],
      order,
      offset,
      limit: lim
    });

    return res.status(200).json({
      status: true,
      data: {
        jobs: rows.map(shapeJobRow),
        pagination: {
          total: count,
          page: pg,
          pages: Math.ceil(count / lim) || 1
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching job postings.',
      error: err.message
    });
  }
};

// Get a single job posting
exports.getJob = async (req, res) => {
  const { id } = req.params;

  try {
    const job = await db.JobPost.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'poster',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        },
        {
          model: db.Tenant,
          as: 'tenant',
          attributes: ['name', 'type']
        }
      ]
    });

    if (!job) {
      return res.status(404).json({
        status: false,
        message: 'Job posting not found.'
      });
    }

    if (!job.is_active) {
      return res.status(404).json({
        status: false,
        message: 'This job posting is no longer active.'
      });
    }

    if (!canAccessJob(req, job)) {
      return res.status(404).json({
        status: false,
        message: 'Job posting not found.',
      });
    }

    // Increment view count
    await job.increment('views_count');

    return res.status(200).json({
      status: true,
      data: shapeJobRow(job),
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching job posting.',
      error: err.message
    });
  }
};

// Update a job posting
exports.updateJob = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const user_id = req.user.id;

  try {
    const job = await db.JobPost.findOne({
      where: mergeTenantWhere({ id, posted_by: user_id, is_active: true }, req.user),
    });

    if (!job) {
      return res.status(404).json({
        status: false,
        message: 'Job posting not found or you do not have permission to edit it.'
      });
    }
    if (respondIfCrossTenant(res, req, job)) return;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.posted_by;
    delete updateData.tenant_id;
    delete updateData.created_at;

    if (updateData.job_title && !updateData.title) {
      updateData.title = updateData.job_title;
      delete updateData.job_title;
    }
    if (updateData.job_type) {
      updateData.job_type = normalizeJobType(updateData.job_type);
    }
    if (updateData.experience_level) {
      updateData.experience_level = normalizeExperienceLevel(updateData.experience_level);
    }
    if (updateData.education_level) {
      updateData.education_level = normalizeEducationLevel(updateData.education_level);
    }
    if (updateData.visibility !== undefined) {
      updateData.visibility = normalizeJobVisibility(updateData.visibility);
    }

    // Validate job type if provided
    if (updateData.job_type) {
      const validJobTypes = ['full-time', 'part-time', 'intern', 'contract', 'freelance'];
      if (!validJobTypes.includes(updateData.job_type)) {
        return res.status(400).json({
          status: false,
          message: 'Invalid job type.'
        });
      }
    }

    // Validate experience level if provided
    if (updateData.experience_level) {
      const validExperienceLevels = ['entry', 'junior', 'mid-level', 'senior', 'lead', 'executive'];
      if (!validExperienceLevels.includes(updateData.experience_level)) {
        return res.status(400).json({
          status: false,
          message: 'Invalid experience level.'
        });
      }
    }

    await job.update({
      ...updateData,
      updated_at: new Date()
    });

    // Fetch updated job with details
    const updatedJob = await db.JobPost.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'poster',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        },
        {
          model: db.Tenant,
          as: 'tenant',
          attributes: ['name', 'type']
        }
      ]
    });

    return res.status(200).json({
      status: true,
      message: 'Job posting updated successfully.',
      data: updatedJob
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error updating job posting.',
      error: err.message
    });
  }
};

// Delete a job posting (soft delete)
exports.deleteJob = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const job = await db.JobPost.findOne({
      where: mergeTenantWhere({ id, posted_by: user_id, is_active: true }, req.user),
    });

    if (!job) {
      return res.status(404).json({
        status: false,
        message: 'Job posting not found or you do not have permission to delete it.'
      });
    }
    if (respondIfCrossTenant(res, req, job)) return;

    await job.update({
      is_active: false,
      deleted_at: new Date()
    });

    return res.status(200).json({
      status: true,
      message: 'Job posting deleted successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error deleting job posting.',
      error: err.message
    });
  }
};

// Apply for a job
exports.applyForJob = async (req, res) => {
  const { id } = req.params;
  let {
    cover_letter,
    resume_url,
    portfolio_url,
    linkedin_url,
    github_url,
    expected_salary,
    availability_date,
    additional_notes
  } = req.body;

  if (req.file) {
    const resumeMedia = await descriptorFromMulterFile(req.file, 'resume');
    resume_url = resumeMedia.url;
    void recordMediaAsset(resumeMedia, {
      ownerId: req.user.id,
      category: 'resume',
      entityType: 'job_application',
    });
  }

  if (typeof expected_salary === 'string' && expected_salary.trim()) {
    try {
      expected_salary = JSON.parse(expected_salary);
    } catch {
      expected_salary = null;
    }
  }

  const applicant_id = req.user.id;

  try {
    // Check if job exists and is active
    const job = await db.JobPost.findOne({
      where: { id, is_active: true },
    });

    if (!job || !canAccessJob(req, job)) {
      return res.status(404).json({
        status: false,
        message: 'Job posting not found or is no longer active.'
      });
    }

    if (String(job.posted_by) === String(applicant_id)) {
      return res.status(400).json({
        status: false,
        message: 'You cannot apply to your own job posting.'
      });
    }

    // Check if application deadline has passed
    if (job.application_deadline && new Date() > new Date(job.application_deadline)) {
      return res.status(400).json({
        status: false,
        message: 'Application deadline has passed.'
      });
    }

    // Check if user has already applied
    const existingApplication = await db.JobApplication.findOne({
      where: { job_id: id, applicant_id }
    });

    if (existingApplication) {
      return res.status(400).json({
        status: false,
        message: 'You have already applied for this job.'
      });
    }

    // Create job application
    const application = await db.JobApplication.create({
      job_id: id,
      applicant_id,
      tenant_id: job.tenant_id || tenantIdForCreate(req),
      cover_letter,
      resume_url,
      portfolio_url,
      linkedin_url,
      github_url,
      expected_salary,
      availability_date: availability_date ? new Date(availability_date) : null,
      additional_notes,
      status: 'pending'
    });

    await job.increment('applications_count');

    // Create notification for job poster
    await NotificationService.createProfessionalNotification(
      job.posted_by,
      'job_application',
      applicant_id,
      id,
      { jobTitle: job.title }
    );

    // Fetch application with details
    const applicationWithDetails = await db.JobApplication.findByPk(application.id, {
      include: [
        {
          model: db.User,
          as: 'applicant',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type']
        },
        {
          model: db.JobPost,
          as: 'job',
          attributes: ['id', 'title', 'company_name']
        }
      ]
    });

    return res.status(201).json({
      status: true,
      message: 'Job application submitted successfully.',
      data: applicationWithDetails
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error submitting job application.',
      error: err.message
    });
  }
};

// Get job applications for a job posting (for job poster)
exports.getJobApplications = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  try {
    // Verify user is the job poster
    const job = await db.JobPost.findOne({
      where: mergeTenantWhere({ id, posted_by: user_id, is_active: true }, req.user),
    });

    if (!job) {
      return res.status(404).json({
        status: false,
        message: 'Job posting not found or you do not have permission to view applications.'
      });
    }
    if (respondIfCrossTenant(res, req, job)) return;

    const lim = Math.min(100, parseInt(String(limit), 10) || 10);
    const pg = parseInt(String(page), 10) || 1;
    const offset = (pg - 1) * lim;
    const where = { job_id: id };

    if (status) where.status = status;

    const { count, rows } = await db.JobApplication.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'applicant',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: lim
    });

    return res.status(200).json({
      status: true,
      data: {
        applications: rows,
        pagination: {
          total: count,
          page: pg,
          pages: Math.ceil(count / lim) || 1
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching job applications.',
      error: err.message
    });
  }
};

// Update application status (for job poster)
exports.updateApplicationStatus = async (req, res) => {
  const { id, application_id } = req.params;
  const { status, feedback, interview_date, interview_location } = req.body;
  const user_id = req.user.id;

  try {
    // Verify user is the job poster
    const job = await db.JobPost.findOne({
      where: mergeTenantWhere({ id, posted_by: user_id, is_active: true }, req.user),
    });

    if (!job) {
      return res.status(404).json({
        status: false,
        message: 'Job posting not found or you do not have permission to update applications.'
      });
    }
    if (respondIfCrossTenant(res, req, job)) return;

    // Find the application
    const application = await db.JobApplication.findOne({
      where: { id: application_id, job_id: id }
    });

    if (!application) {
      return res.status(404).json({
        status: false,
        message: 'Application not found.'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid status.'
      });
    }

    await application.update({
      status,
      feedback,
      interview_date: interview_date ? new Date(interview_date) : null,
      interview_location,
      updated_at: new Date()
    });

    const applicationFresh = await db.JobApplication.findByPk(application.id, {
      include: [
        {
          model: db.User,
          as: 'applicant',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture', 'user_type', 'email']
        }
      ]
    });

    // Create notification for applicant
    let notificationTitle, notificationBody;
    switch (status) {
      case 'shortlisted':
        notificationTitle = 'Application Shortlisted!';
        notificationBody = `Your application for ${job.title} has been shortlisted!`;
        break;
      case 'interviewed':
        notificationTitle = 'Interview Scheduled';
        notificationBody = `Interview scheduled for ${job.title}`;
        break;
      case 'accepted':
        notificationTitle = 'Application Accepted!';
        notificationBody = `Congratulations! Your application for ${job.title} has been accepted!`;
        break;
      case 'rejected':
        notificationTitle = 'Application Update';
        notificationBody = `Your application for ${job.title} was not selected.`;
        break;
      default:
        notificationTitle = 'Application Status Updated';
        notificationBody = `Your application for ${job.title} status has been updated to ${status}.`;
    }

    await NotificationService.createSystemNotification(
      application.applicant_id,
      'job_application',
      notificationTitle,
      notificationBody,
      `/jobs/${id}/applications/${application_id}`,
      { jobTitle: job.title, status }
    );

    return res.status(200).json({
      status: true,
      message: 'Application status updated successfully.',
      data: applicationFresh || application
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error updating application status.',
      error: err.message
    });
  }
};

// Get user's job applications
exports.getUserApplications = async (req, res) => {
  const user_id = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  try {
    const lim = Math.min(100, parseInt(String(limit), 10) || 10);
    const pg = parseInt(String(page), 10) || 1;
    const offset = (pg - 1) * lim;
    const where = { applicant_id: user_id };

    if (status) where.status = status;

    const { count, rows } = await db.JobApplication.findAndCountAll({
      where,
      include: [
        {
          model: db.JobPost,
          as: 'job',
          attributes: ['id', 'title', 'company_name', 'location', 'job_type', 'is_active']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit: lim
    });

    return res.status(200).json({
      status: true,
      data: {
        applications: rows,
        pagination: {
          total: count,
          page: pg,
          pages: Math.ceil(count / lim) || 1
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching your job applications.',
      error: err.message
    });
  }
};

/** Trending jobs by engagement (views + applications). */
exports.getTrendingJobs = async (req, res) => {
  req.query.sort = 'trending';
  req.query.limit = req.query.limit || 8;
  return exports.getJobs(req, res);
};

exports.getJobCategories = async (_req, res) => {
  return res.status(200).json({
    status: true,
    data: {
      categories: JOB_CATEGORIES.map((id) => ({
        id,
        label: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    },
  });
};

// Get popular job skills/tags
exports.getPopularJobSkills = async (req, res) => {
  try {
    const visibilityClause = isPlatformUser(req.user)
      ? {}
      : buildVisibilityWhere(req.user, { postedByField: 'posted_by' });
    const jobs = await db.JobPost.findAll({
      where: {
        is_active: true,
        ...(Object.keys(visibilityClause).length ? { [Op.and]: [visibilityClause] } : {}),
      },
      attributes: ['skills_required', 'tags'],
    });

    const skillCount = {};
    const tagCount = {};

    jobs.forEach(job => {
      if (job.skills_required) {
        job.skills_required.forEach(skill => {
          skillCount[skill] = (skillCount[skill] || 0) + 1;
        });
      }
      if (job.tags) {
        job.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
    });

    const popularSkills = Object.entries(skillCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }));

    const popularTags = Object.entries(tagCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    return res.status(200).json({
      status: true,
      data: {
        popular_skills: popularSkills,
        popular_tags: popularTags
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching popular job skills.',
      error: err.message
    });
  }
};

// Get job statistics
exports.getJobStats = async (req, res) => {
  const user_id = req.user.id;

  try {
    const myJobRows = await db.JobPost.findAll({
      where: mergeTenantWhere({ posted_by: user_id }, req.user),
      attributes: ['id'],
      raw: true,
    });
    const myJobIds = myJobRows.map((r) => r.id).filter(Boolean);
    const applications_received =
      myJobIds.length > 0
        ? await db.JobApplication.count({ where: { job_id: { [Op.in]: myJobIds } } })
        : 0;

    // Get user's posted jobs stats
    const postedJobsStats = await db.JobPost.findAll({
      where: mergeTenantWhere({ posted_by: user_id }, req.user),
      attributes: [
        'is_active',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['is_active']
    });

    // Get user's applications stats
    const applicationStats = await db.JobApplication.findAll({
      where: { applicant_id: user_id },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const stats = {
      posted_jobs: {
        total: 0,
        active: 0,
        inactive: 0
      },
      applications: {
        total: 0,
        pending: 0,
        reviewing: 0,
        shortlisted: 0,
        interviewed: 0,
        accepted: 0,
        rejected: 0
      }
    };

    postedJobsStats.forEach(stat => {
      const count = parseInt(stat.dataValues.count);
      stats.posted_jobs.total += count;
      if (stat.is_active) {
        stats.posted_jobs.active = count;
      } else {
        stats.posted_jobs.inactive = count;
      }
    });

    applicationStats.forEach(stat => {
      const count = parseInt(stat.dataValues.count);
      const status = stat.status;
      stats.applications.total += count;
      if (stats.applications.hasOwnProperty(status)) {
        stats.applications[status] = count;
      }
    });

    stats.applications_received = applications_received;

    return res.status(200).json({
      status: true,
      data: stats
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: 'Error fetching job statistics.',
      error: err.message
    });
  }
};
