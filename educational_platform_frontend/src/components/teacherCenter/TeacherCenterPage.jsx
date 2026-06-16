// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { NOTIF_NAV_KEYS, consumeStringKey } from '@/lib/notificationNavigation';
import {
  Search,
  Plus,
  HelpCircle,
  Globe,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import globalQuestionService from '@/services/globalQuestionService';
import socialComposerService from '@/services/socialComposerService';
import bookmarkService from '@/services/bookmarkService';
import { emitNotificationsChanged } from '@/services/notificationService';
import QuestionCard from './QuestionCard';
import QuestionSkeleton from './QuestionSkeleton';
import AskQuestionModal from './AskQuestionModal';
import PageHeader from '@/components/ui/PageHeader';
import ModuleFeedTabs from '@/components/ui/ModuleFeedTabs';
import EmptyState from '@/components/ui/EmptyState';
import QuestionDetailModal from './QuestionDetailModal';
import { STATUS_TABS, normalizeQuestion, addReplyToTree } from './teacherCenterUtils';

export default function TeacherCenterPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [popularTags, setPopularTags] = useState([]);
  const [showAsk, setShowAsk] = useState(false);
  const [detailQuestion, setDetailQuestion] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [likedIds, setLikedIds] = useState(new Set());
  const [bookmarkedQ, setBookmarkedQ] = useState(new Set());
  const [bookmarkedA, setBookmarkedA] = useState(new Set());
  const [resolving, setResolving] = useState(false);
  const fetchSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    socialComposerService.getPopularHashtags().then(setPopularTags).catch(() => {});
  }, []);

  useEffect(() => {
    const questionId = consumeStringKey(NOTIF_NAV_KEYS.QUESTION_ID);
    if (!questionId) return;
    void (async () => {
      setDetailLoading(true);
      try {
        const data = await globalQuestionService.getQuestion(questionId);
        const full = data.question || data;
        setDetailQuestion(full);
      } catch {
        toast.error('Content no longer available.');
      } finally {
        setDetailLoading(false);
      }
    })();
  }, []);

  const fetchQuestions = useCallback(async (pageNum = 1, append = false) => {
    const seq = ++fetchSeq.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const res = await globalQuestionService.getQuestions({
        page: pageNum,
        limit: 15,
        search: debouncedSearch || undefined,
        status: activeTab === 'all' ? undefined : activeTab,
      });
      if (seq !== fetchSeq.current) return;
      const list = (res.questions || []).map(normalizeQuestion);
      let mergedList = list;
      setQuestions((prev) => {
        mergedList = append ? [...prev, ...list] : list;
        return mergedList;
      });
      const pag = res.pagination || {};
      setHasMore(pag.page < pag.pages);
      setPage(pageNum);

      const liked = new Set();
      list.forEach((q) => {
        if (q.is_liked) liked.add(q.id);
      });
      setLikedIds((prev) => {
        const next = append ? new Set(prev) : new Set();
        liked.forEach((id) => next.add(id));
        return next;
      });

      try {
        const bm = await bookmarkService.getUserBookmarksByType('question', { limit: 200, page: 1 });
        if (seq !== fetchSeq.current) return;
        const ids = new Set();
        const idSet = new Set(mergedList.map((q) => q.id));
        (bm.bookmarks || []).forEach((b) => {
          if (b.type_id && idSet.has(b.type_id)) ids.add(b.type_id);
        });
        setBookmarkedQ(ids);
      } catch {
        /* optional */
      }
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      setError(err?.response?.data?.message || 'Failed to load questions');
    } finally {
      if (seq === fetchSeq.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    setPage(1);
    void fetchQuestions(1, false);
  }, [fetchQuestions]);

  const patchQuestion = useCallback((id, patch) => {
    const merge = (q) => (q?.id === id ? { ...q, ...patch } : q);
    setQuestions((prev) => prev.map(merge));
    setDetailQuestion((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  }, []);

  const openDetail = async (q) => {
    setDetailQuestion(normalizeQuestion(q));
    setDetailLoading(true);
    try {
      const full = normalizeQuestion(await globalQuestionService.getQuestion(q.id));
      setDetailQuestion(full);
      if (full.is_liked) setLikedIds((prev) => new Set(prev).add(full.id));
      const bm = await bookmarkService.getUserBookmarksByType('answer', { limit: 300, page: 1 });
      const ids = new Set();
      const answerIds = new Set((full.answers || []).map((a) => a.id));
      (bm.bookmarks || []).forEach((b) => {
        if (b.type_id && answerIds.has(b.type_id)) ids.add(b.type_id);
      });
      setBookmarkedA(ids);
    } catch {
      setDetailQuestion(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLike = async (questionId) => {
    const wasLiked = likedIds.has(questionId);
    const q = questions.find((x) => x.id === questionId) || detailQuestion;
    const prev = q?.likes_count ?? 0;
    patchQuestion(questionId, { is_liked: !wasLiked, likes_count: wasLiked ? Math.max(0, prev - 1) : prev + 1 });
    setLikedIds((prevSet) => {
      const n = new Set(prevSet);
      if (wasLiked) n.delete(questionId);
      else n.add(questionId);
      return n;
    });
    try {
      const { is_liked, likes_count } = await globalQuestionService.toggleQuestionLike(questionId);
      patchQuestion(questionId, { is_liked, likes_count: likes_count ?? prev });
      setLikedIds((prevSet) => {
        const n = new Set(prevSet);
        if (is_liked) n.add(questionId);
        else n.delete(questionId);
        return n;
      });
      emitNotificationsChanged();
    } catch {
      patchQuestion(questionId, { is_liked: wasLiked, likes_count: prev });
    }
  };

  const handleBookmarkQ = async (questionId) => {
    try {
      if (bookmarkedQ.has(questionId)) {
        const check = await bookmarkService.checkBookmark('question', questionId);
        if (check.bookmark_id) await bookmarkService.deleteBookmark(check.bookmark_id);
        setBookmarkedQ((prev) => {
          const n = new Set(prev);
          n.delete(questionId);
          return n;
        });
      } else {
        await bookmarkService.createBookmark('question', questionId);
        setBookmarkedQ((prev) => new Set(prev).add(questionId));
      }
    } catch {
      /* ignore */
    }
  };

  const handleBookmarkA = async (answerId) => {
    try {
      if (bookmarkedA.has(answerId)) {
        const check = await bookmarkService.checkBookmark('answer', answerId);
        if (check.bookmark_id) await bookmarkService.deleteBookmark(check.bookmark_id);
        setBookmarkedA((prev) => {
          const n = new Set(prev);
          n.delete(answerId);
          return n;
        });
      } else {
        await bookmarkService.createBookmark('answer', answerId);
        setBookmarkedA((prev) => new Set(prev).add(answerId));
      }
    } catch {
      /* ignore */
    }
  };

  const handleAnswerLike = async (answer) => {
    if (!detailQuestion) return;
    const prevLiked = answer.is_liked;
    const prevCount = answer.likes_count ?? 0;
    const patchAnswers = (answers) =>
      answers.map((a) =>
        a.id === answer.id
          ? {
              ...a,
              is_liked: !prevLiked,
              likes_count: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
            }
          : a,
      );
    setDetailQuestion((q) => ({ ...q, answers: patchAnswers(q.answers || []) }));
    try {
      const { is_liked, likes_count } = await globalQuestionService.toggleAnswerLike(
        detailQuestion.id,
        answer.id,
      );
      setDetailQuestion((q) => ({
        ...q,
        answers: (q.answers || []).map((a) =>
          a.id === answer.id ? { ...a, is_liked, likes_count } : a,
        ),
      }));
      emitNotificationsChanged();
    } catch {
      setDetailQuestion((q) => ({ ...q, answers: patchAnswers(q.answers || []) }));
    }
  };

  const handleAnswerComment = (answerId, comment) => {
    setDetailQuestion((q) => ({
      ...q,
      answers: (q.answers || []).map((a) =>
        a.id === answerId
          ? {
              ...a,
              comments: addReplyToTree(a.comments || [], comment),
              comments_count: (a.comments_count || 0) + 1,
            }
          : a,
      ),
    }));
  };

  const handleSubmitAnswer = async ({ content, tags = [], mentioned_users = [] }) => {
    if (!detailQuestion) return;
    await globalQuestionService.addAnswer(detailQuestion.id, {
      content,
      tags,
      mentioned_users,
      attachments: [],
    });
    emitNotificationsChanged();
    const fresh = normalizeQuestion(await globalQuestionService.getQuestion(detailQuestion.id));
    setDetailQuestion(fresh);
    patchQuestion(detailQuestion.id, {
      answers: fresh.answers,
      answers_count: fresh.answers_count,
    });
    void fetchQuestions(1, false);
    void socialComposerService.getPopularHashtags().then(setPopularTags).catch(() => {});
  };

  const handleAsk = async (data) => {
    await globalQuestionService.createQuestion(data);
    emitNotificationsChanged();
    void fetchQuestions(1, false);
  };

  const canManageResolution = (q) =>
    !!user && (String(user.id) === String(q.asked_by) || user.user_type === 'teacher');

  const handleResolve = async (resolved) => {
    if (!detailQuestion || resolving) return;
    setResolving(true);
    try {
      const updated = normalizeQuestion(
        await globalQuestionService.updateQuestion(detailQuestion.id, { is_resolved: resolved }),
      );
      setDetailQuestion(updated);
      patchQuestion(updated.id, { is_resolved: updated.is_resolved });
      void fetchQuestions(1, false);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="platform-page">
      <div className="platform-page__container tc-page-stack">
        <PageHeader
          icon={Globe}
          badge="Global · All colleges"
          title="Teacher Central"
          description={
            user?.user_type === 'teacher'
              ? 'Answer questions from students anywhere. Share expertise across every campus.'
              : 'Ask anything. Tag teachers from any college. Learn together globally.'
          }
          variant="violet"
          action={
            <button
              type="button"
              onClick={() => setShowAsk(true)}
              className="platform-hero__cta text-violet-700 hover:bg-violet-50"
            >
              <Plus className="h-4 w-4" />
              Ask question
            </button>
          }
        />

        <div className="tc-feed-tabs">
          <ModuleFeedTabs
            shellClassName="tc-feed-tabs__shell"
            className="tc-feed-tabs__tabs"
            tabs={STATUS_TABS.map((tab) => ({ key: tab.id, label: tab.label }))}
            activeKey={activeTab}
            onChange={setActiveTab}
            ariaLabel="Filter by status"
          />
        </div>

        <div className="platform-toolbar">
          <div className="tc-toolbar-row">
            <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
              aria-hidden
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search questions globally…"
              className="platform-search tc-page__search"
              aria-label="Search questions"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
            </div>
          </div>
        </div>

        {error ? (
          <div className="tc-page__error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="shrink-0 text-destructive/70 hover:text-destructive"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {!loading && questions.length > 0 ? (
          <div className="tc-content-chrome">
            <p className="tc-content-chrome__count">
              {questions.length} question{questions.length === 1 ? '' : 's'}
              {debouncedSearch ? ` matching “${debouncedSearch}”` : ''}
            </p>
          </div>
        ) : null}

        <div className="tc-page__list platform-stagger">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <QuestionSkeleton key={i} />)
            : questions.length === 0
              ? (
                <EmptyState
                  className="w-full"
                  icon={HelpCircle}
                  title={debouncedSearch ? 'No matching questions' : 'No questions yet'}
                  description={
                    debouncedSearch
                      ? 'Try different keywords or clear your search to browse all discussions.'
                      : 'Start the global conversation — ask a question or explore what others are discussing.'
                  }
                  action={
                    !debouncedSearch ? (
                      <button
                        type="button"
                        onClick={() => setShowAsk(true)}
                        className="tc-page__empty-cta"
                      >
                        Ask the first question
                      </button>
                    ) : null
                  }
                />
              )
              : questions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  isLiked={likedIds.has(q.id)}
                  isBookmarked={bookmarkedQ.has(q.id)}
                  onLike={handleLike}
                  onBookmark={handleBookmarkQ}
                  onOpen={openDetail}
                />
              ))}
        </div>

        {!loading && hasMore ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => fetchQuestions(page + 1, true)}
            className="tc-page__load-more"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {loadingMore ? 'Loading…' : 'Load more questions'}
          </button>
        ) : null}

        <AskQuestionModal
          open={showAsk}
          onClose={() => setShowAsk(false)}
          onSubmit={handleAsk}
          popularTags={popularTags}
        />

        {detailQuestion && (
          <QuestionDetailModal
            question={detailQuestion}
            loading={detailLoading}
            onClose={() => setDetailQuestion(null)}
            user={user}
            canManageResolution={canManageResolution(detailQuestion)}
            onResolve={handleResolve}
            resolving={resolving}
            isLiked={likedIds.has(detailQuestion.id)}
            onLike={handleLike}
            bookmarkedAnswerIds={bookmarkedA}
            onBookmarkAnswer={handleBookmarkA}
            onAnswerLike={handleAnswerLike}
            onAnswerComment={handleAnswerComment}
            onSubmitAnswer={handleSubmitAnswer}
            popularTags={popularTags}
          />
        )}
      </div>
    </div>
  );
}
