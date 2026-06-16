const bcrypt = require('bcrypt');
const db = require('../database/index');
const { descriptorFromMulterFile } = require('../services/mediaUploadService');
const { recordMediaAsset } = require('../services/mediaAssetService');
const {
  normalizeAcademicYear,
  normalizeSemester,
  validateYearSemester,
} = require('../utils/academicYearSemester');
const {
  formatAcademicBatch,
  validateAlumniBatchRegistration,
  validateStudentBatchRegistration,
} = require('../utils/academicBatch');

const REGISTRATION_STATUSES = {
  PENDING: 'pending_approval',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  NEEDS_INFO: 'needs_info',
};

function pick(body, key, fallback = undefined) {
  const v = body?.[key];
  if (v === undefined || v === null || String(v).trim() === '') return fallback;
  return typeof v === 'string' ? v.trim() : v;
}

function pickInt(body, key) {
  const raw = pick(body, key);
  if (raw === undefined) return null;
  const n = parseInt(String(raw), 10);
  return Number.isNaN(n) ? null : n;
}

function registrationStatusLabel(status) {
  const map = {
    pending_approval: 'Pending Approval',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    suspended: 'Suspended',
    needs_info: 'Additional Info Required',
  };
  return map[status] || 'Pending Approval';
}

async function saveUploadedFile(file, category, userId, tenantId) {
  if (!file) return null;
  const descriptor = await descriptorFromMulterFile(file, category);
  void recordMediaAsset(descriptor, {
    ownerId: userId,
    category,
    entityType: 'user_registration',
    entityId: userId,
  });
  return descriptor.url;
}

async function recordRegistrationDocument(userId, tenantId, docType, url, file, transaction) {
  if (!url) return;
  await db.UserRegistrationDocument.create(
    {
      user_id: userId,
      tenant_id: tenantId,
      doc_type: docType,
      storage_url: url,
      file_name: file?.originalname || null,
      mime_type: file?.mimetype || null,
      review_status: 'pending',
    },
    { transaction },
  );
}

function validateRegistrationPayload(body, userType) {
  const errors = [];
  const password = pick(body, 'password');
  const confirm = pick(body, 'password_confirm') || pick(body, 'confirm_password');

  if (!pick(body, 'email')) errors.push('Email is required.');
  if (!password) errors.push('Password is required.');
  if (password && String(password).length < 8) errors.push('Password must be at least 8 characters.');
  if (confirm && password !== confirm) errors.push('Passwords do not match.');
  if (!pick(body, 'first_name')) errors.push('First name is required.');
  if (!pick(body, 'last_name')) errors.push('Last name is required.');
  if (!pick(body, 'phone_number')) errors.push('Mobile number is required.');

  if (userType === 'student') {
    if (!pick(body, 'degree')) errors.push('Degree is required.');
    if (!pick(body, 'branch') && !pick(body, 'stream')) errors.push('Branch / department is required.');
    if (!pick(body, 'academic_batch')) errors.push('Academic batch is required.');
    const studentBatchErr = validateStudentBatchRegistration(pick(body, 'academic_batch'));
    if (studentBatchErr) errors.push(studentBatchErr);
    if (!pick(body, 'roll_number')) errors.push('Roll number is required.');
    if (!pick(body, 'division')) errors.push('Class is required.');
    if (!pickInt(body, 'admission_year')) errors.push('Admission year is required.');
    if (!pickInt(body, 'expected_graduation_year')) errors.push('Expected graduation year is required.');

    const yearErr = validateYearSemester(pick(body, 'year'), pick(body, 'semester'), { required: true });
    if (yearErr) errors.push(yearErr);
  }

  if (userType === 'alumni') {
    if (!pick(body, 'degree')) errors.push('Degree is required.');
    if (!pick(body, 'branch') && !pick(body, 'stream')) errors.push('Branch / department is required.');
    if (!pickInt(body, 'admission_year')) errors.push('Admission year is required.');
    if (!pickInt(body, 'graduation_year')) errors.push('Graduation year is required.');

    const admission = pickInt(body, 'admission_year');
    const graduation = pickInt(body, 'graduation_year');
    const computedBatch = formatAcademicBatch(admission, graduation);
    const batchErr = validateAlumniBatchRegistration(admission, graduation, pick(body, 'academic_batch') || computedBatch);
    if (batchErr) errors.push(batchErr);
  }

  if (userType === 'teacher') {
    if (!pick(body, 'department')) errors.push('Department is required.');
    if (!pick(body, 'designation')) errors.push('Designation is required.');
  }

  return errors;
}

async function applyTypeDetailRecords(user, body, files, transaction) {
  const userType = user.user_type;
  const userId = user.id;
  const tenantId = user.tenant_id;
  const fileMap = files || {};

  const profilePhoto = fileMap.profile_photo?.[0];
  const idCard = fileMap.id_card?.[0];
  const admissionLetter = fileMap.admission_letter?.[0];
  const graduationCertificate = fileMap.graduation_certificate?.[0];
  const employmentProof = fileMap.employment_proof?.[0];

  if (profilePhoto) {
    const avatarUrl = await saveUploadedFile(profilePhoto, 'avatar', userId, tenantId);
    await user.update({ profile_picture: avatarUrl }, { transaction });
    await recordRegistrationDocument(userId, tenantId, 'profile_photo', avatarUrl, profilePhoto, transaction);
  }

  if (userType === 'student') {
    const idUrl = idCard ? await saveUploadedFile(idCard, 'verification', userId, tenantId) : null;
    const admissionUrl = admissionLetter
      ? await saveUploadedFile(admissionLetter, 'verification', userId, tenantId)
      : null;

    await db.StudentDetail.create(
      {
        user_id: userId,
        degree: pick(body, 'degree'),
        stream: pick(body, 'branch') || pick(body, 'stream'),
        year: normalizeAcademicYear(pick(body, 'year')),
        semester: normalizeSemester(pick(body, 'semester')),
        roll_number: pick(body, 'roll_number'),
        division: pick(body, 'division'),
        student_id: pick(body, 'student_id'),
        college_id: pick(body, 'college_id'),
        university_reg_number: pick(body, 'university_reg_number'),
        academic_batch: pick(body, 'academic_batch'),
        admission_year: pickInt(body, 'admission_year'),
        expected_graduation_year: pickInt(body, 'expected_graduation_year'),
        id_document_url: idUrl,
        admission_letter_url: admissionUrl,
        passout_date: pickInt(body, 'expected_graduation_year')
          ? new Date(`${pickInt(body, 'expected_graduation_year')}-06-01`)
          : null,
      },
      { transaction },
    );

    if (idUrl) await recordRegistrationDocument(userId, tenantId, 'id_card', idUrl, idCard, transaction);
    if (admissionUrl) {
      await recordRegistrationDocument(userId, tenantId, 'admission_letter', admissionUrl, admissionLetter, transaction);
    }
  } else if (userType === 'teacher') {
    const idUrl = idCard ? await saveUploadedFile(idCard, 'verification', userId, tenantId) : null;
    const proofUrl = employmentProof
      ? await saveUploadedFile(employmentProof, 'verification', userId, tenantId)
      : null;

    await db.TeacherDetail.create(
      {
        user_id: userId,
        employee_id: pick(body, 'employee_id'),
        faculty_id: pick(body, 'faculty_id'),
        department: pick(body, 'department'),
        designation: pick(body, 'designation'),
        joining_date: pick(body, 'joining_date') || null,
        qualification: pick(body, 'qualification'),
        specialization: pick(body, 'specialization'),
        id_document_url: idUrl,
        employment_proof_url: proofUrl,
      },
      { transaction },
    );

    if (idUrl) await recordRegistrationDocument(userId, tenantId, 'faculty_id_card', idUrl, idCard, transaction);
    if (proofUrl) {
      await recordRegistrationDocument(userId, tenantId, 'employment_proof', proofUrl, employmentProof, transaction);
    }
  } else if (userType === 'alumni') {
    const idUrl = idCard ? await saveUploadedFile(idCard, 'verification', userId, tenantId) : null;
    const gradUrl = graduationCertificate
      ? await saveUploadedFile(graduationCertificate, 'verification', userId, tenantId)
      : null;
    const gradYear = pickInt(body, 'graduation_year');
    const admYear = pickInt(body, 'admission_year');
    const academicBatch = formatAcademicBatch(admYear, gradYear);

    await db.AlumniDetail.create(
      {
        user_id: userId,
        degree: pick(body, 'degree'),
        stream: pick(body, 'branch') || pick(body, 'stream'),
        roll_number: pick(body, 'roll_number'),
        alumni_id: pick(body, 'alumni_id'),
        student_id: pick(body, 'student_id'),
        college_id: pick(body, 'college_id'),
        university_reg_number: pick(body, 'university_reg_number'),
        academic_batch: academicBatch,
        admission_year: admYear,
        graduation_year: gradYear,
        year_of_graduation: gradYear ? new Date(`${gradYear}-06-01`) : null,
        id_document_url: idUrl,
        graduation_certificate_url: gradUrl,
      },
      { transaction },
    );

    if (idUrl) await recordRegistrationDocument(userId, tenantId, 'id_card', idUrl, idCard, transaction);
    if (gradUrl) {
      await recordRegistrationDocument(userId, tenantId, 'graduation_certificate', gradUrl, graduationCertificate, transaction);
    }
  }
}

async function createCampusRegistration({ body, files, tenantId, needsCollegeApproval }) {
  const userType = String(pick(body, 'user_type', 'student')).toLowerCase();
  const payload = { ...body };

  const validationErrors = validateRegistrationPayload(payload, userType);
  if (validationErrors.length) {
    const err = new Error(validationErrors.join(' '));
    err.statusCode = 400;
    throw err;
  }

  const email = String(pick(body, 'email')).toLowerCase();
  const existing = await db.User.findOne({ where: { email } });
  if (existing) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(String(pick(body, 'password')), 10);
  const defaultRole = await db.Role.findOne({ where: { name: 'USER' }, attributes: ['id'] });
  const collegeEmail = pick(body, 'college_email');

  const transaction = await db.sequelize.transaction();
  let user;
  try {
    user = await db.User.create(
      {
        tenant_id: tenantId,
        user_type: userType,
        first_name: pick(body, 'first_name'),
        last_name: pick(body, 'last_name') || '',
        email,
        role_id: defaultRole?.id || null,
        phone_number: pick(body, 'phone_number') || null,
        college_email: collegeEmail || null,
        password_hash,
        is_approved: !needsCollegeApproval,
        registration_status: needsCollegeApproval
          ? REGISTRATION_STATUSES.PENDING
          : REGISTRATION_STATUSES.APPROVED,
        registration_submitted_at: new Date(),
        password_changed_at: new Date(),
        app_settings: {
          college_email: collegeEmail || null,
          onboarding_completed: false,
        },
      },
      { transaction },
    );

    await applyTypeDetailRecords(user, body, files, transaction);
    await transaction.commit();
  } catch (createErr) {
    await transaction.rollback();
    throw createErr;
  }

  return db.User.findByPk(user.id, {
    include: [{ model: db.Role, as: 'roleRef', attributes: ['id', 'name'] }],
  });
}

async function getRegistrationStatusByEmail(email) {
  const em = String(email || '').toLowerCase().trim();
  if (!em) return null;
  const user = await db.User.findOne({
    where: { email: em },
    attributes: [
      'id',
      'email',
      'first_name',
      'last_name',
      'user_type',
      'is_approved',
      'registration_status',
      'registration_submitted_at',
      'registration_reviewed_at',
      'registration_rejection_reason',
      'registration_admin_notes',
      'created_at',
    ],
    include: [{ model: db.Tenant, as: 'tenant', attributes: ['name'] }],
  });
  if (!user) return null;
  const u = user.toJSON();
  return {
    email: u.email,
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
    user_type: u.user_type,
    college_name: u.tenant?.name || null,
    registration_status: u.registration_status,
    registration_status_label: registrationStatusLabel(u.registration_status),
    is_approved: u.is_approved,
    submitted_at: u.registration_submitted_at || u.created_at,
    reviewed_at: u.registration_reviewed_at,
    rejection_reason: u.registration_rejection_reason,
    admin_notes: u.registration_admin_notes,
  };
}

module.exports = {
  REGISTRATION_STATUSES,
  registrationStatusLabel,
  validateRegistrationPayload,
  createCampusRegistration,
  getRegistrationStatusByEmail,
};
