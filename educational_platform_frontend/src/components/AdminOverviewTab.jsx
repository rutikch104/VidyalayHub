import React, { useState } from 'react';
import {
  Building,
  GraduationCap,
  Users,
  UserCog,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  UserPlus,
} from 'lucide-react';
import CollegeAdminPendingBanner from '@/components/CollegeAdminPendingBanner';
import AdminCreateUserModal from '@/components/AdminCreateUserModal';

export default function AdminOverviewTab({
  loading,
  error,
  stats,
  recentActivity,
  isCollegeScoped,
  institutionName,
  institutionType,
  onReviewStudents,
  onReviewTeachers,
  onUsersMutated,
}) {
  const [showStaffModal, setShowStaffModal] = useState(false);
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading dashboard…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-center">
          <AlertCircle className="mr-3 h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-medium text-red-800">Error loading dashboard</h3>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = (institutionName || '').trim() || 'Your institution';
  const typeLine = (institutionType || '').trim();

  return (
    <div className="space-y-6">
      {isCollegeScoped ? (
        <AdminCreateUserModal
          open={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          fixedUserType="staff"
          isCollegeScoped
          onSuccess={() => {
            onUsersMutated?.();
          }}
        />
      ) : null}
      <CollegeAdminPendingBanner
        stats={stats}
        onReviewStudents={onReviewStudents}
        onReviewTeachers={onReviewTeachers}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isCollegeScoped ? (
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white shadow-xl">
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-100">Your institution</p>
                <p className="mt-2 text-xl font-bold leading-snug tracking-tight">{displayName}</p>
                {typeLine ? <p className="mt-2 text-sm text-indigo-100/90">{typeLine}</p> : null}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-indigo-100/80">
                <Building className="h-4 w-4 shrink-0" />
                <span>College administrator view</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Total colleges</p>
                <p className="text-3xl font-bold">{stats?.total_colleges?.toLocaleString() || '0'}</p>
                <p className="mt-1 text-xs text-blue-200">
                  +{stats?.growth_metrics?.colleges_growth || 0} this month
                </p>
              </div>
              <Building className="h-12 w-12 text-blue-200" />
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white shadow-xl transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-100">Students</p>
              <p className="text-3xl font-bold">{stats?.total_students?.toLocaleString() || '0'}</p>
              <p className="mt-1 text-xs text-green-200">
                {isCollegeScoped && (stats?.pending_student_registrations ?? 0) > 0
                  ? `${stats.pending_student_registrations} awaiting approval`
                  : `+${stats?.growth_metrics?.students_growth || 0} new (30d)`}
              </p>
            </div>
            <GraduationCap className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white shadow-xl transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-100">Teachers</p>
              <p className="text-3xl font-bold">{stats?.total_teachers?.toLocaleString() || '0'}</p>
              <p className="mt-1 text-xs text-purple-200">
                {isCollegeScoped && (stats?.pending_teacher_registrations ?? 0) > 0
                  ? `${stats.pending_teacher_registrations} awaiting approval`
                  : `+${stats?.growth_metrics?.teachers_growth || 0} new (30d)`}
              </p>
            </div>
            <Users className="h-12 w-12 text-purple-200" />
          </div>
        </div>

        {isCollegeScoped ? (
          <div className="rounded-2xl bg-gradient-to-r from-slate-600 to-slate-800 p-6 text-white shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-200">Staff &amp; admins</p>
                <p className="text-3xl font-bold">{stats?.total_staff?.toLocaleString() ?? '0'}</p>
                <p className="mt-1 text-xs text-slate-300">Portal and college staff accounts</p>
                <button
                  type="button"
                  onClick={() => setShowStaffModal(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/25 transition hover:bg-white/25"
                >
                  <UserPlus className="h-4 w-4" />
                  Add staff / admin
                </button>
              </div>
              <UserCog className="h-12 w-12 shrink-0 text-slate-300" />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100">Active sessions</p>
                <p className="text-3xl font-bold">{stats?.active_sessions?.toLocaleString() || '0'}</p>
                <p className="mt-1 text-xs text-orange-200">Platform-wide</p>
              </div>
              <Activity className="h-12 w-12 text-orange-200" />
            </div>
          </div>
        )}
      </div>

      <div className="premium-surface p-6 sm:p-8">
        <h3 className="mb-6 font-display text-xl font-bold tracking-tight text-foreground">Recent activity</h3>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50"
              >
                <CheckCircle className="h-8 w-8 shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{activity.message}</p>
                  {activity.details ? (
                    <p className="text-sm text-muted-foreground">{activity.details}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="platform-empty py-10">
              <div className="platform-empty__icon">
                <Clock className="h-7 w-7" />
              </div>
              <p className="platform-empty__title">No recent activity</p>
              <p className="platform-empty__desc">New registrations and updates will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
