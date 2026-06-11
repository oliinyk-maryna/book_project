import React, { useState, useEffect } from 'react';
import { Trophy, BookOpen, Calendar, Loader2, Target, Flame } from 'lucide-react';
import { API_URL } from '../config';

export default function AnalyticsPage() {
  const [myBooks, setMyBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Ціль на рік (можна згодом зробити так, щоб користувач сам вводив цю цифру)
  const [yearlyGoal, setYearlyGoal] = useState(50); 

  useEffect(() => {
    const fetchMyBooks = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Завантажуємо всі збережені книги користувача
        const res = await fetch(`${API_URL}/me/books`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json' 
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          // Залежно від формату вашого бекенду, це може бути data.books або просто data
          setMyBooks(Array.isArray(data) ? data : (data.books || []));
        }
      } catch (error) {
        console.error("Помилка завантаження аналітики:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyBooks();
  }, []);

  /* ── ЛОГІКА: ПІДРАХУНОК НА ФРОНТЕНДІ ─────────────────────────── */
  const currentYear = new Date().getFullYear();

  // 1. Фільтруємо всі книги, які були прочитані саме цього року
  const readThisYearBooks = myBooks.filter(book => {
    // Якщо статус не "Прочитано" або немає дати завершення - пропускаємо
    if (book.status !== 'read' || !book.end_date) return false;
    
    // Витягуємо рік з дати завершення
    const finishYear = new Date(book.end_date).getFullYear();
    
    return finishYear === currentYear;
  });

  // 2. Рахуємо кількість і відсоток виконання цілі
  const readCount = readThisYearBooks.length;
  const progressPct = Math.min(Math.round((readCount / yearlyGoal) * 100), 100);

  // 3. Загальна статистика для карток
  const totalReadCount = myBooks.filter(b => b.status === 'read').length;
  const currentlyReadingCount = myBooks.filter(b => b.status === 'reading').length;

  /* ── РЕНДЕР ──────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-9 h-9 animate-spin" style={{ color: 'var(--c-primary)' }} />
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 mt-6 md:mt-8 pb-28 md:pb-12 page-enter">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight" style={{ color: 'var(--c-text)' }}>
          Моя статистика
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--c-text-3)' }}>
          Аналітика вашого читання за {currentYear} рік
        </p>
      </div>

      {/* Головний блок: Річна ціль */}
      <div className="p-6 md:p-8 rounded-3xl mb-8 shadow-sm relative overflow-hidden" 
           style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        
        {/* Декоративний фон */}
        <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
          <Trophy className="w-64 h-64" style={{ color: 'var(--c-primary)' }} />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5" style={{ color: 'var(--c-primary)' }} />
                <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--c-text-3)' }}>
                  Виклик з читання {currentYear}
                </h3>
              </div>
              <p className="font-serif font-black text-4xl" style={{ color: 'var(--c-text)' }}>
                {readCount} <span className="text-xl font-medium" style={{ color: 'var(--c-text-3)' }}>/ {yearlyGoal} книг</span>
              </p>
            </div>
            
            {progressPct === 100 && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5" 
                   style={{ background: 'var(--c-accent-muted)', color: 'var(--c-accent-h)' }}>
                <Trophy className="w-4 h-4" /> Ціль досягнуто!
              </div>
            )}
          </div>

          {/* Прогрес-бар */}
          <div className="h-4 rounded-full w-full overflow-hidden mb-3 shadow-inner" style={{ background: 'var(--c-surface-2)' }}>
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: `${progressPct}%`, background: 'var(--c-primary)' }}
            >
              <div className="absolute inset-0 bg-white/20 w-full" style={{ animation: 'shimmer 2s infinite' }} />
            </div>
          </div>
          
          <p className="text-right text-xs font-bold" style={{ color: 'var(--c-text-3)' }}>
            {progressPct}% виконано
          </p>
        </div>
      </div>

      {/* Картки додаткової статистики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="p-6 rounded-3xl flex items-center gap-5 transition-transform hover:-translate-y-1"
             style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" 
               style={{ background: 'var(--c-surface-2)' }}>
            <BookOpen className="w-6 h-6" style={{ color: 'var(--c-text)' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-3)' }}>Загалом прочитано</p>
            <p className="text-2xl font-black" style={{ color: 'var(--c-text)' }}>{totalReadCount} <span className="text-sm font-medium opacity-50">книг</span></p>
          </div>
        </div>

        <div className="p-6 rounded-3xl flex items-center gap-5 transition-transform hover:-translate-y-1"
             style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" 
               style={{ background: 'rgba(var(--c-primary-rgb), 0.1)' }}>
            <Flame className="w-6 h-6" style={{ color: 'var(--c-primary)' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-3)' }}>Зараз читаю</p>
            <p className="text-2xl font-black" style={{ color: 'var(--c-text)' }}>{currentlyReadingCount} <span className="text-sm font-medium opacity-50">книг</span></p>
          </div>
        </div>
      </div>

      {/* Список прочитаного цього року */}
      <div>
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--c-text)' }}>Прочитано у {currentYear} році</h3>
        {readThisYearBooks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {readThisYearBooks.map(book => (
              <div key={book.id} className="group relative rounded-2xl overflow-hidden aspect-[2/3] border" style={{ borderColor: 'var(--c-border-2)' }}>
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3 text-center bg-stone-100">
                    <span className="text-xs font-serif leading-snug line-clamp-4">{book.title}</span>
                  </div>
                )}
                {/* Градієнт і дата при наведенні */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                  <p className="text-white font-bold text-xs line-clamp-2">{book.title}</p>
                  <p className="text-white/70 text-[10px] mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(book.end_date).toLocaleDateString('uk-UA')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-3xl border border-dashed" style={{ borderColor: 'var(--c-border-2)' }}>
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm" style={{ color: 'var(--c-text-3)' }}>Ви ще не завершили жодної книги цього року.</p>
          </div>
        )}
      </div>

    </main>
  );
}