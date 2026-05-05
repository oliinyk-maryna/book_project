import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout & Auth
import MainLayout from './components/layout/MainLayout';
import AuthModal from './components/auth/AuthModal';

// Pages
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import BookPage from './pages/BookPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import ClubsPage from './pages/ClubsPage';
import TopsPage from './pages/TopsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import LibraryPage from './pages/LibraryPage';

// API
import { authApi } from './api/auth.api';
import { Loader } from './components/ui';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [isInitializing, setIsInitializing] = useState(true);

  // Перевіряємо, чи є токен при завантаженні
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await authApi.getMe();
          setUser(data.profile || data);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, []);

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    window.location.href = '/'; // Перезавантажуємо, щоб очистити стан
  };

  if (isInitializing) return <Loader fullPage />;

  return (
    <>
      <MainLayout user={user} onOpenAuth={handleOpenAuth}>
        <Routes>
          <Route path="/" element={<HomePage isLoggedIn={!!user} />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/book/:id" element={<BookPage isLoggedIn={!!user} user={user} />} />
          <Route path="/tops" element={<TopsPage />} />
          
          {/* Захищені маршрути для звичайних користувачів */}
          <Route path="/library" element={user ? <LibraryPage isLoggedIn={!!user} openAuth={handleOpenAuth} /> : <Navigate to="/" />} />
          <Route path="/analytics" element={user ? <AnalyticsPage isLoggedIn={!!user} /> : <Navigate to="/" />} />
          <Route path="/clubs" element={<ClubsPage isLoggedIn={!!user} user={user} openAuth={handleOpenAuth} />} />
          <Route path="/profile" element={user ? <ProfilePage handleLogout={handleLogout} /> : <Navigate to="/" />} />
          <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/" />} />
          
          {/* Захищений маршрут для адміна */}
          <Route path="/admin" element={user?.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
        </Routes>
      </MainLayout>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={(userData) => setUser(userData)}
        initialMode={authMode === 'login'}
      />
    </>
  );
}