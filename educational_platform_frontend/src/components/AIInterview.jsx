// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Video,
  Users,
  FileText,
  Play,
  History,
  Award,
  TrendingUp,
  Target,
  Brain,
  Zap,
  CheckCircle,
  Lightbulb,
  Loader2,
  Code,
  ChevronRight,
  Clock,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import aiInterviewService from '@/services/aiInterviewService';

const TYPE_META = {
  technical:     { icon: FileText, gradient: 'from-blue-500 to-cyan-500',    iconBg: 'bg-blue-50',     iconColor: 'text-blue-600'   },
  hr:            { icon: Users,    gradient: 'from-violet-500 to-purple-500', iconBg: 'bg-violet-50',   iconColor: 'text-violet-600' },
  mock:          { icon: Video,    gradient: 'from-emerald-500 to-teal-500',  iconBg: 'bg-emerald-50',  iconColor: 'text-emerald-600'},
  quick:         { icon: Zap,      gradient: 'from-orange-500 to-amber-500',  iconBg: 'bg-orange-50',   iconColor: 'text-orange-600' },
  behavioral:    { icon: Users,    gradient: 'from-violet-500 to-pink-500',   iconBg: 'bg-pink-50',     iconColor: 'text-pink-600'   },
  coding:        { icon: Code,     gradient: 'from-blue-600 to-indigo-500',   iconBg: 'bg-indigo-50',   iconColor: 'text-indigo-600' },
  'system-design':{ icon: Brain,  gradient: 'from-indigo-500 to-violet-500', iconBg: 'bg-indigo-50',   iconColor: 'text-indigo-600' },
};

const DIFFICULTY_STYLES = {
  easy:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  medium: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200',
  hard:   'bg-red-50     text-red-700     ring-1 ring-red-200',
  custom: 'bg-violet-50  text-violet-700  ring-1 ring-violet-200',
};

const STATUS_STYLES = {
  completed:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'in-progress':'bg-blue-50   text-blue-700    ring-1 ring-blue-200',
};

function StatCard({ icon: Icon, label, value, suffix = '', accent }) {
  const colors = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', icon: 'text-indigo-500', value: 'text-indigo-900 dark:text-indigo-100', label: 'text-indigo-600 dark:text-indigo-400' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', icon: 'text-violet-500', value: 'text-violet-900 dark:text-violet-100', label: 'text-violet-600 dark:text-violet-400' },
    emerald:{ bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: 'text-emerald-500', value: 'text-emerald-900 dark:text-emerald-100', label: 'text-emerald-600 dark:text-emerald-400' },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-950/30',   icon: 'text-amber-500',  value: 'text-amber-900  dark:text-amber-100',  label: 'text-amber-600  dark:text-amber-400'  },
  };
  const c = colors[accent] || colors.indigo;
  return (
    <div className={`${c.bg} rounded-2xl p-5 flex items-center gap-4`}>
      <div className={`flex-shrink-0 rounded-xl p-2.5 bg-white/60 dark:bg-white/10 shadow-sm`}>
        <Icon className={`h-5 w-5 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-wide ${c.label}`}>{label}</p>
        <p className={`mt-0.5 text-2xl font-bold tabular-nums ${c.value}`}>
          {value}{suffix}
        </p>
      </div>
    </div>
  );
}

export default function AIInterview({ onStartSession }) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [interviewTypes, setInterviewTypes] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ totalSessions: 0, averageScore: 0, totalQuestions: 0, improvementRate: 0 });

  useEffect(() => {
    fetchInterviewTypes();
    fetchRecentSessions();
    fetchInterviewStats();
  }, []);

  const fetchInterviewTypes = async () => {
    setLoading(true);
    try {
      const response = await aiInterviewService.getInterviewTypes();
      const typesWithUI = (response.types || []).map((type) => {
        const meta = TYPE_META[type.type] || TYPE_META.technical;
        return { ...type, ...meta };
      });
      setInterviewTypes(typesWithUI);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch interview types');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const response = await aiInterviewService.getRecentSessions();
      setRecentSessions(
        (response.sessions || []).map((s) => ({
          ...s,
          status: s.status === 'completed' ? 'completed' : 'in-progress',
        })),
      );
    } catch {
      /* silent */
    }
  };

  const fetchInterviewStats = async () => {
    try {
      const response = await aiInterviewService.getInterviewStats();
      setStats(response);
    } catch {
      /* silent */
    }
  };

  const handleStartInterview = async (typeId) => {
    if (!user) { setError('Please log in to start an interview'); return; }
    setIsStarting(true);
    setStartingId(typeId);
    setError('');
    try {
      const response = await aiInterviewService.startInterview(typeId);
      setSelectedType(typeId);
      if (response?.session_id && typeof onStartSession === 'function') {
        onStartSession(response.session_id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start interview');
    } finally {
      setIsStarting(false);
      setStartingId(null);
    }
  };

  return (
    <div className="platform-page">
      <div className="platform-page__container">

        {/* ── Page header ── */}
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">AI Interview Practice</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Practice with AI-powered questions and get instant feedback on your answers.
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={History}   label="Total Sessions"    value={stats.totalSessions}   accent="indigo"  />
          <StatCard icon={Award}     label="Average Score"     value={stats.averageScore}     suffix="%" accent="violet"  />
          <StatCard icon={Target}    label="Questions Done"    value={stats.totalQuestions}   accent="emerald" />
          <StatCard icon={TrendingUp} label="Improvement"     value={`+${stats.improvementRate}`} suffix="%" accent="amber" />
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Interview types ── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Choose an interview type</h2>
            <span className="text-xs text-muted-foreground">{interviewTypes.length} types available</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {interviewTypes.map((type) => {
                const Icon = type.icon;
                const isThisStarting = isStarting && startingId === type.id;
                return (
                  <div
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`group relative flex cursor-pointer flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                      selectedType === type.id
                        ? 'border-indigo-400 ring-2 ring-indigo-500/20'
                        : 'border-border hover:border-indigo-200'
                    }`}
                  >
                    {/* Icon + difficulty */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${type.iconBg}`}>
                        <Icon className={`h-5 w-5 ${type.iconColor}`} />
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${DIFFICULTY_STYLES[type.difficulty?.toLowerCase()] || 'bg-muted text-muted-foreground'}`}>
                        {type.difficulty}
                      </span>
                    </div>

                    {/* Title + description */}
                    <h3 className="mb-1 text-sm font-bold text-foreground">{type.title}</h3>
                    <p className="mb-4 flex-1 text-xs leading-relaxed text-muted-foreground">{type.description}</p>

                    {/* Meta row */}
                    <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {type.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3.5 w-3.5" />
                        {type.questions} questions
                      </span>
                    </div>

                    {/* Start button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleStartInterview(type.id); }}
                      disabled={isStarting}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                        isStarting
                          ? 'cursor-not-allowed bg-muted text-muted-foreground'
                          : `bg-gradient-to-r ${type.gradient} text-white shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.98]`
                      }`}
                    >
                      {isThisStarting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {isThisStarting ? 'Starting…' : 'Start interview'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Recent sessions ── */}
        <section className="mb-10">
          <h2 className="mb-4 text-base font-semibold text-foreground">Recent sessions</h2>

          {recentSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-14 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <History className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No sessions yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Start your first interview to track progress here.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentSessions.map((session) => (
                    <tr key={session.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                            <FileText className="h-3.5 w-3.5 text-indigo-600" />
                          </div>
                          <span className="font-medium text-foreground">{session.interview_type}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        {session.score != null ? `${session.score}%` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[session.status] || 'bg-muted text-muted-foreground'}`}>
                          {session.status === 'completed' ? 'Completed' : 'In progress'}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-3.5 text-muted-foreground">
                        {session.feedback || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Tips ── */}
        <section>
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 shadow-lg shadow-indigo-500/20">
            <div className="mb-4 flex items-center gap-2.5">
              <Lightbulb className="h-5 w-5 text-indigo-200" />
              <h3 className="text-sm font-semibold text-white">Interview tips</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                'Practice regularly to build confidence and fluency in your responses.',
                'Review AI feedback after every session to target weak areas.',
                'Start with easier formats, then progress to harder ones.',
                'Use mock interviews to simulate real-time pressure and timing.',
              ].map((tip) => (
                <div key={tip} className="flex items-start gap-2.5">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <p className="text-sm text-indigo-100">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
