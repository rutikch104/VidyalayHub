import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ProfileNavigationProvider } from '@/contexts/ProfileNavigationContext';
import Header         from '@/components/Header';
import LeftSidebar    from '@/components/LeftSidebar';
import HomeSidebarRail from '@/components/home/HomeSidebarRail';
import FeedTabs       from '@/components/FeedTabs';
import CreatePost     from '@/components/CreatePost';
import PostCard       from '@/components/PostCard';
import FeedPostCard   from '@/components/posts/FeedPostCard';
import FeedSkeleton   from '@/components/FeedSkeleton';
import Profile        from '@/components/Profile';
import ProfileActivity from '@/components/ProfileActivity';

const LibraryCenter = lazy(() => import('@/components/LibraryCenter'));
const TeacherCenter = lazy(() => import('@/components/TeacherCenter'));
const AIInterview = lazy(() => import('@/components/AIInterview'));
const InterviewSession = lazy(() => import('@/components/aiInterview/InterviewSession'));
const AIEnglish = lazy(() => import('@/components/AIEnglish'));
const Notifications = lazy(() => import('@/components/Notifications'));
const Messages = lazy(() => import('@/components/Messages'));
const Communities = lazy(() => import('@/components/Communities'));
const Bookmarks = lazy(() => import('@/components/Bookmarks'));
const Jobs = lazy(() => import('@/components/Jobs'));
const Events = lazy(() => import('@/components/Events'));
const Settings = lazy(() => import('@/components/Settings'));
const Network = lazy(() => import('@/components/Network'));
const AdminDashboard = lazy(() => import('@/components/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('@/components/SuperAdminDashboard'));
import PortalAccessDenied from '@/components/PortalAccessDenied';
import UserProfileRoute from '@/components/profile/UserProfileRoute';
import { canSeeAdminNav, canSeeSuperAdminNav, getPortalAccess } from '@/lib/access';
import { filterPostsForCollegeHome } from '@/lib/feedTenant';
const RCPITChatGPT = lazy(() => import('@/components/RCPITChatGPT'));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <div className="loading-spinner h-8 w-8" />
    </div>
  );
}

function LazyPage({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
import Login          from '@/components/Login';
import Register       from '@/components/Register';
import RegistrationStatusPage from '@/components/registration/RegistrationStatusPage';
import CollegeRegister from '@/components/CollegeRegister';
import SuperAdminLogin from '@/components/SuperAdminLogin';
import postService         from '@/services/postService';
import notificationService from '@/services/notificationService';
import messageService      from '@/services/messageService';
import { NOTIF_NAV_KEYS, peekStringKey } from '@/lib/notificationNavigation';
import { toast } from '@/components/ui/sonner';
import { Sparkles } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import ProfileOnboardingWizard from '@/components/onboarding/ProfileOnboardingWizard';
import userService from '@/services/userService';
import { setSelfProfileCache } from '@/lib/selfIdentityCache';
import { shouldShowOnboarding } from '@/lib/onboardingUtils';

/* ─── Main app content ──────────────────────────────────────────── */
function AppContent() {
  const [currentPage,   setCurrentPage]   = useState('home');
  const [activeFeedTab, setActiveFeedTab] = useState('for-you');
  const [posts,         setPosts]         = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [mobileMenuOpen,setMobileMenuOpen]= useState(false);
  const [messagesBadge,     setMessagesBadge]     = useState(0);
  const [notificationsBadge,setNotificationsBadge]= useState(0);
  const [interviewSessionId, setInterviewSessionId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!user || user.user_type === 'staff') {
      setShowOnboarding(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await userService.getCurrentUserProfile();
        setSelfProfileCache(profile);
        if (!cancelled) setShowOnboarding(shouldShowOnboarding(profile, user));
      } catch {
        if (!cancelled) setShowOnboarding(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.user_type]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [n, m] = await Promise.all([
          notificationService.getUnreadCount(),
          messageService.getUnreadCount(),
        ]);
        if (cancelled) return;
        setNotificationsBadge(typeof n?.unread_count === 'number' ? n.unread_count : 0);
        setMessagesBadge(typeof m?.total_unread === 'number' ? m.total_unread : 0);
      } catch {
        if (!cancelled) { setNotificationsBadge(0); setMessagesBadge(0); }
      }
    })();
    return () => { cancelled = true; };
  }, [user, currentPage]);

  useEffect(() => { setMobileMenuOpen(false); }, [currentPage]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sortMap = { 'for-you': 'latest', following: 'latest', trending: 'trending', network: 'latest' };
      const res = await postService.getPosts({
        page: 1,
        limit: 10,
        sort: sortMap[activeFeedTab] || 'latest',
        filter_tenant: true,
      });
      setPosts(filterPostsForCollegeHome(res.posts, user));
    } catch (err) {
      if (err?.response?.status !== 401)
        setError(err?.response?.data?.message || 'Failed to fetch posts');
    } finally { setLoading(false); }
  }, [activeFeedTab, user]);

  useEffect(() => {
    if (user && currentPage === 'home') void fetchPosts();
  }, [user, currentPage, fetchPosts]);

  useEffect(() => {
    if (currentPage !== 'home' || !user) return;
    const postId = peekStringKey(NOTIF_NAV_KEYS.POST_ID) || peekStringKey('scroll_to_post_id');
    if (!postId) return;
    if (posts.some((p) => String(p.id) === String(postId) || String(p.original_post_id) === String(postId))) return;

    let cancelled = false;
    (async () => {
      try {
        const post = await postService.getPost(postId);
        if (cancelled) return;
        setPosts((prev) => {
          if (prev.some((p) => String(p.id) === String(postId))) return prev;
          return [post, ...prev];
        });
      } catch {
        if (!cancelled) {
          sessionStorage.removeItem(NOTIF_NAV_KEYS.POST_ID);
          sessionStorage.removeItem('scroll_to_post_id');
          sessionStorage.removeItem(NOTIF_NAV_KEYS.OPEN_COMMENTS);
          sessionStorage.removeItem(NOTIF_NAV_KEYS.COMMENT_ID);
          toast.error('Content no longer available.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [currentPage, user, posts]);

  useEffect(() => {
    if (currentPage !== 'home' || posts.length === 0) return;
    const pid = sessionStorage.getItem('scroll_to_post_id') || sessionStorage.getItem(NOTIF_NAV_KEYS.POST_ID);
    if (!pid) return;
    if (!posts.some((p) => String(p.id) === String(pid) || String(p.original_post_id) === String(pid))) return;
    const t = window.setTimeout(() => {
      document.getElementById(`post-${pid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [currentPage, posts]);

  const handlePostCreated = (newPost) => {
    const scoped = filterPostsForCollegeHome([newPost], user);
    if (scoped.length) setPosts((prev) => [newPost, ...prev]);
  };
  const handlePostDeleted = (postId)  => setPosts((prev) => prev.filter((p) => p.id !== postId && p.original_post_id !== postId));
  const handleAmplifyRemoved = (amplifyItem, res) => {
    setPosts((prev) => prev.filter((p) => p.id !== amplifyItem.id));
    if (res && !res.is_amplified && !res.is_reposted && amplifyItem?.original_post_id) {
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(amplifyItem.original_post_id)
            ? {
                ...p,
                is_amplified: false,
                is_reposted: false,
                reposts_count: res.reposts_count ?? res.amplifies_count ?? p.reposts_count,
                amplifies_count: res.amplifies_count ?? res.reposts_count ?? p.amplifies_count,
              }
            : p,
        ),
      );
    }
  };

  const handleAmplifyStateChange = (postId, res) => {
    if (res?.is_amplified || res?.is_reposted) return;
    setPosts((prev) =>
      prev
        .filter((p) => !(p.feed_type === 'amplify' && String(p.original_post_id) === String(postId)))
        .map((p) =>
          String(p.id) === String(postId)
            ? {
                ...p,
                is_amplified: false,
                is_reposted: false,
                reposts_count: res.reposts_count ?? res.amplifies_count ?? p.reposts_count,
                amplifies_count: res.amplifies_count ?? res.reposts_count ?? p.amplifies_count,
              }
            : p,
        ),
    );
  };
  const handlePostEdited  = (updated) => setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p));

  const canSeeSuperAdmin = user ? canSeeSuperAdminNav(user) : false;
  const canSeeAdmin = user ? canSeeAdminNav(user) : false;
  const portalAccess = user ? getPortalAccess(user) : 'none';

  /* Must run on every render — do not place after conditional returns */
  useEffect(() => {
    if (!user) return;
    if (currentPage === 'super-admin' && !canSeeSuperAdminNav(user)) setCurrentPage('home');
  }, [user, currentPage]);

  if (authLoading) {
    return (
      <div className="app-body-surface flex min-h-screen items-center justify-center px-4">
        <div className="rounded-2xl border border-border/50 bg-card/90 px-10 py-8 text-center shadow-professional ring-1 ring-black/[0.03] backdrop-blur-sm">
          <div className="loading-spinner mx-auto mb-4 h-9 w-9 border-[2.5px]" />
          <p className="text-sm font-medium text-foreground">Loading your workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">One moment…</p>
        </div>
      </div>
    );
  }

  if (user && (window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/register-college')) {
    window.history.replaceState({}, '', '/');
  }

  if (!user) {
    const path = window.location.pathname;
    return (
      <div className="min-h-screen app-body-surface">
        {path === '/register' ? (
          <Register />
        ) : path === '/registration-status' ? (
          <RegistrationStatusPage />
        ) : path === '/register-college' ? (
          <CollegeRegister />
        ) : path === '/super-admin-login' ? (
          <SuperAdminLogin
            onSuccess={() => {
              window.history.replaceState({}, '', '/');
              setCurrentPage('super-admin');
            }}
          />
        ) : (
          <Login />
        )}
      </div>
    );
  }

  const sidebarCounts = { messagesBadge, notificationsBadge };

  const withMainLayout = (page, content) => (
    <div className="flex min-h-[calc(100vh-3.75rem)]">
      <LeftSidebar
        onNavigate={setCurrentPage}
        currentPage={page}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        canSeeSuperAdmin={canSeeSuperAdmin}
        canSeeAdmin={canSeeAdmin}
        {...sidebarCounts}
      />
      <main className="main-canvas">{content}</main>
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'library':       return withMainLayout('library',       <LazyPage><LibraryCenter /></LazyPage>);
      case 'teacher':       return withMainLayout('teacher',       <LazyPage><TeacherCenter /></LazyPage>);
      case 'ai-interview':
        return withMainLayout(
          'ai-interview',
          <LazyPage>
            <AIInterview
              onStartSession={(sessionId) => {
                setInterviewSessionId(sessionId);
                setCurrentPage('ai-interview-session');
              }}
            />
          </LazyPage>,
        );
      case 'ai-interview-session':
        return withMainLayout(
          'ai-interview',
          <LazyPage>
            <InterviewSession
              sessionId={interviewSessionId}
              onExit={() => {
                setInterviewSessionId(null);
                setCurrentPage('ai-interview');
              }}
              onComplete={() => setInterviewSessionId(null)}
            />
          </LazyPage>,
        );
      case 'ai-english':    return withMainLayout('ai-english',    <LazyPage><AIEnglish /></LazyPage>);
      case 'notifications': return withMainLayout('notifications', <LazyPage><Notifications onNavigate={setCurrentPage} /></LazyPage>);
      case 'messages':      return withMainLayout('messages',      <LazyPage><Messages /></LazyPage>);
      case 'communities':   return withMainLayout('communities',   <LazyPage><Communities /></LazyPage>);
      case 'bookmarks':     return withMainLayout('bookmarks',     <LazyPage><Bookmarks /></LazyPage>);
      case 'jobs':          return withMainLayout('jobs',          <LazyPage><Jobs /></LazyPage>);
      case 'events':        return withMainLayout('events',        <LazyPage><Events /></LazyPage>);
      case 'settings':      return withMainLayout('settings',      <LazyPage><Settings /></LazyPage>);
      case 'network':       return withMainLayout('network',       <LazyPage><Network /></LazyPage>);
      case 'profile':       return withMainLayout('profile',       <Profile onNavigate={setCurrentPage} />);
      case 'profile-activity': return withMainLayout('profile-activity', <ProfileActivity onNavigate={setCurrentPage} />);
      case 'user-profile':
        return withMainLayout('user-profile', <UserProfileRoute onNavigate={setCurrentPage} />);
      case 'admin':
        if (canSeeAdmin) {
          return withMainLayout(
            'admin',
            <LazyPage>
              <AdminDashboard
                portalAccess={portalAccess}
                onNavigate={setCurrentPage}
                onAccessDenied={() => setCurrentPage('home')}
              />
            </LazyPage>,
          );
        }
        return withMainLayout(
          'home',
          <PortalAccessDenied
            title="Admin access required"
            message="College administrators need a staff account or a registered college admin email for your institution. Students cannot open the admin portal."
            onGoHome={() => setCurrentPage('home')}
          />,
        );
      case 'super-admin':
        return canSeeSuperAdmin
          ? withMainLayout('super-admin', <LazyPage><SuperAdminDashboard /></LazyPage>)
          : withMainLayout(
              'home',
              <PortalAccessDenied
                title="Super Admin access required"
                message="Please sign in via /super-admin-login with a platform owner account."
                onGoHome={() => setCurrentPage('home')}
              />,
            );
      case 'rcpit-chatgpt': return withMainLayout('rcpit-chatgpt', <LazyPage><RCPITChatGPT /></LazyPage>);

      case 'home':
      default:
        return (
          <div className="flex min-h-[calc(100vh-3.75rem)]">
            <LeftSidebar
              onNavigate={setCurrentPage}
              currentPage={currentPage}
              mobileOpen={mobileMenuOpen}
              onMobileClose={() => setMobileMenuOpen(false)}
              canSeeSuperAdmin={canSeeSuperAdmin}
              canSeeAdmin={canSeeAdmin}
              {...sidebarCounts}
            />
            <main className="main-canvas home-layout">
              <div className="home-layout__container">
                <div className="home-layout__grid">
                  <section className="home-layout__feed" aria-label="Feed">
                    <div className="home-layout__feed-nav">
                      <FeedTabs activeTab={activeFeedTab} onTabChange={setActiveFeedTab} />
                    </div>
                    <div className="home-layout__feed-stream">
                      <CreatePost onPostCreated={handlePostCreated} />

                      {error && <div className="app-alert-error rounded-xl">{error}</div>}

                      {loading ? (
                        <FeedSkeleton />
                      ) : (
                        <div className="platform-stagger space-y-4">
                          {posts.length === 0 ? (
                            <EmptyState
                              icon={Sparkles}
                              title="No posts yet"
                              description="Start a conversation above — share something with your campus!"
                            />
                          ) : (
                            posts.map((post) => (
                              <FeedPostCard
                                key={post.id}
                                item={post}
                                onPostDeleted={handlePostDeleted}
                                onPostEdited={handlePostEdited}
                                onNavigate={setCurrentPage}
                                onAmplifyRemoved={handleAmplifyRemoved}
                                onAmplifyStateChange={handleAmplifyStateChange}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  <HomeSidebarRail onNavigate={setCurrentPage} />
                </div>
              </div>
            </main>
          </div>
        );
    }
  };

  return (
    <ProfileNavigationProvider onNavigate={setCurrentPage}>
      <div className="min-h-screen app-body-surface">
        <Header
          onNavigate={setCurrentPage}
          currentPage={currentPage}
          onMobileMenuToggle={() => setMobileMenuOpen((v) => !v)}
          isMobileMenuOpen={mobileMenuOpen}
        />
        {renderCurrentPage()}
        {showOnboarding ? (
          <ProfileOnboardingWizard
            user={user}
            onComplete={() => setShowOnboarding(false)}
            onDismiss={() => setShowOnboarding(false)}
          />
        ) : null}
      </div>
    </ProfileNavigationProvider>
  );
}

function App() {
  return (
    <ErrorBoundary fallbackMessage="The application encountered an error. Please refresh the page.">
      <TenantProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TenantProvider>
    </ErrorBoundary>
  );
}

export default App;
