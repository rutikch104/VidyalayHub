import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2, MessageSquareWarning, X } from 'lucide-react';
import adminService from '@/services/adminService';
import { RegAlert, RegField, RegTextarea } from '@/components/registration/RegistrationUI';

function ReviewCell({ label, value }) {
  return (
    <div className="reg-review__row">
      <span className="reg-review__key">{label}</span>
      <span className="reg-review__val">{value || '—'}</span>
    </div>
  );
}

export default function AdminRegistrationReviewModal({ userId, open, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await adminService.getRegistrationApplication(userId);
        if (!cancelled) setApplication(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load application.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, userId]);

  if (!open) return null;

  const runAction = async (action) => {
    setSaving(true);
    setError('');
    try {
      await adminService.reviewRegistration(userId, {
        action,
        rejection_reason: reason,
        admin_notes: notes,
      });
      onUpdated?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border bg-gradient-to-b from-primary/[0.04] to-card px-5 py-4">
          <div>
            <p className="reg-page-header__eyebrow mb-2">Verification</p>
            <h3 className="text-lg font-bold tracking-tight">Registration review</h3>
            <p className="text-sm text-muted-foreground">Verify academic and institutional details before activation.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[calc(90vh-10rem)] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : application ? (
            <div className="space-y-5 text-sm">
              <div className="reg-admin-review">
                <ReviewCell label="Name" value={application.name} />
                <ReviewCell label="Email" value={application.email} />
                <ReviewCell label="Phone" value={application.phone_number} />
                <ReviewCell label="College email" value={application.college_email} />
                <ReviewCell label="Role" value={application.user_type} />
                <ReviewCell label="Status" value={application.registration_status_label} />
                <ReviewCell label="College" value={application.college_name} />
                <ReviewCell label="Degree" value={application.department} />
                <ReviewCell label="Branch" value={application.branch} />
                <ReviewCell label="Academic batch" value={application.academicBatch} />
                <ReviewCell label="Student ID" value={application.studentId} />
                <ReviewCell label="Alumni ID" value={application.alumniId} />
                <ReviewCell label="Roll no" value={application.rollNumber} />
                <ReviewCell label="Class" value={application.className} />
                <ReviewCell label="University reg." value={application.universityRegNumber} />
                {application.user_type === 'student' ? (
                  <>
                    <ReviewCell label="Year" value={application.year} />
                    <ReviewCell label="Semester" value={application.semester} />
                  </>
                ) : null}
                <ReviewCell label="Admission year" value={application.admissionYear} />
                <ReviewCell label="Graduation year" value={application.graduationYear} />
                <ReviewCell label="College ID" value={application.collegeId} />
                {application.user_type === 'teacher' ? (
                  <ReviewCell label="Designation" value={application.designation} />
                ) : null}
              </div>

              {application.documents?.length ? (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Uploaded documents</p>
                  <ul className="space-y-2">
                    {application.documents.map((doc) => (
                      <li key={doc.id}>
                        <a href={doc.url} target="_blank" rel="noreferrer" className="reg-admin-doc">
                          <span className="capitalize">{doc.doc_type.replace(/_/g, ' ')}</span>
                          <span className="inline-flex items-center gap-1 text-primary">
                            View <ExternalLink className="h-3.5 w-3.5" />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <RegField label="Admin notes / request info" htmlFor="admin-notes">
                <RegTextarea id="admin-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional message to applicant" rows={3} />
              </RegField>
              <RegField label="Rejection reason" htmlFor="admin-reject">
                <RegTextarea id="admin-reject" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required when rejecting" rows={2} />
              </RegField>
            </div>
          ) : null}
          {error ? <div className="mt-3"><RegAlert>{error}</RegAlert></div> : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border bg-muted/30 px-5 py-4">
          <button type="button" disabled={saving} onClick={() => void runAction('approve')} className="reg-btn reg-btn--primary bg-green-600 hover:brightness-105">
            <Check className="h-4 w-4" /> Approve
          </button>
          <button type="button" disabled={saving} onClick={() => void runAction('under_review')} className="reg-btn reg-btn--secondary">
            Mark under review
          </button>
          <button type="button" disabled={saving} onClick={() => void runAction('needs_info')} className="reg-btn reg-btn--secondary border-amber-300 bg-amber-50 text-amber-900">
            <MessageSquareWarning className="h-4 w-4" /> Request info
          </button>
          <button type="button" disabled={saving} onClick={() => void runAction('reject')} className="reg-btn reg-btn--secondary border-red-300 bg-red-50 text-red-800">
            <X className="h-4 w-4" /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}
