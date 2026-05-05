import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

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
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import LibraryPage from './pages/LibraryPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  // Додаємо стан для режиму модалки (вхід чи реєстрація)
  const [authMode, setAuthMode] = useState('login'); 

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <Router>
      {/* 
        MainLayout огортає всі сторінки. 
        Він сам малює бокове/нижнє меню та верхній хедер 
      */}
      <MainLayout user={user} onOpenAuth={handleOpenAuth}>
        <Routes>
          <Route path="/" element={<HomePage isLoggedIn={!!user} />} />
          <Route path="/discover" element={<DiscoverPage />} />
          
          <Route 
            path="/book/:id" 
            element={<BookPage isLoggedIn={!!user} user={user} openAuth={handleOpenAuth} />} 
          />
          
          <Route 
            path="/library" 
            element={<LibraryPage isLoggedIn={!!user} openAuth={handleOpenAuth} />} 
          />
          
          <Route path="/analytics" element={<AnalyticsPage isLoggedIn={!!user} />} />
          
          <Route 
            path="/clubs" 
            element={<ClubsPage isLoggedIn={!!user} user={user} openAuth={handleOpenAuth} />} 
          />
          
          <Route path="/tops" element={<TopsPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Захищені маршрути */}
          <Route 
            path="/profile" 
            element={<ProfilePage handleLogout={handleLogout} />} 
          />
          <Route path="/settings" element={<SettingsPage />} />
          
          {user?.role === 'admin' && (
            <Route path="/admin" element={<AdminPage />} />
          )}
        </Routes>
      </MainLayout>

      {/* Модальне вікно авторизації */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onSuccess={(userData) => setUser(userData)}
        initialMode={authMode === 'login'}
      />
    </Router>
  );
}