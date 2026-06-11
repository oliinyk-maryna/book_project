import React, { useState, useEffect, useCallback } from 'react';
import { Target, BookOpen, Bookmark, Loader2, Check, BarChart3, PieChart, CalendarDays, Hash } from 'lucide-react';
import { API_URL } from '../config';

/* ── КОМПОНЕНТ КАРТКИ СТАТИСТИКИ ────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, dark }) {
  return (
    <div className="p-5 md:p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-1" 
         style={dark ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)' } : { background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
      <div className="p-3 rounded-2xl w-fit" style={dark ? { background: 'rgba(255,255,255,0.1)' } : { background: 'var(--c-bg)' }}>
        <Icon className="w-5 h-5" style={{ color: dark ? 'white' : 'var(--c-primary)' }} />
      </div>
      <div className="mt-5 md:mt-6">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 sm:mb-1.5" style={{ color: dark ? 'rgba(255,255,255,0.7)' : 'var(--c-text-3)' }}>{label}</p>
        <p className="text-3xl sm:text-4xl font-bold font-serif leading-none" style={{ color: dark ? 'white' : 'var(--c-text)' }}>{value}</p>
        {sub && <p className="text-[10px] sm:text-xs mt-2 font-medium" style={{ color: dark ? 'rgba(255,255,255,0.7)' : 'var(--c-text-2)' }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── ГРАФІК ЗА МІСЯЦЯМИ (ТІЛЬКИ ПОТОЧНИЙ РІК) ───────────────────── */
function MonthsChart({ books, currentYear }) {
  const months = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
  const data = new Array(12).fill(0);
  
  books.forEach(b => {
    // Перевіряємо обидва варіанти назви поля, які може повернути бекенд
    const dateStr = b.end_date || b.finished_at;
    if (b.status === 'read' && dateStr) {
      const dateObj = new Date(dateStr);
      // Додаємо в графік тільки якщо рік збігається з поточним
      if (dateObj.getFullYear() === currentYear) {
        const monthIndex = dateObj.getMonth();
        data[monthIndex] += 1;
      }
    }
  });
  
  const max = Math.max(...data, 1);
  
  return (
    <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-40 pt-4">
      {data.map((count, i) => {
        const pct = (count / max) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-2 flex-1 group h-full">
            <span className="text-[10px] font-bold transition-opacity opacity-0 group-hover:opacity-100" style={{ color: 'var(--c-primary)' }}>{count > 0 ? count : ''}</span>
            <div className="w-full max-w-[2.5rem] rounded-t-xl relative flex items-end flex-1 overflow-hidden" style={{ background: 'var(--c-bg)' }}>
              <div className="w-full rounded-t-xl transition-all duration-1000 ease-out group-hover:brightness-110" style={{ height: `${pct || 2}%`, background: count > 0 ? 'var(--c-accent)' : 'var(--c-border-2)' }} />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase" style={{ color: 'var(--c-text-3)' }}>{months[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function GenreStats({ books }) {
  const genreCount = {};
  let totalAppearances = 0; // Загальна кількість "входжень" жанрів

  books.forEach(b => {
    if (b.status === 'read') {
      // Використовуємо масив categories, який прийшов з бекенда
      const genres = b.categories || [b.category || 'Інше'];
      
      genres.forEach(g => {
        genreCount[g] = (genreCount[g] || 0) + 1;
        totalAppearances += 1;
      });
    }
  });

  const sortedGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-4 pt-2">
      {sortedGenres.map(([genre, count], i) => {
        // Рахуємо відсоток від загальної суми всіх жанрових тегів
        const pct = totalAppearances > 0 ? Math.round((count / totalAppearances) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex justify-between text-xs font-bold mb-1.5" style={{ color: 'var(--c-text-2)' }}>
              <span className="uppercase tracking-wider">{genre}</span>
              <span>{pct}%</span> {/* Виводимо лише відсотки, як ви хотіли */}
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--c-bg)' }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: 'var(--c-primary)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── ГОЛОВНИЙ КОМПОНЕНТ ─────────────────────────────────────────── */
export default function AnalyticsPage({ isLoggedIn }) {
  const [stats, setStats] = useState(null);
  const [myBooks, setMyBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState('');
  
  const year = new Date().getFullYear();

  const loadData = useCallback(async () => {
    if (!isLoggedIn) { setIsLoading(false); return; }
    
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    
    try {
      const [sRes, bRes] = await Promise.all([
        fetch(`${API_URL}/me/stats`, { headers: h }),
        fetch(`${API_URL}/me/books`, { headers: h }),
      ]);
      
      if (sRes.ok) { 
        const s = await sRes.json(); 
        setStats(s); 
        setTempGoal(s.goal_books || s.target_books || ''); 
      }
      
      if (bRes.ok) {
        const bData = await bRes.json();
        // Використовуємо єдине джерело даних
        const books = Array.isArray(bData) ? bData : (bData.data || bData.books || []);
        console.log("Дані завантажено:", books);
        setMyBooks(books);
      }
    } catch (err) {
      console.error("Помилка завантаження даних", err);
    } finally { 
      setIsLoading(false); 
    }
  }, [isLoggedIn]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveGoal = async () => {
    const target = parseInt(tempGoal);
    if (isNaN(target) || target <= 0) { setEditingGoal(false); return; }
    
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/me/goals`, { 
      method: 'POST', 
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ year, target_books: target }) 
    });
    
    setEditingGoal(false);
    loadData();
  };

  if (!isLoggedIn || isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--c-primary)' }} /></div>;

  // ОБЧИСЛЕННЯ З НАДІЙНОЮ ПЕРЕВІРКОЮ ПОЛІВ
  const booksRead  = myBooks.filter(b => b.status === 'read').length;
  const totalPages = myBooks.filter(b => b.status === 'read').reduce((acc, b) => acc + (b.total_pages || b.page_count || 0), 0);
  
  // Рахуємо книги конкретно за поточний рік
  const booksYear = myBooks.filter(b => {
    const dateStr = b.end_date || b.finished_at;
    return b.status === 'read' && dateStr && new Date(dateStr).getFullYear() === year;
  }).length;

  const gBooks = stats?.goal_books ?? stats?.target_books ?? 0;
  const pct    = gBooks > 0 ? Math.min(100, Math.round((booksYear / gBooks) * 100)) : 0;

  return (
    <main className="max-w-5xl mx-auto px-4 mt-6 md:mt-8 pb-28 page-enter">
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'var(--c-border)' }}>
        <h1 className="text-4xl font-serif font-black" style={{ color: 'var(--c-text)' }}>Статистика</h1>
      </div>

      {/* Єдина ціль */}
      <div className="rounded-3xl border shadow-sm p-8 mb-6 transition-all" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif font-bold text-2xl flex items-center gap-2.5" style={{ color: 'var(--c-text)' }}>
            <Target className="w-6 h-6" style={{ color: 'var(--c-accent)' }} /> Читацький виклик {year}
          </h3>
          <button onClick={() => setEditingGoal(!editingGoal)} className="text-xs font-bold uppercase tracking-wider hover:underline" style={{ color: 'var(--c-text-3)' }}>
            {editingGoal ? 'Скасувати' : 'Змінити ціль'}
          </button>
        </div>

        {editingGoal ? (
          <div className="flex items-center gap-3">
             <input type="number" value={tempGoal} onChange={e => setTempGoal(e.target.value)} placeholder="Скільки книг плануєте прочитати?" className="w-full rounded-xl px-4 py-3 border outline-none font-bold" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }} />
             <button onClick={saveGoal} className="px-6 py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90" style={{ background: 'var(--c-primary)' }}>Зберегти</button>
          </div>
        ) : (
          <div>
            <div className="w-full rounded-full h-5 overflow-hidden border shadow-inner mb-2" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border-2)' }}>
              <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${pct}%`, background: 'var(--c-accent)' }}>
                 <div className="absolute inset-0 bg-white/20 w-full" style={{ animation: 'shimmer 2s infinite' }} />
              </div>
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--c-text-2)' }}>
              {booksYear} з {gBooks || 0} книг <span className="opacity-60">({pct}%)</span>
            </p>
          </div>
        )}
      </div>

      {/* Картки статистики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={BookOpen} label="Прочитано" value={booksRead} sub="книг всього" />
        <StatCard icon={Bookmark} label="Обсяг" value={totalPages} sub="прочитано сторінок" />
        <StatCard dark icon={CalendarDays} label="Цього року" value={booksYear} sub="прочитаних книг" />
      </div>

      {/* Графіки */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border p-8" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <h3 className="font-serif font-bold text-xl mb-4" style={{ color: 'var(--c-text)' }}>
            <BarChart3 className="inline w-5 h-5 mr-2" style={{ color: 'var(--c-primary)' }}/> За місяцями
          </h3>
          <MonthsChart books={myBooks} currentYear={year} />
        </div>
        
        <div className="rounded-3xl border p-8" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <h3 className="font-serif font-bold text-xl mb-4" style={{ color: 'var(--c-text)' }}>
            <PieChart className="inline w-5 h-5 mr-2" style={{ color: 'var(--c-primary)' }}/> Жанри
          </h3>
          <GenreStats books={myBooks} />
        </div>
      </div>
    </main>
  );
}