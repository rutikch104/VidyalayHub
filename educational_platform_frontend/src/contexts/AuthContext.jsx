import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService, { normalizeAuthUser } from '@/services/authService';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = authService.getStoredUser();
        const token = authService.getStoredToken();
        if (storedUser && token) {
          try {
            const currentUser = await authService.getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
            } else {
              await authService.logout();
              setUser(null);
            }
          } catch {
            setUser(normalizeAuthUser(storedUser));
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    const handleAuthLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth-logout', handleAuthLogout);
    initializeAuth();
    return () => {
      window.removeEventListener('auth-logout', handleAuthLogout);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const { user } = await authService.login({ email, password });
      setUser(user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (credentials) => {
    try {
      const result = await authService.register(credentials);
      if (result.pendingApproval) {
        return result;
      }
      setUser(result.user);
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const superAdminLogin = async (email, password) => {
    try {
      const { user } = await authService.superAdminLogin({ email, password });
      setUser(user);
    } catch (error) {
      console.error('Super admin login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const updateUser = useCallback((userData) => {
    setUser((prev) => {
      const next = normalizeAuthUser({ ...(prev || {}), ...userData });
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const value = {
    user,
    loading,
    login,
    superAdminLogin,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
