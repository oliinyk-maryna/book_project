import React from 'react';
import { Home, Search, BookOpen, Users, Trophy, User, BarChart2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import NotificationPanel from './NotificationPanel';

export default function MainLayout({ children, user, onOpenAuth }) {
  const navigate = useNavigate();
  const location = useLocation();

  const NAV_ITEMS = [
    { label: 'Головна', icon: Home, path: '/' },
    { label: 'Каталог', icon: Search, path: '/discover' },
    { label: 'Полиця', icon: BookOpen, path: '/library', auth: true },
    { label: 'Аналітика', icon: BarChart2, path: '/analytics', auth: true },
    { label: 'Спільноти', icon: Users, path: '/clubs' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col md:flex-row font-sans text-stone-900">
      
      <aside className="hidden md:flex flex-col w-60 fixed inset-y-0 left-0 bg-white border-r border-stone-200 z-40">
        <div className="p-8">
          <Link to="/" className="font-serif font-black text-3xl text-stone-900 tracking-tight">Libro.</Link>
        </div>
        <nav className="flex-1 px-4 space-y-1.5">
          {NAV_ITEMS.map(item => (!item.auth || (user && user.id)) && (
            <Link key={item.path} to={item.path} className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all ${location.pathname === item.path ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'}`}>
              <item.icon className="w-5 h-5" /> {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen relative">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-stone-200 h-20 flex items-center justify-between px-6 md:px-10">
          <div className="md:hidden font-serif font-black text-2xl text-stone-900">Libro.</div>
          
          <div className="flex-1 flex justify-center max-w-md mx-auto">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-4 shrink-0 ml-4">
            <NotificationPanel isLoggedIn={!!user} />
            
            {/* ВИПРАВЛЕНО: Замість іконки 'V' тепер нормальні кнопки */}
            {user ? (
              <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center overflow-hidden shadow-sm hover:scale-105 transition-transform border border-stone-200">
                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => onOpenAuth('login')} className="text-sm font-bold text-stone-600 hover:text-stone-900 transition-colors hidden sm:block px-3 py-2">
                  Увійти
                </button>
                <button onClick={() => onOpenAuth('register')} className="text-sm font-bold bg-[#1A361D] text-white px-5 py-2.5 rounded-xl hover:bg-[#2C5234] transition-colors shadow-sm">
                  Реєстрація
                </button>
              </div>
            )}

          </div>
        </header>

        <main className="flex-1 pb-24 md:pb-12">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 pb-safe">
        <div className="flex items-center justify-around h-16 px-2 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map(item => (!item.auth || user) && (
            <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-full px-1 ${location.pathname === item.path ? 'text-stone-900' : 'text-stone-400'}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}