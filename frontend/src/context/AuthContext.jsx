import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { translations } from '../i18n';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('juki_token'));
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(localStorage.getItem('juki_lang') || 'en');

  // Translation helper
  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'si' : 'en';
    setLang(nextLang);
    localStorage.setItem('juki_lang', nextLang);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('juki_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('juki_token');
            setUser(null);
          }
        } catch {
          localStorage.removeItem('juki_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.success && res.token) {
      localStorage.setItem('juki_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return { success: true };
    }
    return { success: false, message: res.message || 'Login failed' };
  };

  // Quick Role Demo Switcher for pair-testing
  const quickSwitchRole = async (targetRole) => {
    let email = 'admin@anujaya.com';
    let password = 'admin123';
    if (targetRole === 'Partner') {
      email = 'partner@global.com';
      password = 'partner123';
    } else if (targetRole === 'Staff') {
      email = 'staff@anujaya.com';
      password = 'staff123';
    }
    return await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('juki_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    quickSwitchRole,
    lang,
    setLang,
    toggleLang,
    t,
    isAdmin: user?.role === 'Admin',
    isPartner: user?.role === 'Partner',
    isStaff: user?.role === 'Staff',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
