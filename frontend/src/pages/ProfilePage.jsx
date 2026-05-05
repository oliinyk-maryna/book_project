import React, { useState, useEffect } from 'react';
import { Settings, LogOut, BookOpen, Users, Star } from 'lucide-react';
import { userApi } from '../api/user.api';
import { StatCard, Loader } from '../components/ui';

export default function ProfilePage({ handleLogout, handleNavigate }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ read: 0, reading: 0, reviews: 0 });

  useEffect(() => {
    // Отримання даних профілю з API[cite: 65]
    userApi.getProfile().then(data => {
      setUser(data.profile);
      setStats(data.stats);
    });
  }, []);

  if (!user) return <Loader fullPage />;

  return (
    <div className="pb-24 max-w-4xl mx-auto animate-in fade-in duration-500">
      <header className="px-6 pt-12 pb-8 flex justify-between items-start border-b border-stone-100 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-stone-200 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl rotate-3 transition-transform hover:rotate-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover"/>
            ) : (
              <div className="w-full h-full bg-[#2C5234] flex items-center justify-center text-white text-2xl font-black">
                {user.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-stone-900">{user.username}</h1>
            <p className="text-stone-500 font-medium">{user.email}</p>
          </div>
        </div>
        <button 
          onClick={() => handleNavigate('settings')} 
          className="p-3 bg-stone-100 rounded-2xl text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-all"
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      {/* Сітка зі статистикою[cite: 65] */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <StatCard label="Прочитано" value={stats.read} variant="light" icon={BookOpen} />
        <StatCard label="В процесі" value={stats.reading} variant="light" icon={Users} />
        <StatCard label="Рецензії" value={stats.reviews} variant="light" icon={Star} />
      </div>
      
      <div className="px-6 flex flex-col gap-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-stone-400 mb-2">Аккаунт</h3>
        <button 
          onClick={handleLogout} 
          className="w-fit px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3 hover:bg-red-100 transition-all"
        >
          <LogOut className="w-4 h-4" /> Вийти з акаунту
        </button>
      </div>
    </div>
  );
}