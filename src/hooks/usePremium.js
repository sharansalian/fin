import { useAuth } from '../context/AuthContext';

const ADMIN_EMAIL = 'sharansalian.business@gmail.com';

export const usePremium = () => {
  const { user, userProfile } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const isPremium = isAdmin || !!userProfile?.isPremium;
  return { isPremium, isAdmin };
};
