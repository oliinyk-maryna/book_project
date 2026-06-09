import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Home, Compass, Library, Users, BarChart2, ShieldCheck, Loader2, X, Search, User } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

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
import { API_URL }     from './config';

/* ── Avatar helper ─────────────────────────────────────────────── */
export function Avatar({ user, size = 'md', className = '' }) {
  const sizes = { sm:'w-8 h-8 text-xs', md:'w-10 h-10 text-sm', lg:'w-14 h-14 text-lg', xl:'w-20 h-20 text-2xl' };
  const initials = user?.username ? user.username.slice(0,2).toUpperCase() : '?';
  const colors = ['bg-[var(--c-primary)]','bg-[#C97A3A]','bg-[#5B4FCF]','bg-[#C23B6E]','bg-[#2196A3]'];
  const ci = user?.username ? user.username.charCodeAt(0) % colors.length : 0;
  return (
    <div className={`${sizes[size]} ${className} rounded-full overflow-hidden flex items-center justify-center font-bold text-white shrink-0 ${!user?.avatar_url ? colors[ci] : ''}`}>
      {user?.avatar_url && <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} />}
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

/* ── Bottom Nav ─────────────────────────────────────────────────── */
const BOTTOM_NAV = [
  { id:'home',      icon:Home,      label:'Головна',   path:'/'          },
  { id:'discover',  icon:Compass,   label:'Каталог',   path:'/discover'  },
  { id:'library',   icon:Library,   label:'Полиця',    path:'/library'   },
  { id:'clubs',     icon:Users,     label:'Клуби',     path:'/clubs'     },
  { id:'analytics', icon:BarChart2, label:'Статистика',path:'/analytics' },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authOpen, setAuthOpen]       = useState(false);
  const [authMode, setAuthMode]       = useState('login');
  const [searchOpen, setSearchOpen]   = useState(false);
  const [initializing, setInitializing] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) { setInitializing(false); return; }
    try {
      const res = await fetch(`${API_URL}/profile`, { headers: { Authorization:`Bearer ${token}` } });
      if (res.ok) { setCurrentUser(await res.json()); setIsLoggedIn(true); }
      else { localStorage.removeItem('token'); setIsLoggedIn(false); setCurrentUser(null); }
    } catch {}
    setInitializing(false);
  };

  useEffect(() => { fetchUserProfile(); }, []);

  useEffect(() => {
    const h = () => { setIsLoggedIn(false); setCurrentUser(null); setAuthMode('login'); setAuthOpen(true); };
    window.addEventListener('auth:expired', h);
    return () => window.removeEventListener('auth:expired', h);
  }, []);

  const handleLogout = () => { localStorage.removeItem('token'); setIsLoggedIn(false); setCurrentUser(null); navigate('/'); };

  const handleNavigate = (page, id = null) => {
    setSearchOpen(false);
    const map = { home:'/', discover:'/discover', library:'/library', clubs:'/clubs',
      analytics:'/analytics', profile:'/profile', settings:'/settings', admin:'/admin',
      feed:'/feed', tops:'/tops' };
    if (page==='book'    && id) return navigate(`/book/${id}`);
    if (page==='reading' && id) return navigate(`/reading/${id}`);
    if (page==='user'    && id) return navigate(`/user/${id}`);
    navigate(map[page] || '/');
  };

  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };
  const isAdmin  = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  const sideNavItems = [
    { id:'home',      icon:Home,        label:'Головна',    path:'/' },
    { id:'discover',  icon:Compass,     label:'Каталог',    path:'/discover' },
    { id:'library',   icon:Library,     label:'Моя полиця', path:'/library' },
    { id:'clubs',     icon:Users,       label:'Спільноти',  path:'/clubs' },
    { id:'analytics', icon:BarChart2,   label:'Статистика', path:'/analytics' },
    ...(isAdmin ? [{ id:'admin', icon:ShieldCheck, label:'Адмін', path:'/admin' }] : []),
  ];

  const sharedProps = { handleNavigate, isLoggedIn, currentUser, openAuthModal:openAuth };

  return (
    <div className="min-h-screen" style={{ background:'var(--c-bg)', color:'var(--c-text)', fontFamily:'var(--font-ui)' }}>
      
      {/* ── ОНОВЛЕНІ ПРОФЕСІЙНІ TOASTS ── */}
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          duration: 4000,
          style: { 
            fontFamily: 'var(--font-ui)', 
            fontWeight: 600, 
            borderRadius: '12px',
            background: '#ffffff', 
            color: '#0f172a', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
            padding: '12px 16px',
          },
          success: { 
            style: { borderLeft: '4px solid #10b981' }, 
            iconTheme: { primary: '#10b981', secondary: '#fff' } 
          },
          error: { 
            style: { borderLeft: '4px solid #f43f5e' }, 
            iconTheme: { primary: '#f43f5e', secondary: '#fff' } 
          },
        }} 
      />

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 h-[60px] z-40 flex items-center px-4 md:pl-6 md:pr-6 gap-3"
        style={{ background:'rgba(252,250,245,.94)', backdropFilter:'blur(16px)', borderBottom:'1px solid var(--c-border)' }}>

        <button onClick={() => handleNavigate('home')}
          className="shrink-0 flex items-center gap-1.5"
          style={{ minWidth: 160 }}>
          <span className="font-display font-black text-xl tracking-tight" style={{ color:'var(--c-primary)' }}>
            ReadLounge.
          </span>
        </button>

        <div className="hidden md:flex flex-1 max-w-xl mx-auto">
          <GlobalSearch handleNavigate={handleNavigate} />
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-xl transition-colors hover:bg-[var(--c-surface-2)]"
            style={{ color:'var(--c-text-2)' }}>
            <Search className="w-5 h-5" />
          </button>

          {!initializing && <NotificationPanel isLoggedIn={isLoggedIn} />}

          {!initializing && (
            isLoggedIn ? (
              <button onClick={() => handleNavigate('profile')}
                className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-transparent hover:ring-[var(--c-primary)] transition-all"
                style={{ background: currentUser?.avatar_url ? 'transparent' : 'var(--c-primary)' }}>
                {currentUser?.avatar_url
                  ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} alt="" />
                  : currentUser?.username?.[0]?.toUpperCase()}
              </button>
            ) : (
              <>
                {/* Мобільна кнопка — тільки «Увійти» (компактна) */}
                <button onClick={() => openAuth('login')}
                  className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-white"
                  style={{ background:'var(--c-primary)' }}>
                  <User className="w-3.5 h-3.5" /> Увійти
                </button>
                {/* Desktop — обидві кнопки */}
                <div className="hidden sm:flex items-center gap-2">
                  <button onClick={() => openAuth('login')}
                    className="text-sm font-semibold px-4 py-2 rounded-full transition-colors hover:bg-[var(--c-surface-2)]"
                    style={{ color:'var(--c-text-2)' }}>Увійти</button>
                  <button onClick={() => openAuth('register')}
                    className="text-sm font-bold px-4 py-2 rounded-full text-white transition-all hover:opacity-90"
                    style={{ background:'var(--c-primary)' }}>Реєстрація</button>
                </div>
              </>
            )
          )}
        </div>
      </header>

      {/* ── Mobile search overlay ─────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col animate-in fade-in duration-150"
          style={{ background:'var(--c-bg)' }}>
          <div className="flex items-center px-4 h-[60px] gap-3" style={{ borderBottom:'1px solid var(--c-border)' }}>
            <button onClick={() => setSearchOpen(false)} className="p-2 rounded-xl" style={{ background:'var(--c-surface-2)' }}>
              <X className="w-4 h-4" />
            </button>
            <GlobalSearch isMobile handleNavigate={handleNavigate} onCloseMobile={() => setSearchOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[200px] flex-col pt-[60px] z-30"
        style={{ background:'var(--c-surface)', borderRight:'1px solid var(--c-border)' }}>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {sideNavItems.map(item => {
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button key={item.id} onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={active
                  ? { background:'var(--c-primary-muted)', color:'var(--c-primary)' }
                  : { color:'var(--c-text-2)' }}>
                <item.icon style={{ width:17, height:17, color: active ? 'var(--c-primary)' : 'var(--c-text-3)' }} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="pt-[60px] pb-[72px] md:pb-4 md:pl-[200px] min-h-screen">
        <Routes>
          <Route path="/"           element={<HomePage     {...sharedProps} />} />
          <Route path="/discover"   element={<DiscoverPage {...sharedProps} />} />
          <Route path="/library"    element={<LibraryPage  {...sharedProps} />} />
          <Route path="/clubs"      element={<ClubsPage    {...sharedProps} />} />
          <Route path="/analytics"  element={<AnalyticsPage isLoggedIn={isLoggedIn} />} />
          <Route path="/profile"    element={<ProfilePage handleNavigate={handleNavigate} handleLogout={handleLogout} currentUser={currentUser} isLoggedIn={isLoggedIn} openAuthModal={openAuth} />} />
          <Route path="/settings"   element={<SettingsPage fetchUserProfile={fetchUserProfile} handleNavigate={handleNavigate} />} />
          <Route path="/book/:id"   element={<BookPage     {...sharedProps} />} />
          <Route path="/feed"       element={<FeedPage isLoggedIn={isLoggedIn} currentUser={currentUser} handleNavigate={handleNavigate} openAuthModal={openAuth} />} />
          <Route path="/tops"       element={<TopsPage handleNavigate={handleNavigate} />} />
          <Route path="/user/:id"   element={<UserProfilePage isLoggedIn={isLoggedIn} currentUser={currentUser} handleNavigate={handleNavigate} />} />
          <Route path="/admin"      element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
              <span className="font-display text-7xl font-bold" style={{ color:'var(--c-border)' }}>404</span>
              <p style={{ color:'var(--c-text-3)' }}>Сторінку не знайдено</p>
              <button onClick={() => navigate('/')} className="mt-2 px-6 py-2.5 rounded-full text-sm font-bold text-white" style={{ background:'var(--c-primary)' }}>На головну</button>
            </div>
          } />
        </Routes>
      </div>

      {/* ── Mobile bottom nav ───────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden z-30 safe-bottom"
        style={{ background:'rgba(255,253,249,.97)', backdropFilter:'blur(20px)', borderTop:'1px solid var(--c-border)' }}>
        <div className="flex h-[56px]">
          {BOTTOM_NAV.map(item => {
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button key={item.id} onClick={() => handleNavigate(item.id)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all">
                <div className="w-10 h-[30px] flex items-center justify-center rounded-xl transition-all duration-300"
                  style={active ? { background:'var(--c-primary-muted)' } : {}}>
                  <item.icon className="w-[18px] h-[18px] transition-colors duration-200"
                    style={{ color: active ? 'var(--c-primary)' : 'var(--c-text-3)' }} />
                </div>
                <span className="text-[9px] font-semibold"
                  style={{ color: active ? 'var(--c-primary)' : 'var(--c-text-3)' }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)}
        setIsLoggedIn={v => { setIsLoggedIn(v); if (v) fetchUserProfile(); }}
        initialMode={authMode === 'login'} />
    </div>
  );
}