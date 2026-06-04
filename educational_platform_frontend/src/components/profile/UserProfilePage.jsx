// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import userService from '@/services/userService';
import connectionService from '@/services/connectionService';
import { formatPostFromApi } from '@/services/postService';
import VidhyalayHubProfileLayout from '@/components/profile/eduConnect/VidhyalayHubProfileLayout';
import { mapPublicProfileToLayout } from '@/lib/mapPublicProfileToLayout';
import ProfileSkeleton from '@/components/profile/premium/ProfileSkeleton';

export default function UserProfilePage({ userId, onBack, onNavigate }) {
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  const [userPublications, setUserPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [connectionId, setConnectionId] = useState(null);
  const [mutualConnections, setMutualConnections] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const connectBusyRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');

  const isSelf = currentUser?.id && userId && String(currentUser.id) === String(userId);

  const displayHandle = useMemo(() => {
    if (!profileData) return '';
    const h = profileData.handle || '';
    return h.startsWith('@') ? h : h ? `@${h}` : '';
  }, [profileData]);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const data = await userService.getPublicProfile(userId);
      const mapped = mapPublicProfileToLayout(data);
      if (!mapped) throw new Error('Invalid profile data');
      setProfileData(mapped);
      const st = data.connection_status || 'none';
      setConnectionStatus(st === 'connected' ? 'connected' : st === 'pending' ? 'pending' : 'none');
      setConnectionId(data.connection_id || null);
      setMutualConnections(data.mutual_connections_count ?? data.mutual_count ?? 0);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Profile could not be loaded.');
      setProfileData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadPosts = useCallback(async () => {
    if (!userId) return;
    setPostsLoading(true);
    try {
      const response = await userService.getUserPosts(userId, { page: 1, limit: 30 });
      const raw = response.posts || [];
      setUserPosts(raw.map(formatPostFromApi).filter(Boolean));
    } catch {
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [userId]);

  const loadProjectsAndPublications = useCallback(async () => {
    if (!userId) return;
    try {
      const [projectsRes, pubsRes] = await Promise.all([
        userService.getUserProjects(userId).catch(() => ({ projects: [] })),
        userService.getUserPublications(userId).catch(() => ({ publications: [] })),
      ]);
      const rawProjects = Array.isArray(projectsRes?.projects)
        ? projectsRes.projects
        : Array.isArray(projectsRes)
          ? projectsRes
          : [];
      // Normalise to the camelCase shape ProjectsSection expects (parity with Profile.jsx self-view)
      setUserProjects(
        rawProjects.map((project) => ({
          id: project.id,
          title: project.title,
          description: project.description,
          technologies: project.technologies || [],
          status: project.status || 'Completed',
          image: project.image_url,
          githubUrl: project.github_url,
          liveUrl: project.live_url,
        })),
      );
      const rawPubs = Array.isArray(pubsRes?.publications)
        ? pubsRes.publications
        : Array.isArray(pubsRes)
          ? pubsRes
          : [];
      setUserPublications(
        rawPubs.map((p) => ({
          id: p.id,
          title: p.title,
          venue: p.venue || '',
          year: p.year || '',
          description: p.description || '',
          url: p.url || '',
        })),
      );
    } catch {
      setUserProjects([]);
      setUserPublications([]);
    }
  }, [userId]);

  useEffect(() => {
    if (isSelf) {
      onNavigate?.('profile');
      return;
    }
    void loadProfile();
    void loadPosts();
    void loadProjectsAndPublications();
  }, [userId, isSelf, loadProfile, loadPosts, loadProjectsAndPublications, onNavigate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadPosts(), loadProjectsAndPublications()]);
    setRefreshing(false);
  };

  const handleConnect = async () => {
    if (!userId || connectBusyRef.current || actionBusy) return;
    connectBusyRef.current = true;
    setActionBusy(true);
    try {
      if (connectionStatus === 'connected' && connectionId) {
        await connectionService.removeConnection(connectionId);
        setConnectionStatus('none');
        setConnectionId(null);
      } else if (connectionStatus === 'pending' && connectionId) {
        await connectionService.withdrawConnectionRequest(connectionId);
        setConnectionStatus('none');
        setConnectionId(null);
      } else {
        const res = await connectionService.sendConnectionRequest(userId);
        setConnectionStatus('pending');
        setConnectionId(res?.connection_id || res?.id || null);
      }
      await loadProfile();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Connection request failed';
      setNotice(msg);
      setTimeout(() => setNotice(''), 4000);
    } finally {
      connectBusyRef.current = false;
      setActionBusy(false);
    }
  };

  const handleMessage = () => {
    try {
      sessionStorage.setItem('prefill_message_user_id', String(userId));
    } catch {
      /* ignore */
    }
    onNavigate?.('messages');
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/?profile=${userId}`;
    const title = `${profileData?.name || 'Member'} on Vidyalaya Hub`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') console.error(e);
    }
  };

  if (loading) return <ProfileSkeleton />;

  if (error || !profileData) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">{error || 'Profile not found.'}</p>
        <button type="button" onClick={onBack} className="app-btn-secondary">
          Go back
        </button>
      </div>
    );
  }

  return (
    <VidhyalayHubProfileLayout
      profileData={profileData}
      displayHandle={displayHandle}
      userPosts={userPosts}
      userProjects={userProjects}
      userPublications={userPublications}
      postsLoading={postsLoading}
      visitorMode
      onBack={onBack}
      onNavigate={onNavigate}
      connectionStatus={connectionStatus}
      onConnect={handleConnect}
      connectBusy={actionBusy}
      mutualConnections={mutualConnections}
      onMessage={handleMessage}
      onShareProfile={handleShareProfile}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      notice={notice}
      onDismissNotice={() => setNotice('')}
    />
  );
}
