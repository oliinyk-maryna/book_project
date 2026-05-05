import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Zap, Target, Flame, Calendar as CalendarIcon } from 'lucide-react';
import { userApi } from '../api/user.api';
import Loader from '../components/ui/Loader';
import StatCard from '../components/ui/StatCard';

export default function AnalyticsPage({ isLoggedIn }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    userApi.getStats()
      .then(data => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-20 h-20 bg-stone-100 rounded-[2rem] flex items-center justify-center mb-6">
          <Target className="w-10 h-10 text-stone-300" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-stone-900 mb-4">Аналітика недоступна</h2>
        <p className="text-stone-500 font-medium">Увійдіть в систему, щоб відстежувати свій прогрес читання.</p>
      </div>
    );
  }

  if (loading) return <Loader fullPage />;

  const booksRead = stats?.books_read || 0;
  const hours = Math.round((stats?.total_duration_seconds || 0) / 3600);
  const streak = stats?.current_streak || 0;
  const goal = stats?.target_books || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((booksRead / goal) * 100)) : 0;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-black text-stone-900 mb-4">Ваша історія</h1>
        <p className="text-stone-500 font-medium text-lg flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" /> Статистика за весь час
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard icon={BookOpen} label="Прочитано" value={booksRead} sub="книг" />
        <StatCard icon={Clock} label="Інвестовано" value={hours} sub="годин" variant="light" />
        <StatCard icon={Zap} label="Ударний темп" value={streak} sub="днів поспіль" />
        <StatCard icon={Flame} label="Рецензій" value={stats?.reviews_count || 0} sub="написано" variant="light" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Віджет Ціль */}
        <section className="lg:col-span-2 bg-white rounded-[2.5rem] border border-stone-100 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-3">
              <Target className="w-6 h-6 text-[#D97757]" /> Ціль {year}
            </h3>
            {goal > 0 && <span className="text-3xl font-serif font-black text-[#1A361D]">{pct}%</span>}
          </div>

          {goal > 0 ? (
            <div>
              <div className="w-full bg-stone-100 rounded-full h-4 overflow-hidden mb-4 shadow-inner">
                <div className="h-full bg-gradient-to-r from-[#1A361D] to-[#3a753e] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-stone-500 font-medium">
                Прочитано <span className="font-bold text-stone-900">{booksRead}</span> з {goal} книг.
                {booksRead < goal ? ` Ще ${goal - booksRead} до цілі!` : ' Ціль досягнуто! 🎉'}
              </p>
            </div>
          ) : (
            <div className="text-center py-6 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
              <p className="text-stone-500 font-medium mb-3">Ви ще не встановили ціль на цей рік.</p>
              <button className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors">
                Встановити ціль
              </button>
            </div>
          )}
        </section>

        {/* Швидкість читання */}
        <section className="bg-[#1A361D] rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="absolute -right-10 -top-10 opacity-5">
            <Zap className="w-64 h-64" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 mb-2">Швидкість</p>
            <p className="text-6xl font-serif font-black mb-2">{Math.round(stats?.avg_pages_per_hour || 0)}</p>
            <p className="text-emerald-100/80 font-medium">сторінок на годину</p>
          </div>
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
            <p className="text-sm font-medium text-emerald-100/80">Улюблений жанр</p>
            <p className="font-bold text-lg">{stats?.favorite_genre || 'Не визначено'}</p>
          </div>
        </section>
      </div>
    </main>
  );
}