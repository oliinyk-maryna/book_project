import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import BookPage from './pages/BookPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPage from './pages/AdminPage';
import ClubsPage from './pages/ClubsPage';
import AuthModal from './components/auth/AuthModal';

export default function App() {
  const [user, setUser] = useState(null); // Стан користувача
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const isLoggedIn = !!user;

  return (
    <Router>
      <div className="min-h-screen bg-[#FDFCFB] text-stone-900 font-sans selection:bg-emerald-100">
        <Navbar 
          user={user} 
          openAuth={() => setIsAuthOpen(true)} 
          logout={() => setUser(null)} 
        />
        
        <Routes>
          <Route path="/" element={<HomePage isLoggedIn={isLoggedIn} />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/book/:id" element={<BookPage isLoggedIn={isLoggedIn} user={user} />} />
          <Route path="/analytics" element={<AnalyticsPage isLoggedIn={isLoggedIn} />} />
          <Route path="/clubs" element={<ClubsPage isLoggedIn={isLoggedIn} />} />
          {user?.role === 'admin' && (
            <Route path="/admin" element={<AdminPage />} />
          )}
        </Routes>

        <AuthModal 
          isOpen={isAuthOpen} 
          onClose={() => setIsAuthOpen(false)} 
          onSuccess={(userData) => setUser(userData)} 
        />
      </div>
    </Router>
  );
}