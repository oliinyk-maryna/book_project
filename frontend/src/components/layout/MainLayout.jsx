import React, { useState, useEffect } from 'react';
import { Home, Search, BookOpen, Users, Trophy, User, ShieldCheck, Plus, Bell } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function MainLayout({ children, user, onOpenAuth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isServerDown, setIsServerDown] = useState(false);

  useEffect(() => {
    const handleAuthError = () => onOpenAuth('login');
    const handleServerError = () => setIsServerDown(true);
    
    window.addEventListener('auth:expired', handleAuthError);
    window.addEventListener('server:down', handleServerError);
    return () => {
      window.removeEventListener('auth:expired', handleAuthError);
      window.removeEventListener('server:down', handleServerError);
    };
  }, [onOpenAuth]);

  if (isServerDown) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF9] px-4 text-center">
        <div className="w-24 h-24 bg-stone-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <BookOpen className="w-10 h-10 text-stone-400" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-stone-900 mb-2">Технічні роботи</h1>
        <p className="text-stone-500 max-w-md">Ми оновлюємо бібліотеку. Повертайтеся за кілька хвилин!</p>
        <button onClick={() => window.location.reload()} className="mt-8 bg-[#1A361D] text-white px-6 py-3 rounded-xl font-bold">Оновити сторінку</button>
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: 'home', icon: Home, label: 'Головна', path: '/' },
    { id: 'discover', icon: Search, label: 'Каталог', path: '/discover' },
    { id: 'library', icon: BookOpen, label: 'Полиця', path: '/library', auth: true },
    { id: 'clubs', icon: Users, label: 'Клуби', path: '/clubs' },
    { id: 'tops', icon: Trophy, label: 'Топ 2026', path: '/tops' },
    { id: 'profile', icon: User, label: 'Профіль', path: '/profile', auth: true },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col md:flex-row">
      
      {/* ── БОКОВЕ МЕНЮ (ДЕСКТОП) ── */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-white border-r border-stone-200 z-40">
        <div className="p-6">
          <Link to="/" className="font-serif font-black text-2xl text-[#1A361D] tracking-tight">Libro.</Link>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {NAV_ITEMS.map(item => {
            if (item.auth && !user) return null;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.id} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all ${isActive ? 'bg-[#1A361D] text-white shadow-md shadow-green-900/10' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'}`}>
                <item.icon className="w-5 h-5" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-stone-100">
          <button className="w-full flex items-center justify-center gap-2 bg-[#D97757] text-white py-3 rounded-2xl font-bold hover:bg-[#c26647] transition-colors shadow-sm">
            <Plus className="w-5 h-5" /> Створити / Додати
          </button>
        </div>
      </aside>

      {/* ── ОСНОВНИЙ КОНТЕНТ ── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        
        {/* Хедер (Топбар) */}
        <header className="sticky top-0 z-30 bg-[#FAFAF9]/80 backdrop-blur-xl border-b border-stone-200 h-16 flex items-center justify-between px-4 md:px-8">
          <div className="md:hidden font-serif font-black text-xl text-[#1A361D]">Libro.</div>
          
          <div className="hidden md:flex flex-1 max-w-xl mx-8 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-[#1A361D]" />
            <input type="text" placeholder="Пошук книг, авторів, користувачів..." className="w-full bg-white border border-stone-200 rounded-full py-2 pl-11 pr-4 text-sm focus:outline-none focus:border-[#1A361D] focus:ring-1 focus:ring-[#1A361D] shadow-sm transition-all" />
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-stone-400 hover:text-stone-900 transition-colors rounded-full hover:bg-white">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#FAFAF9]"></span>
            </button>
            
            {user ? (
              <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-[#1A361D] flex items-center justify-center text-white font-bold text-sm overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform">
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover"/> : user.username[0].toUpperCase()}
              </button>
            ) : (
              <button onClick={() => onOpenAuth('login')} className="bg-[#1A361D] text-white px-4 py-2 rounded-full text-sm font-bold">Увійти</button>
            )}
          </div>
        </header>

        {/* Сторінки */}
        <main className="flex-1 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── НИЖНЯ ПАНЕЛЬ (МОБІЛЬНА) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(item => {
            if (item.auth && !user) return null;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.id} to={item.path} className={`flex flex-col items-center justify-center gap-1 w-full h-full ${isActive ? 'text-[#1A361D]' : 'text-stone-400'}`}>
                <item.icon className={`w-5 h-5 ${isActive ? 'fill-[#1A361D]/10' : ''}`} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}