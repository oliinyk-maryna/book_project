import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.api';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoggedIn = !!user;

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { setIsLoading(false); return; }
    try {
      const data = await authApi.getMe();
      setUser(data);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
    const handler = () => { setUser(null); };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [fetchMe]);

  const login = async (credentials) => {
    const data = await authApi.login(credentials);
    localStorage.setItem('token', data.token);
    await fetchMe();
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.assign('/');
  };

  const refresh = fetchMe;

  return { user, isLoggedIn, isLoading, login, logout, refresh };
}
