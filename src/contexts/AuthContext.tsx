
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  login: () => Promise<void>; // Google login still placeholder for now
  signInWithEmail: (email: string, pass: string) => Promise<{ role: string }>;
  signUpWithEmail: (email: string, pass: string, name: string, studentId: string, role: UserRole) => Promise<{ role: string }>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          setRole(res.data.role);
        } catch (error) {
          console.error("Token invalid or expired");
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async () => {
    console.warn("Google Login is not supported.");
  };

  const signInWithEmail = async (email: string, pass: string): Promise<{ role: string }> => {
    try {
      const res = await api.post('/auth/login', { email, password: pass });
      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      setUser(userData);
      setRole(userData.role);
      return userData;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, studentId: string, role: UserRole): Promise<{ role: string }> => {
    try {
      const res = await api.post('/auth/register', { email, password: pass, name, studentId, role });
      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      setUser(userData);
      setRole(userData.role);
      return userData;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Đăng ký thất bại");
    }
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
    setRole(null);
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, signInWithEmail, signUpWithEmail, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
