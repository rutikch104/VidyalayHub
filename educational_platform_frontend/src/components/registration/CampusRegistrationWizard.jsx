import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_MODE } from '@/services/mockApi';
import tenantService from '@/services/tenantService';
import {
  Building2,
  GraduationCap,
  Mail,
  Phone,
  UserCircle,
} from 'lucide-react';
import {
  BRANCH_OPTIONS,
  DEGREE_OPTIONS,
  YEAR_OPTIONS,
  buildRegistrationFormData,
  registrationStepsFor,
} from '@/lib/registrationConfig';
import {
  semestersForAcademicYear,
  semesterLabel,
  validateYearSemester,
  suggestAcademicBatches,
  isValidYearSemesterPair,
} from '@/lib/academicYearSemester';
import {
  formatAcademicBatch,
  validateAlumniBatchRegistration,
  validateAdmissionGraduationYears,
  admissionYearsForAlumni,
  graduationYearsForAlumniAdmission,
} from '@/lib/academicBatch';
import {
  RegActions,
  RegAlert,
  RegField,
  RegFileUpload,
  RegGrid,
  RegInfoBanner,
  RegInput,
  RegReviewCard,
  RegRoleSelector,
  RegSection,
  RegSectionLabel,
  RegSelect,
  RegStepProgress,
  RegSuccessCard,
  RegWizardCard,
} from '@/components/registration/RegistrationUI';

const CURRENT_YEAR = new Date().getFullYear();

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'teacher', label: 'Teacher', icon: UserCircle },
  { value: 'alumni', label: 'Alumni', icon: Building2 },
];

const BATCH_SUGGESTIONS = suggestAcademicBatches();

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  full_name: '',
  email: '',
  phone_number: '',
  password: '',
  password_confirm: '',
  tenant_id: '',
  college_email: '',
  student_id: '',
  college_id: '',
  roll_number: '',
  division: '',
  university_reg_number: '',
  degree: '',
  branch: '',
  academic_batch: '',
  year: '',
  semester: '',
  admission_year: '',
  expected_graduation_year: '',
  graduation_year: '',
  alumni_id: '',
  employee_id: '',
  faculty_id: '',
  department: '',
  designation: '',
  joining_date: '',
  qualification: '',
  specialization: '',
};

function validateStep(form, userType, step) {
  if (step === 0) {
    if (!form.first_name?.trim()) return 'First name is required.';
    if (!form.last_name?.trim()) return 'Last name is required.';
    if (!form.email?.trim()) return 'Email address is required.';
    if (!form.phone_number?.trim()) return 'Mobile number is required.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.password_confirm) return 'Passwords do not match.';
    return null;
  }

  if (userType === 'student' && step === 1) {
    if (!form.tenant_id) return 'College is required.';
    if (!form.degree) return 'Degree is required.';
    if (!form.branch) return 'Branch / department is required.';
    if (!form.academic_batch?.trim()) return 'Academic batch is required.';
    if (!form.year) return 'Current academic year is required.';
    if (!form.semester) return 'Current semester is required.';
    const pairErr = validateYearSemester(form.year, form.semester);
    if (pairErr) return pairErr;
    if (!form.roll_number?.trim()) return 'Roll number is required.';
    if (!form.division?.trim()) return 'Class is required.';
    if (!form.admission_year?.trim()) return 'Admission year is required.';
    if (!form.expected_graduation_year?.trim()) return 'Expected graduation year is required.';
    return null;
  }

  if (userType === 'teacher' && step === 1) {
    if (!form.tenant_id) return 'College is required.';
    if (!form.department?.trim()) return 'Department is required.';
    if (!form.designation?.trim()) return 'Designation is required.';
    return null;
  }

  if (userType === 'alumni' && step === 1) {
    if (!form.tenant_id) return 'College is required.';
    if (!form.degree) return 'Degree is required.';
    if (!form.branch) return 'Branch / department is required.';
    if (!form.admission_year?.trim()) return 'Admission year is required.';
    if (!form.graduation_year?.trim()) return 'Graduation year is required.';
    const batchErr = validateAlumniBatchRegistration(
      form.admission_year,
      form.graduation_year,
      formatAcademicBatch(form.admission_year, form.graduation_year),
      CURRENT_YEAR,
    );
    if (batchErr) return batchErr;
    return null;
  }

  return null;
}

export default function CampusRegistrationWizard() {
  const { register } = useAuth();
  const [userType, setUserType] = useState('student');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const steps = registrationStepsFor(userType);
  const progress = Math.round(((step + 1) / steps.length) * 100);

  const availableSemesters = useMemo(
    () => semestersForAcademicYear(form.year),
    [form.year],
  );

  const alumniAdmissionYears = useMemo(() => admissionYearsForAlumni(CURRENT_YEAR), []);
  const alumniGraduationYears = useMemo(
    () => graduationYearsForAlumniAdmission(form.admission_year, CURRENT_YEAR),
    [form.admission_year],
  );
  const computedAlumniBatch = useMemo(
    () => formatAcademicBatch(form.admission_year, form.graduation_year),
    [form.admission_year, form.graduation_year],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCollegesLoading(true);
      try {
        if (MOCK_MODE) {
          if (!cancelled) {
            setColleges([{ tenant_id: '1', name: 'Demo College (mock)' }]);
            setForm((p) => ({ ...p, tenant_id: '1' }));
          }
        } else {
          const list = await tenantService.getApprovedColleges();
          if (!cancelled) setColleges(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!cancelled) setColleges([]);
      } finally {
        if (!cancelled) setCollegesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const auto = `${form.first_name || ''} ${form.last_name || ''}`.trim();
    if (auto && form.full_name !== auto) {
      setForm((p) => ({ ...p, full_name: auto }));
    }
  }, [form.first_name, form.last_name]);

  useEffect(() => {
    if (!form.year) return;
    if (form.semester && !isValidYearSemesterPair(form.year, form.semester)) {
      setForm((p) => ({ ...p, semester: '' }));
    }
  }, [form.year, form.semester]);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));
  const setFile = (name, file) => setForm((p) => ({ ...p, [name]: file }));

  const handleYearChange = (value) => {
    setForm((p) => {
      const nextSemesters = semestersForAcademicYear(value);
      const keepSemester = p.semester && nextSemesters.includes(String(p.semester).replace(/^Semester\s+/i, ''));
      return { ...p, year: value, semester: keepSemester ? p.semester : '' };
    });
  };

  const handleAlumniAdmissionChange = (value) => {
    setForm((p) => {
      const gradOptions = graduationYearsForAlumniAdmission(value, CURRENT_YEAR);
      const keepGrad = p.graduation_year && gradOptions.includes(parseInt(p.graduation_year, 10));
      const graduation = keepGrad ? p.graduation_year : (gradOptions[0] ? String(gradOptions[0]) : '');
      return {
        ...p,
        admission_year: value,
        graduation_year: graduation,
        academic_batch: formatAcademicBatch(value, graduation),
      };
    });
  };

  const handleAlumniGraduationChange = (value) => {
    setForm((p) => ({
      ...p,
      graduation_year: value,
      academic_batch: formatAcademicBatch(p.admission_year, value),
    }));
  };

  const handleContinue = () => {
    const stepError = validateStep(form, userType, step);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError('');
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const fd = buildRegistrationFormData(form, userType);
      const result = await register(fd);
      if (result?.pendingApproval) {
        setSuccess({
          message: result.message,
          email: form.email,
          status: result.registrationStatusLabel || 'Pending Approval',
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderCollegeSelect = () => (
    <RegField label="College name" required htmlFor="reg-college">
      <RegSelect
        id="reg-college"
        value={form.tenant_id}
        disabled={collegesLoading}
        onChange={(e) => setField('tenant_id', e.target.value)}
      >
        <option value="">{collegesLoading ? 'Loading colleges…' : 'Select your college'}</option>
        {colleges.map((c) => (
          <option key={c.tenant_id} value={c.tenant_id}>{c.name}</option>
        ))}
      </RegSelect>
    </RegField>
  );

  const renderPersonalStep = () => (
    <RegSection title="Personal details">
      <RegGrid cols={2}>
        <RegField label="First name" required htmlFor="reg-first">
          <RegInput id="reg-first" value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} placeholder="Jane" autoComplete="given-name" />
        </RegField>
        <RegField label="Last name" required htmlFor="reg-last">
          <RegInput id="reg-last" value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} placeholder="Doe" autoComplete="family-name" />
        </RegField>
      </RegGrid>
      <RegField label="Full name" required hint="Auto-filled from first and last name; you may edit if needed." htmlFor="reg-full">
        <RegInput id="reg-full" value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} placeholder="Jane Doe" autoComplete="name" />
      </RegField>
      <RegGrid cols={2}>
        <RegField label="Email address" required htmlFor="reg-email">
          <RegInput id="reg-email" type="email" icon={Mail} value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="you@email.com" autoComplete="email" />
        </RegField>
        <RegField label="Mobile number" required htmlFor="reg-phone">
          <RegInput id="reg-phone" type="tel" icon={Phone} value={form.phone_number} onChange={(e) => setField('phone_number', e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
        </RegField>
      </RegGrid>
      <RegSectionLabel>Account security</RegSectionLabel>
      <RegGrid cols={2}>
        <RegField label="Password" required htmlFor="reg-pass">
          <RegInput id="reg-pass" type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} minLength={8} autoComplete="new-password" placeholder="Min. 8 characters" />
        </RegField>
        <RegField label="Confirm password" required htmlFor="reg-pass2">
          <RegInput id="reg-pass2" type="password" value={form.password_confirm} onChange={(e) => setField('password_confirm', e.target.value)} autoComplete="new-password" placeholder="Re-enter password" />
        </RegField>
      </RegGrid>
      <RegFileUpload label="Profile photo" name="profile_photo" value={form.profile_photo} onChange={setFile} optional />
    </RegSection>
  );

  const renderStudentAcademic = () => (
    <RegSection title="Academic details">
      {renderCollegeSelect()}
      <RegGrid cols={3}>
        <RegField label="Degree" required htmlFor="reg-degree">
          <RegSelect id="reg-degree" value={form.degree} onChange={(e) => setField('degree', e.target.value)}>
            <option value="">Select degree</option>
            {DEGREE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </RegSelect>
        </RegField>
        <RegField label="Branch / Department" required htmlFor="reg-branch">
          <RegSelect id="reg-branch" value={form.branch} onChange={(e) => setField('branch', e.target.value)}>
            <option value="">Select branch</option>
            {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </RegSelect>
        </RegField>
        <RegField label="Academic batch" required hint="Example: 2022-2026" htmlFor="reg-batch">
          <RegInput id="reg-batch" list="batch-suggestions" value={form.academic_batch} onChange={(e) => setField('academic_batch', e.target.value)} placeholder="2022-2026" />
          <datalist id="batch-suggestions">
            {BATCH_SUGGESTIONS.map((b) => <option key={b} value={b} />)}
          </datalist>
        </RegField>
      </RegGrid>
      <RegGrid cols={3}>
        <RegField label="Current academic year" required htmlFor="reg-year">
          <RegSelect id="reg-year" value={form.year} onChange={(e) => handleYearChange(e.target.value)}>
            <option value="">Select year</option>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </RegSelect>
        </RegField>
        <RegField
          label="Current semester"
          required
          hint={form.year ? `Valid for ${form.year}: ${availableSemesters.map(semesterLabel).join(', ') || '—'}` : 'Select academic year first'}
          htmlFor="reg-sem"
        >
          <RegSelect id="reg-sem" value={form.semester} disabled={!form.year} onChange={(e) => setField('semester', e.target.value)}>
            <option value="">{form.year ? 'Select semester' : 'Select year first'}</option>
            {availableSemesters.map((s) => (
              <option key={s} value={s}>{semesterLabel(s)}</option>
            ))}
          </RegSelect>
        </RegField>
        <RegField label="Roll number" required htmlFor="reg-roll">
          <RegInput id="reg-roll" value={form.roll_number} onChange={(e) => setField('roll_number', e.target.value)} placeholder="e.g. 2022CS001" />
        </RegField>
      </RegGrid>
      <RegGrid cols={3}>
        <RegField label="Class" required htmlFor="reg-class">
          <RegInput id="reg-class" value={form.division} onChange={(e) => setField('division', e.target.value)} placeholder="e.g. A, B, C" />
        </RegField>
        <RegField label="Admission year" required htmlFor="reg-adm">
          <RegInput id="reg-adm" value={form.admission_year} onChange={(e) => setField('admission_year', e.target.value)} placeholder="2022" inputMode="numeric" />
        </RegField>
        <RegField label="Expected graduation year" required htmlFor="reg-grad-exp">
          <RegInput id="reg-grad-exp" value={form.expected_graduation_year} onChange={(e) => setField('expected_graduation_year', e.target.value)} placeholder="2026" inputMode="numeric" />
        </RegField>
      </RegGrid>
      <RegSectionLabel>Optional identifiers</RegSectionLabel>
      <RegGrid cols={3}>
        <RegField label="Student ID" optional htmlFor="reg-stuid"><RegInput id="reg-stuid" value={form.student_id} onChange={(e) => setField('student_id', e.target.value)} /></RegField>
        <RegField label="College ID" optional htmlFor="reg-collid"><RegInput id="reg-collid" value={form.college_id} onChange={(e) => setField('college_id', e.target.value)} /></RegField>
        <RegField label="University registration number" optional htmlFor="reg-univ"><RegInput id="reg-univ" value={form.university_reg_number} onChange={(e) => setField('university_reg_number', e.target.value)} /></RegField>
      </RegGrid>
    </RegSection>
  );

  const renderTeacherInstitution = () => (
    <RegSection title="Institution details">
      {renderCollegeSelect()}
      <RegGrid cols={2}>
        <RegField label="Employee ID" optional htmlFor="reg-emp"><RegInput id="reg-emp" value={form.employee_id} onChange={(e) => setField('employee_id', e.target.value)} /></RegField>
        <RegField label="Faculty ID" optional htmlFor="reg-fac"><RegInput id="reg-fac" value={form.faculty_id} onChange={(e) => setField('faculty_id', e.target.value)} /></RegField>
      </RegGrid>
      <RegGrid cols={2}>
        <RegField label="Department" required htmlFor="reg-dept"><RegInput id="reg-dept" value={form.department} onChange={(e) => setField('department', e.target.value)} /></RegField>
        <RegField label="Designation" required htmlFor="reg-desig"><RegInput id="reg-desig" value={form.designation} onChange={(e) => setField('designation', e.target.value)} /></RegField>
      </RegGrid>
      <RegGrid cols={2}>
        <RegField label="Joining date" optional htmlFor="reg-join"><RegInput id="reg-join" type="date" value={form.joining_date} onChange={(e) => setField('joining_date', e.target.value)} /></RegField>
        <RegField label="Qualification" optional htmlFor="reg-qual"><RegInput id="reg-qual" value={form.qualification} onChange={(e) => setField('qualification', e.target.value)} /></RegField>
      </RegGrid>
      <RegField label="Specialization" optional htmlFor="reg-spec"><RegInput id="reg-spec" value={form.specialization} onChange={(e) => setField('specialization', e.target.value)} /></RegField>
    </RegSection>
  );

  const renderAlumniAcademic = () => (
    <RegSection title="Academic details">
      {renderCollegeSelect()}
      <RegGrid cols={3}>
        <RegField label="Degree" required htmlFor="reg-al-deg">
          <RegSelect id="reg-al-deg" value={form.degree} onChange={(e) => setField('degree', e.target.value)}>
            <option value="">Select degree</option>
            {DEGREE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </RegSelect>
        </RegField>
        <RegField label="Branch / Department" required htmlFor="reg-al-br">
          <RegSelect id="reg-al-br" value={form.branch} onChange={(e) => setField('branch', e.target.value)}>
            <option value="">Select branch</option>
            {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </RegSelect>
        </RegField>
        <RegField label="Academic batch" hint="Calculated automatically from your admission and graduation years." htmlFor="reg-al-batch">
          <RegInput id="reg-al-batch" readOnly value={computedAlumniBatch} placeholder="Select years below" />
        </RegField>
      </RegGrid>
      <RegGrid cols={2}>
        <RegField label="Admission year" required hint="Only completed alumni batches are available." htmlFor="reg-al-adm">
          <RegSelect id="reg-al-adm" value={form.admission_year} onChange={(e) => handleAlumniAdmissionChange(e.target.value)}>
            <option value="">Select admission year</option>
            {alumniAdmissionYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </RegSelect>
        </RegField>
        <RegField label="Graduation year" required hint="Must be before the current calendar year." htmlFor="reg-al-grad">
          <RegSelect id="reg-al-grad" value={form.graduation_year} disabled={!form.admission_year} onChange={(e) => handleAlumniGraduationChange(e.target.value)}>
            <option value="">{form.admission_year ? 'Select graduation year' : 'Select admission year first'}</option>
            {alumniGraduationYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </RegSelect>
        </RegField>
      </RegGrid>
      {form.admission_year && form.graduation_year && validateAdmissionGraduationYears(form.admission_year, form.graduation_year) ? (
        <RegAlert>{validateAdmissionGraduationYears(form.admission_year, form.graduation_year)}</RegAlert>
      ) : null}
      <RegSectionLabel>Optional identifiers</RegSectionLabel>
      <RegGrid cols={3}>
        <RegField label="Roll number" optional htmlFor="reg-al-roll"><RegInput id="reg-al-roll" value={form.roll_number} onChange={(e) => setField('roll_number', e.target.value)} /></RegField>
        <RegField label="Alumni ID" optional htmlFor="reg-al-id"><RegInput id="reg-al-id" value={form.alumni_id} onChange={(e) => setField('alumni_id', e.target.value)} /></RegField>
        <RegField label="Student ID" optional htmlFor="reg-al-stu"><RegInput id="reg-al-stu" value={form.student_id} onChange={(e) => setField('student_id', e.target.value)} /></RegField>
        <RegField label="College ID" optional htmlFor="reg-al-coll"><RegInput id="reg-al-coll" value={form.college_id} onChange={(e) => setField('college_id', e.target.value)} /></RegField>
        <RegField label="University registration number" optional htmlFor="reg-al-univ"><RegInput id="reg-al-univ" value={form.university_reg_number} onChange={(e) => setField('university_reg_number', e.target.value)} /></RegField>
      </RegGrid>
    </RegSection>
  );

  const renderVerificationStep = (variant) => {
    const copy = {
      student: {
        title: 'Campus verification',
        text: 'Uploading verification documents can speed up approval, but they are not required to submit your application.',
        emailLabel: 'College email address',
        files: [
          { label: 'Student ID card', name: 'id_card' },
          { label: 'Admission letter', name: 'admission_letter' },
        ],
      },
      teacher: {
        title: 'Faculty verification',
        text: 'Official college email and faculty ID upload help administrators verify your account faster.',
        emailLabel: 'Official college email',
        files: [{ label: 'Faculty ID card', name: 'id_card' }],
      },
      alumni: {
        title: 'Alumni verification',
        text: 'Upload graduation documents to help verify your alumni identity. Professional details can be added from your profile after approval.',
        emailLabel: 'College email address',
        files: [
          { label: 'Student ID card', name: 'id_card' },
          { label: 'Graduation certificate', name: 'graduation_certificate' },
        ],
      },
    }[variant];

    return (
      <RegSection title="Verification">
        <RegInfoBanner title="Optional">{copy.text}</RegInfoBanner>
        <RegField label={copy.emailLabel} optional htmlFor="reg-college-email">
          <RegInput id="reg-college-email" type="email" icon={Mail} value={form.college_email} onChange={(e) => setField('college_email', e.target.value)} placeholder="name@college.edu" />
        </RegField>
        <RegGrid cols={2}>
          {copy.files.map(({ label, name }) => (
            <RegFileUpload key={name} label={label} name={name} value={form[name]} onChange={setFile} optional />
          ))}
        </RegGrid>
      </RegSection>
    );
  };

  const renderReview = () => {
    const collegeName = colleges.find((c) => c.tenant_id === form.tenant_id)?.name || '—';
    const rows = [
      { key: 'Full name', value: form.full_name || `${form.first_name} ${form.last_name}`.trim() },
      { key: 'Email', value: form.email },
      { key: 'Role', value: userType.charAt(0).toUpperCase() + userType.slice(1) },
      { key: 'College', value: collegeName },
    ];

    if (userType === 'student') {
      rows.push(
        { key: 'Batch', value: form.academic_batch },
        { key: 'Roll number', value: form.roll_number },
        { key: 'Class', value: form.division },
        { key: 'Year / Semester', value: `${form.year || '—'} / ${form.semester ? semesterLabel(form.semester) : '—'}` },
      );
    }
    if (userType === 'alumni') {
      rows.push(
        { key: 'Batch', value: computedAlumniBatch },
        { key: 'Admission / Graduation', value: `${form.admission_year || '—'} / ${form.graduation_year || '—'}` },
        { key: 'Degree', value: form.degree },
        { key: 'Branch', value: form.branch },
      );
      if (form.roll_number) rows.push({ key: 'Roll number', value: form.roll_number });
      if (form.alumni_id) rows.push({ key: 'Alumni ID', value: form.alumni_id });
    }
    if (form.college_email) rows.push({ key: 'College email', value: form.college_email });

    return (
      <RegReviewCard
        title="Review your application"
        subtitle="Check your details before submitting."
        rows={rows}
        footer="By submitting, you confirm that the information provided is accurate. Your account will remain pending until verified by your college administration."
      />
    );
  };

  const renderStep = () => {
    if (userType === 'student') {
      if (step === 0) return renderPersonalStep();
      if (step === 1) return renderStudentAcademic();
      if (step === 2) return renderVerificationStep('student');
      return renderReview();
    }
    if (userType === 'teacher') {
      if (step === 0) return renderPersonalStep();
      if (step === 1) return renderTeacherInstitution();
      if (step === 2) return renderVerificationStep('teacher');
      return renderReview();
    }
    if (step === 0) return renderPersonalStep();
    if (step === 1) return renderAlumniAcademic();
    if (step === 2) return renderVerificationStep('alumni');
    return renderReview();
  };

  if (success) {
    return (
      <RegSuccessCard
        message={success.message}
        status={success.status}
        trackHref={`/registration-status?email=${encodeURIComponent(success.email)}`}
      />
    );
  }

  return (
    <RegWizardCard>
      <RegRoleSelector
        options={ROLE_OPTIONS}
        value={userType}
        onChange={(v) => { setUserType(v); setStep(0); setError(''); setForm(EMPTY_FORM); }}
      />
      <RegStepProgress steps={steps} currentStep={step} progress={progress} />
      {error ? <div style={{ marginBottom: '1rem' }}><RegAlert>{error}</RegAlert></div> : null}
      {renderStep()}
      <RegActions
        onBack={() => setStep((s) => s - 1)}
        onContinue={handleContinue}
        onSubmit={() => void handleSubmit()}
        backDisabled={step === 0}
        loading={loading}
        isLastStep={step >= steps.length - 1}
      />
    </RegWizardCard>
  );
}
