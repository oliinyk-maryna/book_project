import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Home, Compass, Library, Users, BarChart2, ShieldCheck, Loader2, X, Search, User, Lock } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

import HomePage        from './pages/HomePage';
import DiscoverPage    from './pages/DiscoverPage';
import LibraryPage     from './pages/LibraryPage';
import ClubsPage       from './pages/ClubsPage';
import AnalyticsPage   from './pages/AnalyticsPage';
import BookPage        from './pages/BookPage';
import ProfilePage     from './pages/ProfilePage';
import SettingsPage    from './pages/SettingsPage';
import AdminPage       from './pages/AdminPage';
import TopsPage        from './pages/TopsPage';
import UserProfilePage from './pages/UserProfilePage';
import FeedPage        from './pages/FeedPage';
import AuthModal       from './components/auth/AuthModal';
import GlobalSearch    from './components/layout/GlobalSearch';
import NotificationPanel from './components/layout/NotificationPanel';
import ResetPasswordPage from './pages/ResetPasswordPage';

import { API_URL, getImageUrl } from './config';

/* ── Avatar helper ─────────────────────────────────────────────── */
export function Avatar({ user, size = 'md', className = '' }) {
  const sizes = { sm:'w-8 h-8 text-xs', md:'w-10 h-10 text-sm', lg:'w-14 h-14 text-lg', xl:'w-20 h-20 text-2xl' };
  const initials = user?.username ? user.username.slice(0,2).toUpperCase() : '?';
  const colors = ['bg-[var(--c-primary)]','bg-[#C97A3A]','bg-[#5B4FCF]','bg-[#C23B6E]','bg-[#2196A3]'];
  const ci = user?.username ? user.username.charCodeAt(0) % colors.length : 0;
  return (
    <div className={`${sizes[size]} ${className} rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0 ${!user?.avatar_url ? colors[ci] : ''}`}>
      {user?.avatar_url && <img src={getImageUrl(user.avatar_url)} alt={user.username} className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} />}
      <span style={{ display: user?.avatar_url ? 'none' : 'flex' }}>{initials}</span>
    </div>
  );
}

export const FullScreenLoader = () => (
  <div className="h-[70vh] flex flex-col justify-center items-center gap-4">
    <Loader2 className="w-9 h-9 animate-spin" style={{ color:'var(--c-primary)' }} />
    <p className="font-medium text-sm" style={{ color:'var(--c-text-3)' }}>Завантаження...</p>
  </div>
);

/* ── Bottom Nav Configuration ───────────────────────────────────── */
const BOTTOM_NAV = [
  { id:'home',      icon:Home,      label:'Головна',    path:'/' },
  { id:'discover',  icon:Compass,   label:'Каталог',    path:'/discover' },
  { id:'library',   icon:Library,   label:'Полиця',    path:'/library',   auth: true },
  { id:'clubs',     icon:Users,     label:'Клуби',     path:'/clubs',     auth: true },
  { id:'analytics', icon:BarChart2, label:'Статистика',path:'/analytics', auth: true },
];

function AdminRoute({ children, currentUser, initializing }) {
  if (initializing) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }
  return currentUser?.role === 'admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [searchOpen, setSearchOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setInitializing(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('token');
      }
    } catch (e) {
      console.error(e);
    }
    setInitializing(false);
  };
  
  useEffect(() => { fetchUserProfile(); }, []);

  useEffect(() => {
    const handleProfileRefresh = () => fetchUserProfile();
    window.addEventListener('app:refresh-profile', handleProfileRefresh);
    return () => window.removeEventListener('app:refresh-profile', handleProfileRefresh);
  }, []);

  useEffect(() => {
    const h = () => { setIsLoggedIn(false); setCurrentUser(null); setAuthMode('login'); setAuthOpen(true); };
    window.addEventListener('auth:expired', h);
    return () => window.removeEventListener('auth:expired', h);
  }, []);

  const handleLogout = () => { localStorage.removeItem('token'); setIsLoggedIn(false); setCurrentUser(null); navigate('/'); };

  const handleNavigate = (page, id = null) => {
    setSearchOpen(false);
    const map = {
      home: '/', discover: '/discover', library: '/library', clubs: '/clubs',
      analytics: '/analytics', profile: '/profile', settings: '/settings', admin: '/admin',
      feed: '/feed', tops: '/tops'
    };
    if (page === 'book' && id) return navigate(`/book/${id}`);
    if (page === 'reading' && id) return navigate(`/reading/${id}`);
    if (page === 'user' && id) return navigate(`/user/${id}`);
    navigate(map[page] || '/');
  };

  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };
  const isAdmin = currentUser?.role === 'admin';

  const sideNavItems = [
    { id: 'home', icon: Home, label: 'Головна', path: '/' },
    { id: 'discover', icon: Compass, label: 'Каталог', path: '/discover' },
    { id: 'library', icon: Library, label: 'Моя полиця', path: '/library', auth: true },
    { id: 'clubs', icon: Users, label: 'Спільноти', path: '/clubs', auth: true },
    { id: 'analytics', icon: BarChart2, label: 'Статистика', path: '/analytics', auth: true },
    ...(isAdmin ? [{ id: 'admin', icon: ShieldCheck, label: 'Адмін', path: '/admin' }] : []),
  ];

  const sharedProps = { handleNavigate, isLoggedIn, currentUser, openAuthModal: openAuth };
  
  return (
    <div className="min-h-screen" style={{ background: 'var(--c-bg)', color: 'var(--c-text)', fontFamily: 'var(--font-ui)' }}>
      <Toaster position="bottom-right" />

      {initializing ? (
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--c-primary)' }} />
        </div>
      ) : (
        <>
          {/* ── Header ───────────────────────────────────────────────── */}
          <header className="fixed top-0 inset-x-0 h-[60px] z-40 flex items-center px-4 md:pl-6 md:pr-6 gap-3"
            style={{ background: 'rgba(252,250,245,.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--c-border)' }}>
            <button onClick={() => handleNavigate('home')} className="font-display font-black text-xl tracking-tight" style={{ color: 'var(--c-primary)' }}>ReadLounge.</button>
            
            <div className="hidden md:flex flex-1 max-w-xl mx-auto"><GlobalSearch handleNavigate={handleNavigate} /></div>

            <div className="flex items-center gap-1.5 ml-auto">
              <NotificationPanel isLoggedIn={isLoggedIn} />
              {isLoggedIn ? (
                <button onClick={() => handleNavigate('profile')}
                  className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-transparent hover:ring-[var(--c-primary)] transition-all"
                  style={{ background: currentUser?.avatar_url ? 'transparent' : 'var(--c-primary)' }}>
                  {currentUser?.avatar_url 
                    ? <img src={getImageUrl(currentUser?.avatar_url)} className="w-full h-full object-cover" onError={e => e.target.style.display = 'none'} alt="" /> 
                    : currentUser?.username?.[0]?.toUpperCase()
                  }
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openAuth('login')} 
                    className="text-sm font-bold px-3.5 py-2 rounded-full transition-colors" 
                    style={{ color: 'var(--c-primary)' }}
                  >
                    Увійти
                  </button>
                  <button 
                    onClick={() => openAuth('register')} 
                    className="text-sm font-bold px-4 py-2 rounded-full text-white transition-opacity hover:opacity-90" 
                    style={{ background: 'var(--c-primary)' }}
                  >
                    Зареєструватись
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* ── Основний контент ────────────────────────────────────── */}
          <main className="pt-[60px] pb-[72px] md:pb-4 md:pl-[200px] min-h-screen">
            <Routes>
              <Route path="/" element={<HomePage {...sharedProps} />} />
              <Route path="/discover" element={<DiscoverPage {...sharedProps} />} />
              <Route path="/library" element={<LibraryPage {...sharedProps} />} />
              <Route path="/clubs" element={<ClubsPage {...sharedProps} />} />
              <Route path="/analytics" element={<AnalyticsPage isLoggedIn={isLoggedIn} openAuthModal={openAuth} />} />
              <Route path="/profile" element={<ProfilePage handleNavigate={handleNavigate} handleLogout={handleLogout} currentUser={currentUser} isLoggedIn={isLoggedIn} openAuthModal={openAuth} />} />
              <Route path="/settings" element={<SettingsPage fetchUserProfile={fetchUserProfile} handleNavigate={handleNavigate} />} />
              <Route path="/book/:id" element={<BookPage {...sharedProps} />} />
              
              <Route path="/feed" element={<FeedPage isLoggedIn={isLoggedIn} currentUser={currentUser} handleNavigate={handleNavigate} openAuthModal={openAuth} />} />
              <Route path="/tops" element={<TopsPage handleNavigate={handleNavigate} />} />
              <Route path="/user/:id" element={<UserProfilePage isLoggedIn={isLoggedIn} currentUser={currentUser} handleNavigate={handleNavigate} />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              <Route path="/admin" element={<AdminRoute currentUser={currentUser} initializing={initializing}><AdminPage /></AdminRoute>} />
              
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
                  <span className="font-display text-7xl font-bold" style={{ color:'var(--c-border)' }}>404</span>
                  <p style={{ color:'var(--c-text-3)' }}>Сторінку не знайдено</p>
                  <button onClick={() => navigate('/')} className="mt-2 px-6 py-2.5 rounded-full text-sm font-bold text-white" style={{ background:'var(--c-primary)' }}>На головну</button>
                </div>
              } />
            </Routes>
          </main>

          {/* ── Sidebar (Десктоп меню з замочками) ──────────────────── */}
          <aside className="hidden md:flex fixed inset-y-0 left-0 w-[200px] flex-col pt-[60px] z-30" style={{ background: 'var(--c-surface)', borderRight: '1px solid var(--c-border)' }}>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {sideNavItems.map(item => {
                const isLocked = item.auth && !isLoggedIn;
                const isActive = location.pathname === item.path;

                if (isLocked) {
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => openAuth('login')} 
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-[#A19D94] hover:bg-stone-50/40 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4 opacity-60" /> 
                        <span>{item.label}</span>
                      </div>
                      <Lock className="w-3.5 h-3.5 opacity-40" />
                    </button>
                  );
                }

                return (
                  <button 
                    key={item.id} 
                    onClick={() => navigate(item.path)} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? 'text-white' : 'text-[var(--c-text-2)] hover:bg-stone-100/60'
                    }`}
                    style={isActive ? { background: 'var(--c-primary)' } : {}}
                  >
                    <item.icon className="w-4 h-4" /> {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Mobile Bottom Nav (Нижнє мобільне меню з замочками) ─── */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 h-[65px] z-40 flex items-center justify-around px-2"
            style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {BOTTOM_NAV.map(item => {
              const isLocked = item.auth && !isLoggedIn;
              const isActive = location.pathname === item.path;
              
              return (
                <button 
                  key={item.id} 
                  onClick={() => isLocked ? openAuth('login') : navigate(item.path)}
                  className="flex flex-col items-center justify-center w-16 h-full gap-1 transition-all"
                  style={{ color: isActive ? 'var(--c-primary)' : isLocked ? '#A19D94' : 'var(--c-text-3)' }}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5" style={{ strokeWidth: isActive ? 2.5 : 2 }} />
                    {isLocked && (
                      <Lock 
                        className="w-3 h-3 absolute -bottom-1 -right-1 rounded-full p-[1px]" 
                        style={{ background: 'var(--c-surface)', color: '#A19D94' }} 
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)}
            setIsLoggedIn={v => { setIsLoggedIn(v); if (v) fetchUserProfile(); }}
            initialMode={authMode === 'login'} />
        </>
      )}
    </div>
  );
}