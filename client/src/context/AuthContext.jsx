import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        return api.get('/couples/info');
      })
      .then((res) => setCouple(res.data))
      .catch((err) => {
        // 401 or 404 means token is invalid or user was wiped (e.g. DB reset) — force logout
        if (err.response?.status === 401 || err.response?.status === 404) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    try {
      const coupleRes = await api.get('/couples/info');
      setCouple(coupleRes.data);
    } catch {}
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCouple(null);
    window.location.href = '/login';
  };

  const refreshCouple = async () => {
    try {
      const res = await api.get('/couples/info');
      setCouple(res.data);
      return res.data;
    } catch {
      setCouple(null);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, couple, loading, login, register, logout, refreshCouple, setCouple }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
