import React from 'react';
import { Home, Search, BookOpen, Users, BarChart2, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Navbar({ onNavigate, isLoggedIn }) {
  const location = useLocation();
  const current  = location.pathname.replace('/', '') || 'home';

  const items = [
    { id: 'home',      icon: Home,     label: 'Головна' },
    { id: 'discover',  icon: Search,   label: 'Пошук'   },
    { id: 'library',   icon: BookOpen, label: 'Полиця', auth: true },
    { id: 'clubs',     icon: Users,    label: 'Клуби'   },
    { id: 'analytics', icon: BarChart2,label: 'Стат.',  auth: true },
    { id: 'profile',   icon: User,     label: 'Профіль', auth: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 z-40 safe-area-pb">
      <div className="flex items-center justify-around h-[60px] max-w-2xl mx-auto px-2">
        {items.map(item => {
          if (item.auth && !isLoggedIn) return null;
          const isActive = current === item.id || (item.id === 'home' && current === '');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-xl transition-all ${
                isActive ? 'text-[#2C5234]' : 'text-stone-400'
              }`}
            >
              <item.icon className={`w-[22px] h-[22px] transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[9px] font-bold uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {item.label}
              </span>
              {isActive && <div className="absolute top-0 w-8 h-0.5 bg-[#2C5234] rounded-full" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

