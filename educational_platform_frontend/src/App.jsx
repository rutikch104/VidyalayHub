import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ProfileNavigationProvider } from '@/contexts/ProfileNavigationContext';
import Header         from '@/components/Header';
import LeftSidebar    from '@/components/LeftSidebar';
import RightSidebar   from '@/components/RightSidebar';
import FeedTabs       from '@/components/FeedTabs';
import CreatePost     from '@/components/CreatePost';
import PostCard       from '@/components/PostCard';
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
import CollegeRegister from '@/components/CollegeRegister';
import SuperAdminLogin from '@/components/SuperAdminLogin';
import postService         from '@/services/postService';
import notificationService from '@/services/notificationService';
import messageService      from '@/services/messageService';
import { Sparkles } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

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

  const { user, loading: authLoading } = useAuth();

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
    if (currentPage !== 'home' || posts.length === 0) return;
    const pid = sessionStorage.getItem('scroll_to_post_id');
    if (!pid) return;
    sessionStorage.removeItem('scroll_to_post_id');
    const t = window.setTimeout(() => {
      document.getElementById(`post-${pid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [currentPage, posts]);

  const handlePostCreated = (newPost) => {
    const scoped = filterPostsForCollegeHome([newPost], user);
    if (scoped.length) setPosts((prev) => [newPost, ...prev]);
  };
  const handlePostDeleted = (postId)  => setPosts((prev) => prev.filter((p) => p.id !== postId));
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

  const withSuperAdminLayout = (content) => (
    <main className="min-h-[calc(100vh-4rem)] w-full">{content}</main>
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
      case 'notifications': return withMainLayout('notifications', <LazyPage><Notifications /></LazyPage>);
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
          ? withSuperAdminLayout(<LazyPage><SuperAdminDashboard /></LazyPage>)
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
            <main className="main-canvas">
              <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-3 py-5 sm:px-5 xl:flex-row xl:gap-8 xl:px-8 xl:py-7">
                <div className="min-w-0 flex-1 space-y-5">
                  <FeedTabs activeTab={activeFeedTab} onTabChange={setActiveFeedTab} />
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
                          <PostCard
                            key={post.id}
                            post={post}
                            onPostDeleted={handlePostDeleted}
                            onPostEdited={handlePostEdited}
                            onNavigate={setCurrentPage}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                <aside className="hidden w-full shrink-0 xl:block xl:w-72 xl:pt-0.5">
                  <div className="sticky top-[4.25rem] space-y-5">
                    <RightSidebar onNavigate={setCurrentPage} />
                  </div>
                </aside>
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
