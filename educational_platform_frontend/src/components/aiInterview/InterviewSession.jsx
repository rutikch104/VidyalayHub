// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Brain,
  CheckCircle,
  Loader2,
  Send,
  Award,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import aiInterviewService from '@/services/aiInterviewService';

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ScoreBadge({ score }) {
  if (score == null) return null;
  const color =
    score >= 80 ? 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200' :
    score >= 60 ? 'text-amber-700   bg-amber-50   ring-1 ring-amber-200'   :
                  'text-red-700     bg-red-50     ring-1 ring-red-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${color}`}>
      {Math.round(score)}%
    </span>
  );
}

export default function InterviewSession({ sessionId, onExit, onComplete }) {
  const [questions, setQuestions]       = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [completing, setCompleting]     = useState(false);
  const [error, setError]               = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('in_progress');
  const [report, setReport]             = useState(null);

  const loadQuestions = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const data = await aiInterviewService.getSessionQuestions(sessionId);
      const qs = data.questions || [];
      setQuestions(qs);
      setSessionStatus(data.session_status || 'in_progress');
      const firstOpen = qs.findIndex((q) => !q.answered);
      setCurrentIndex(firstOpen >= 0 ? firstOpen : 0);
      if (data.session_status === 'completed') {
        const rep = await aiInterviewService.getSessionReport(sessionId);
        setReport(rep);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load interview session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void loadQuestions(); }, [loadQuestions]);

  const currentQuestion = questions[currentIndex];
  const answeredCount   = questions.filter((q) => q.answered).length;
  const allAnswered     = questions.length > 0 && answeredCount === questions.length;

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !answer.trim()) return;
    setSubmitting(true);
    setError('');
    setLastFeedback(null);
    try {
      const result = await aiInterviewService.submitAnswer(sessionId, currentQuestion.id, answer.trim());
      setLastFeedback({
        score: result.score,
        feedback: result.feedback,
        strengths: result.strengths || [],
        improvements: result.improvements || [],
      });
      setAnswer('');
      await loadQuestions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError('');
    try {
      await aiInterviewService.completeSession(sessionId);
      const rep = await aiInterviewService.getSessionReport(sessionId);
      setReport(rep);
      setSessionStatus('completed');
      if (onComplete) onComplete(rep);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete session.');
    } finally {
      setCompleting(false);
    }
  };

  /* ── No session ── */
  if (!sessionId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">No session selected.</p>
        <button type="button" onClick={onExit} className="text-sm font-medium text-indigo-600 hover:underline">
          Back to lobby
        </button>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
        <p className="text-sm text-muted-foreground">Loading your session…</p>
      </div>
    );
  }

  /* ── Session report ── */
  if (report || sessionStatus === 'completed') {
    const score    = report?.session?.overall_score;
    const analysis = report?.analysis || {};
    const scoreColor =
      score >= 80 ? 'text-emerald-600' :
      score >= 60 ? 'text-amber-600'   : 'text-red-500';

    return (
      <div className="min-h-[calc(100vh-5rem)] bg-muted/30 px-4 py-8 sm:px-6 lg:px-8">
        <div className="platform-page__container platform-page__container--narrow">
          <button
            type="button"
            onClick={onExit}
            className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to AI Interview
          </button>

          {/* Score hero */}
          <div className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Session complete</h1>
                  <p className="text-sm text-indigo-200">{report?.session?.interview_type || 'Interview practice'}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              {score != null && (
                <div className="mb-2 flex items-end gap-2">
                  <span className={`text-5xl font-extrabold tabular-nums ${scoreColor}`}>{Math.round(score)}</span>
                  <span className={`mb-1 text-2xl font-bold ${scoreColor}`}>%</span>
                </div>
              )}
              {report?.session?.summary_feedback && (
                <p className="text-sm leading-relaxed text-muted-foreground">{report.session.summary_feedback}</p>
              )}
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths?.length > 0 && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle className="h-4 w-4" /> Strengths
              </h3>
              <ul className="space-y-1.5">
                {analysis.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                <TrendingUp className="h-4 w-4" /> Areas to improve
              </h3>
              <ul className="space-y-1.5">
                {analysis.recommendations.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={onExit}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  /* ── Active session ── */
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">

        {/* Back + header */}
        <button
          type="button"
          onClick={onExit}
          className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit session
        </button>

        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">Live interview</h1>
                <p className="text-xs text-muted-foreground">
                  Question {Math.min(currentIndex + 1, questions.length)} of {questions.length}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-indigo-600">{answeredCount}/{questions.length} answered</p>
            </div>
          </div>
          <div className="px-5 py-2">
            <ProgressBar value={answeredCount} max={questions.length} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Feedback panel */}
        {lastFeedback && (
          <div className="mb-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between gap-2 border-b border-emerald-200/60 px-4 py-3 dark:border-emerald-900/30">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">AI Feedback</span>
              </div>
              <ScoreBadge score={lastFeedback.score} />
            </div>
            <div className="px-4 py-3">
              <p className="mb-3 text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">{lastFeedback.feedback}</p>
              {lastFeedback.strengths.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-semibold text-emerald-700">Strengths</p>
                  <ul className="space-y-1">
                    {lastFeedback.strengths.map((s) => (
                      <li key={s} className="flex items-start gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                        <CheckCircle className="mt-0.5 h-3 w-3 shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lastFeedback.improvements.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-amber-700">To improve</p>
                  <ul className="space-y-1">
                    {lastFeedback.improvements.map((s) => (
                      <li key={s} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                        <TrendingUp className="mt-0.5 h-3 w-3 shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current question */}
        {currentQuestion && !currentQuestion.answered ? (
          <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/40 px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Question {currentIndex + 1}
              </span>
            </div>
            <div className="px-5 py-4">
              <p className="mb-5 text-base font-medium leading-relaxed text-foreground">{currentQuestion.prompt}</p>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                placeholder="Type your answer here…"
                disabled={submitting}
                className="mb-4 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={submitting || !answer.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? 'Evaluating…' : 'Submit answer'}
              </button>
            </div>
          </div>
        ) : !allAnswered ? (
          <div className="mb-5 rounded-2xl border border-border bg-card px-5 py-8 text-center">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Select the next unanswered question below.</p>
          </div>
        ) : null}

        {/* Question navigator */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions</span>
          </div>
          <ul className="divide-y divide-border">
            {questions.map((q, i) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm transition-colors ${
                    i === currentIndex
                      ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200'
                      : 'hover:bg-muted/50 text-foreground'
                  }`}
                >
                  {/* Status dot */}
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    q.answered
                      ? 'bg-emerald-100 text-emerald-700'
                      : i === currentIndex
                        ? 'bg-indigo-600 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {q.answered ? '✓' : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {q.prompt.slice(0, 72)}{q.prompt.length > 72 ? '…' : ''}
                  </span>
                  {q.answered && q.score != null && <ScoreBadge score={q.score} />}
                  {!q.answered && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Complete button */}
        {allAnswered && (
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-indigo-600 bg-white py-3 text-sm font-semibold text-indigo-600 transition-all hover:bg-indigo-50 active:scale-[0.98] disabled:opacity-50 dark:bg-card dark:hover:bg-indigo-950/30"
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {completing ? 'Generating your report…' : 'Complete session & view report'}
          </button>
        )}

      </div>
    </div>
  );
}
