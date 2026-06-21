import React, { useState, useEffect } from 'react';
import { ChevronRight, Flame, Sparkles, Trophy, Wand2, Send, Loader2, BookOpen, Coffee, ArrowRight } from 'lucide-react';
import { API_URL } from '../config';

const token = () => localStorage.getItem('token');

function getAuthors(book) {
  if (book.authors?.length > 0) return book.authors.join(', ');
  if (book.author) return book.author;
  return 'Невідомий автор';
}

/* ── КАРТКА КНИГИ (ДЛЯ КАРУСЕЛІ) ───────────────────────────────── */
function BookCard({ book, onClick }) {
  return (
    <div 
      onClick={() => book.id && onClick('book', book.id)}
      className="min-w-[140px] max-w-[140px] md:min-w-[160px] md:max-w-[160px] snap-start shrink-0 cursor-pointer group flex flex-col h-full"
    >
      <div className="w-full aspect-[2/3] rounded-2xl mb-3 overflow-hidden transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lg relative" style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 text-center">
            <span className="font-serif text-xs leading-snug line-clamp-4" style={{ color: 'var(--c-text-3)' }}>{book.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="flex flex-col flex-1">
        <h3 className="text-sm font-bold leading-snug line-clamp-2 transition-colors group-hover:text-[var(--c-primary)]" style={{ color: 'var(--c-text)' }}>{book.title}</h3>
        <p className="text-[11px] mt-1 line-clamp-1 font-medium" style={{ color: 'var(--c-text-3)' }}>{getAuthors(book)}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="min-w-[140px] max-w-[140px] md:min-w-[160px] md:max-w-[160px] shrink-0 animate-pulse flex flex-col">
      <div className="w-full aspect-[2/3] rounded-2xl mb-3" style={{ background: 'var(--c-surface-2)' }} />
      <div className="h-3.5 rounded mb-2 w-5/6" style={{ background: 'var(--c-surface-2)' }} />
      <div className="h-2.5 rounded w-2/3" style={{ background: 'var(--c-border-2)' }} />
    </div>
  );
}

/* ── КАРУСЕЛЬ (РЯД КНИГ) ───────────────────────────────────────── */
function BookRow({ title, icon: Icon, iconColor, books, isLoading, onNavigate }) {
  return (
    <section className="relative">
      <div className="flex items-end justify-between mb-4 md:mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shadow-sm border" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
            <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: iconColor }} />
          </div>
          <h2 className="font-serif font-bold text-xl md:text-2xl" style={{ color: 'var(--c-text)' }}>{title}</h2>
        </div>
        <button onClick={() => onNavigate('discover')} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-70 mb-1" style={{ color: 'var(--c-primary)' }}>
          Всі <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex gap-4 md:gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : books.length > 0
            ? books.map((book) => <BookCard key={book.id} book={book} onClick={onNavigate} />)
            : <p className="text-sm italic py-8 text-center w-full" style={{ color: 'var(--c-text-3)' }}>У цій категорії поки порожньо</p>
        }
      </div>
    </section>
  );
}

/* ── ГОЛОВНИЙ КОМПОНЕНТ ─────────────────────────────────────────── */
export default function HomePage({ handleNavigate, isLoggedIn, currentUser, openAuthModal }) {
  const [popular, setPopular]    = useState([]); // Змінено з trending
  const [newBooks, setNewBooks]    = useState([]);
  const [topYear, setTopYear]      = useState([]);
  const [reading, setReading]      = useState([]);
  const [loadingMain, setLoadingMain] = useState(true);

  const year = new Date().getFullYear();

  useEffect(() => {
    const fetchMain = async () => {
      try {
        const [pRes, nRes, yRes] = await Promise.all([

          // Замість fetch(`${API_URL}/books?sort=popular&limit=10`)
fetch(`${API_URL}/trending?limit=10`),

// Замість fetch(`${API_URL}/books?sort=new&limit=10`)
fetch(`${API_URL}/newest?limit=10`),
          fetch(`${API_URL}/top-year?year=${year}&limit=10`),
        ]);
        if (pRes.ok) setPopular((await pRes.json()) || []);
        if (nRes.ok) setNewBooks((await nRes.json()) || []);
        if (yRes.ok) setTopYear((await yRes.json()) || []);
      } catch {}
      finally { setLoadingMain(false); }
    };
    fetchMain();
  }, [year]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`${API_URL}/me/books`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setReading((data || []).filter(b => b.status === 'reading')))
      .catch(() => {});
  }, [isLoggedIn]);

  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Доброї ночі' : hour < 12 ? 'Доброго ранку' : hour < 18 ? 'Доброго дня' : 'Доброго вечора';
  const name = currentUser?.username ? `, ${currentUser.username}` : '';

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-10 space-y-12 md:space-y-16 page-enter">

      {/* ── ШАПКА (ВІТАННЯ) ────────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full" style={{ background: 'var(--c-accent-muted)' }}><Coffee className="w-3.5 h-3.5" style={{ color: 'var(--c-accent-h)' }} /></span>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-text-3)' }}>{greeting}{name}</p>
          </div>
          <h1 className="font-serif font-black text-4xl md:text-5xl leading-tight tracking-tight" style={{ color: 'var(--c-text)' }}>
            Що почитаємо<br/>сьогодні?
          </h1>
        </div>
      </section>

      {/* ── ВІДЖЕТ "ЧИТАЮ ЗАРАЗ" ────────────────────────────────────── */}
      {isLoggedIn && reading.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-bold text-xl md:text-2xl" style={{ color: 'var(--c-text)' }}>Читаю зараз</h2>
            {reading.length > 2 && (
              <button onClick={() => handleNavigate('library')} className="text-xs font-bold uppercase tracking-wider hover:underline" style={{ color: 'var(--c-primary)' }}>Вся полиця</button>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {reading.slice(0, 2).map(book => {
              const maxPages = Number(book.page_count || book.total_pages || 0);
const currentPage = Number(book.current_page || 0);
const pct = maxPages > 0 ? Math.round((currentPage / maxPages) * 100) : 0;
              return (
                <div key={book.id} onClick={() => handleNavigate('book', book.id)} className="flex items-center gap-4 md:gap-6 p-4 md:p-5 rounded-3xl cursor-pointer group transition-all hover:-translate-y-1 hover:shadow-md border" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                  
                  <div className="w-16 h-24 md:w-20 md:h-28 rounded-xl overflow-hidden shrink-0 shadow-sm border" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }}>
                    {book.cover_url ? <img src={book.cover_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6" style={{ color: 'var(--c-text-3)' }} /></div>}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--c-accent)' }}>Прогрес: {pct}%</p>
                    <p className="text-base md:text-lg font-bold truncate mb-1" style={{ color: 'var(--c-text)' }}>{book.title}</p>
                    <p className="text-xs truncate font-medium mb-3" style={{ color: 'var(--c-text-3)' }}>{getAuthors(book)}</p>
                    
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-border-2)' }}>
                      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: 'var(--c-primary)' }} />
                    </div>
                    <p className="text-[10px] font-bold mt-2" style={{ color: 'var(--c-text-3)' }}>
  {currentPage} з {maxPages || '?'} сторінок
</p>
                  </div>
                  
                  <div className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center shrink-0 transition-colors" style={{ background: 'var(--c-bg)', color: 'var(--c-primary)' }}>
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── КАРУСЕЛІ КНИГ ──────────────────────────────────────────── */}
      
      {/* 1. Популярні замість Гарячих новинок */}
      <BookRow title="Популярні зараз" icon={Flame} iconColor="var(--c-accent)" books={popular} isLoading={loadingMain} onNavigate={handleNavigate} />
      
      {/* AISection ТИМЧАСОВО ПРИХОВАНО */}
      {/* <AISection isLoggedIn={isLoggedIn} openAuthModal={openAuthModal} /> */}

      {/* 2. Найкраще за поточний рік */}
      <BookRow title={`Книги з найвищим рейтингом`} icon={Trophy} iconColor="#EAB308" books={topYear} isLoading={loadingMain} onNavigate={handleNavigate} />
      
      {/* 3. Щойно додали */}
      <BookRow title="Щойно додали" icon={Sparkles} iconColor="#8B5CF6" books={newBooks} isLoading={loadingMain} onNavigate={handleNavigate} />
      
    </main>
  );
}