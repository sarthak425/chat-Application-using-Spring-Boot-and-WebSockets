import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { http, setAuthToken } from '../lib/http';

const AuthContext = createContext(null);
const STORAGE_KEY = 'chatbox.auth.v1';

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    setAuthToken(token);
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await http.get('/api/auth/me');
        if (active) {
          setUser(response.data);
        }
      } catch {
        if (active) {
          setTokenState('');
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [token]);

  async function register(payload) {
    const response = await http.post('/api/auth/register', payload);
    setTokenState(response.data.token);
    setUser(response.data.user);
    return response.data;
  }

  async function login(payload) {
    const response = await http.post('/api/auth/login', payload);
    setTokenState(response.data.token);
    setUser(response.data.user);
    return response.data;
  }

  function logout() {
    setTokenState('');
    setUser(null);
  }

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    register,
    login,
    logout,
    setUser
  }), [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
