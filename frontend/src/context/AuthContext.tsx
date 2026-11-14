import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  bio?: string;
  skills: string[];
  preferredRoles: string[];
  timezone: string;
  role: 'PARTICIPANT' | 'ADMIN';
  memberships?: Array<{
    id: string;
    teamId: string;
    role: 'LEADER' | 'MEMBER';
    team: {
      id: string;
      name: string;
      hackathonId: string;
      hackathon: {
        id: string;
        title: string;
      };
    };
  }>;
  pendingRequests?: Array<{
    id: string;
    teamId: string;
    status: string;
    team: {
      id: string;
      name: string;
      hackathonId: string;
    };
  }>;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('teamforge_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await apiClient<{ success: boolean; data: UserProfile }>('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.warn('Failed to fetch current user session', err);
      localStorage.removeItem('teamforge_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    const res = await apiClient<{ success: boolean; data: { user: UserProfile; token: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );

    localStorage.setItem('teamforge_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const register = async (inputData: any) => {
    const res = await apiClient<{ success: boolean; data: { user: UserProfile; token: string } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(inputData),
      }
    );

    localStorage.setItem('teamforge_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('teamforge_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

