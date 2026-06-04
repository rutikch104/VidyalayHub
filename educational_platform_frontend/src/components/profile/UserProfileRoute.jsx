import { useEffect } from 'react';
import { useProfileNavigation } from '@/contexts/ProfileNavigationContext';
import UserProfilePage from '@/components/profile/UserProfilePage';

export default function UserProfileRoute({ onNavigate }) {
  const { viewUserId, closeProfile } = useProfileNavigation();

  useEffect(() => {
    if (!viewUserId) onNavigate?.('home');
  }, [viewUserId, onNavigate]);

  if (!viewUserId) {
    return null;
  }

  return (
    <UserProfilePage
      userId={viewUserId}
      onBack={closeProfile}
      onNavigate={onNavigate}
    />
  );
}
