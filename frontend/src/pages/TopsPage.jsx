import React, { useState, useEffect } from 'react';
import { Trophy, Star, Medal, BookOpen, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

function getAuthors(book) {
  if (book.authors?.length > 0) return book.authors.join(', ');
  if (book.author) return book.author;
  return 'Невідомий автор';
}

function TopBookRow({ book, index, onClick }) {
  // Кольори для 1, 2 та 3 місця
  const isGold = index === 0;
  const isSilver = index === 1;
  const isBronze = index === 2;
  
  let rankColor = 'bg-[var(--c-surface-2)] text-[var(--c-text-2)]';
  if (isGold) rankColor = 'bg-yellow-100 text-yellow-700 shadow-sm border border-yellow-200';
  if (isSilver) rankColor = 'bg-slate-100 text-slate-700 shadow-sm border border-slate-200';
  if (isBronze) rankColor = 'bg-orange-100 text-orange-800 shadow-sm border border-orange-200';

  return (
    <div 
      onClick={() => onClick('book', book.id)}
      className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:bg-[var(--c-surface-2)] border border-transparent hover:border-[var(--c-border)] group"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${rankColor}`}>
        {index + 1}
      </div>
      
      <div className="w-12 h-16 rounded-md overflow-hidden bg-[var(--c-surface-2)] shrink-0 border border-[var(--c-border)] shadow-sm">
        {book.cover_url ? (
          <img src={book.cover_url} className="w-full h-full object-cover" alt="" />
        ) : (
          <BookOpen className="w-6 h-6 m-auto mt-5 opacity-20" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm leading-tight truncate transition-colors group-hover:text-[var(--c-primary)]" style={{ color: 'var(--c-text)' }}>
          {book.title}
        </h3>
        <p className="text-xs mt-1 truncate font-medium" style={{ color: 'var(--c-text-3)' }}>
          {getAuthors(book)}
        </p>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0" style={{ background: 'var(--c-accent-muted)', color: 'var(--c-accent-h)' }}>
        <Star className="w-3.5 h-3.5 fill-[var(--c-accent)] text-[var(--c-accent)]" />
        <span className="font-bold text-xs">{book.average_rating > 0 ? book.average_rating : '—'}</span>
      </div>
    </div>
  );
}

export default function TopsPage() {
  const navigate = useNavigate();
  const [topAllTime, setTopAllTime] = useState([]);
  const [topYear, setTopYear] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchTops = async () => {
      try {
        const [allTimeRes, yearRes] = await Promise.all([
          fetch(`${API_URL}/books?sort=rating&limit=10`),
          fetch(`${API_URL}/top-year?year=${currentYear}&limit=10`)
        ]);
        
        if (allTimeRes.ok) setTopAllTime(await allTimeRes.json() || []);
        if (yearRes.ok) setTopYear(await yearRes.json() || []);
      } catch (e) {
        console.error("Помилка завантаження рейтингів");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTops();
  }, [currentYear]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--c-primary)' }} />
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 pb-28 page-enter">
      
      {/* ── ШАПКА ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8 mb-8" style={{ borderColor: 'var(--c-border)' }}>
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 shadow-sm" style={{ background: 'var(--c-accent)', color: 'white' }}>
            <Trophy className="w-3.5 h-3.5" />
            Зал слави
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight mb-3" style={{ color: 'var(--c-text)' }}>
            Рейтинги платформи
          </h1>
          <p className="text-sm md:text-base font-medium leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
            Найкращі книги за версією читачів. Рейтинг формується автоматично на основі оцінок, які користувачі залишають після прочитання.
          </p>
        </div>
        
        <button onClick={() => navigate('/discover')} className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 shadow-sm" style={{ background: 'var(--c-primary)', color: 'white' }}>
          Перейти до каталогу <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        
        {/* ── ТОП ВСІХ ЧАСІВ ────────────────────────────────────────────── */}
        <section className="p-6 md:p-8 rounded-3xl border shadow-sm" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--c-border-2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--c-accent-muted)', color: 'var(--c-accent-h)' }}>
              <Medal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--c-text)' }}>Топ всіх часів</h2>
              <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--c-text-3)' }}>10 найкращих книг</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            {topAllTime.length > 0 ? (
              topAllTime.map((book, idx) => (
                <TopBookRow key={`all-${book.id}`} book={book} index={idx} onClick={(path, id) => navigate(`/${path}/${id}`)} />
              ))
            ) : (
              <p className="text-sm italic text-center py-10" style={{ color: 'var(--c-text-3)' }}>Недостатньо оцінок для формування рейтингу</p>
            )}
          </div>
        </section>

        {/* ── ТОП ПОТОЧНОГО РОКУ ────────────────────────────────────────── */}
        <section className="p-6 md:p-8 rounded-3xl border shadow-sm" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--c-border-2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-primary)' }}>
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--c-text)' }}>Найкраще у {currentYear}</h2>
              <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--c-text-3)' }}>Головні новинки року</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {topYear.length > 0 ? (
              topYear.map((book, idx) => (
                <TopBookRow key={`year-${book.id}`} book={book} index={idx} onClick={(path, id) => navigate(`/${path}/${id}`)} />
              ))
            ) : (
              <p className="text-sm italic text-center py-10" style={{ color: 'var(--c-text-3)' }}>У цьому році ще немає книг з оцінками</p>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}