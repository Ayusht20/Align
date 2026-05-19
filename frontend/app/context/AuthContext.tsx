'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getTokenPayload, isLoggedIn, removeToken } from '@/lib/auth';

interface AuthUser {
  username: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  refreshAuth: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  refreshAuth: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshAuth = useCallback(() => {
    if (isLoggedIn()) {
      const payload = getTokenPayload();
      if (payload?.username) {
        setUser({ username: payload.username });
        return;
      }
    }
    setUser(null);
  }, []);

  const signOut = useCallback(() => {
    removeToken();
    setUser(null);
    window.location.href = '/login';
  }, []);

  // Run once on mount
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, refreshAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);