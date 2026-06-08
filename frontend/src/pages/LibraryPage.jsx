import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2, Play, Plus, List, Bookmark } from 'lucide-react';
import { API_URL } from '../config';

const DEFAULT_SHELVES = [
  { id: 'reading',  title: 'Читаю зараз',  statuses: ['reading'], icon: Play,     color: 'var(--c-accent)',   bg: 'var(--c-accent-muted)' },
  { id: 'planned',  title: 'В планах',     statuses: ['planned'], icon: Bookmark, color: 'var(--c-text-2)',   bg: 'var(--c-surface-2)' },
  { id: 'finished', title: 'Прочитано',    statuses: ['read'],    icon: BookOpen, color: 'var(--c-primary)',  bg: 'var(--c-primary-muted)' }, 
  { id: 'dropped',  title: 'Покинуті',     statuses: ['dropped'], icon: List,     color: 'var(--c-text-3)',   bg: 'var(--c-border)' },
];

/* ── КОМПОНЕНТ КНИГИ НА ПОЛИЦІ (3D корінець) ───────────────────── */
function BookSpine({ book, onClick }) {
  return (
    <div className="relative group cursor-pointer flex-shrink-0 snap-center pb-5">
      {/* Сама книга */}
      <div className="w-24 sm:w-28 md:w-32 aspect-[2/3] rounded-r-md rounded-l-sm shadow-md overflow-hidden transition-all duration-300 group-hover:-translate-y-4 group-hover:rotate-2 origin-bottom relative border-l-2 border-white/20" style={{ background: 'var(--c-text)' }}>
        {book.cover_url ? (
          <img src={book.cover_url} className="w-full h-full object-cover" alt={book.title} />
        ) : (
          <div className="w-full h-full p-3 flex flex-col justify-end" style={{ background: 'linear-gradient(to top right, var(--c-text), var(--c-text-2))' }}>
            <span className="text-white/90 font-serif text-[10px] sm:text-xs font-bold leading-tight line-clamp-4">{book.title}</span>
          </div>
        )}
        
        {/* Кнопка "Відкрити" для книг в процесі */}
        {book.status === 'reading' && (
          <div onClick={(e) => { e.stopPropagation(); onClick('book', book.id); }} 
               className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
            <button className="p-3 sm:p-4 rounded-full shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300 text-white" style={{ background: 'var(--c-accent)' }}>
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-1" />
            </button>
          </div>
        )}
      </div>
      
      {/* Клікабельна зона поверх усього */}
      <div onClick={() => onClick('book', book.id)} className="absolute inset-0 z-10" />
    </div>
  );
}

/* ── ГОЛОВНИЙ КОМПОНЕНТ ────────────────────────────────────────── */
export default function LibraryPage({ handleNavigate, isLoggedIn, openAuthModal }) {
  const [books, setBooks] = useState([]);
  const [customShelves, setCustomShelves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) { setIsLoading(false); return; }

    const fetchLibrary = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [booksRes, shelvesRes] = await Promise.all([
          fetch(`${API_URL}/me/books`, { headers }),
          fetch(`${API_URL}/me/shelves`, { headers })
        ]);
        
        if (booksRes.ok) setBooks(await booksRes.json() || []);
        if (shelvesRes.ok) setCustomShelves(await shelvesRes.json() || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    
    // 1. Завантажуємо бібліотеку при першому відкритті сторінки
    fetchLibrary();

    // 2. ДОДАНО: Слухаємо глобальну подію оновлення додатку
    window.addEventListener('app:refresh', fetchLibrary);
    
    // 3. ДОДАНО: Прибираємо слухача, коли користувач іде зі сторінки
    return () => window.removeEventListener('app:refresh', fetchLibrary);
  }, [isLoggedIn]);
  /* ── ЗАГЛУШКА ДЛЯ ГОСТЕЙ ── */
  if (!isLoggedIn) {
    return (
      <main className="max-w-5xl mx-auto px-4 mt-8 pb-28 text-center py-20 flex flex-col items-center justify-center min-h-[60vh] page-enter">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <BookOpen className="w-10 h-10" style={{ color: 'var(--c-border)' }} />
        </div>
        <h1 className="text-3xl font-serif font-black mb-3" style={{ color: 'var(--c-text)' }}>Ваша бібліотека</h1>
        <p className="text-sm font-medium max-w-md mx-auto mb-6" style={{ color: 'var(--c-text-2)' }}>Увійдіть або зареєструйтесь, щоб зберігати книги, відстежувати прогрес читання та створювати власні полиці.</p>
        <button onClick={() => openAuthModal && openAuthModal('login')} className="px-8 py-3 rounded-full text-white font-bold text-sm tracking-widest uppercase transition-transform active:scale-95 shadow-md" style={{ background: 'var(--c-primary)' }}>
          Увійти
        </button>
      </main>
    );
  }

  /* ── СКЕЛЕТОН ЗАВАНТАЖЕННЯ ── */
  if (isLoading) {
    return <div className="min-h-[60vh] flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--c-primary)' }}/></div>;
  }

  const ALL_SHELVES = [
    ...DEFAULT_SHELVES,
    ...customShelves.map(shelf => ({
      id: shelf.id,
      title: shelf.name,
      isCustom: true,
      icon: List,
      color: 'var(--c-text-2)',
      bg: 'var(--c-border)'
    }))
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 mt-8 pb-28 md:pb-12 page-enter relative min-h-screen">
      
      {/* ── ХЕДЕР ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 md:mb-12 border-b pb-4 md:pb-6 gap-4" style={{ borderColor: 'var(--c-border)' }}>
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight" style={{ color: 'var(--c-text)' }}>Моя полиця</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base font-medium" style={{ color: 'var(--c-text-3)' }}>Ваші збережені книги та прогрес читання.</p>
        </div>
      </div>

      {/* ── ПОЛИЦІ ────────────────────────────────────────────────────── */}
      <div className="space-y-16 md:space-y-20">
        {ALL_SHELVES.map(shelf => {
          // Логіка відбору книг
          const shelfBooks = shelf.isCustom ? [] : books.filter(b => shelf.statuses.includes(b.status));
          const Icon = shelf.icon;
          
          return (
            <section key={shelf.id} className="relative">
              
              {/* Заголовок полиці */}
              <div className="flex items-center gap-3 mb-6 relative z-20">
                <div className="p-2.5 rounded-xl" style={{ background: shelf.bg, color: shelf.color }}>
                  <Icon className="w-5 h-5"/>
                </div>
                <h2 className="text-xl md:text-2xl font-serif font-bold" style={{ color: 'var(--c-text)' }}>{shelf.title}</h2>
                <span className="text-xs font-bold ml-auto px-3 py-1 rounded-lg" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text-3)' }}>
                  {shelfBooks.length}
                </span>
              </div>

              {/* Сама 3D полиця */}
              <div className="relative pt-2 pb-2 px-2 overflow-hidden group/shelf">
                <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-4 snap-x snap-mandatory custom-scrollbar relative z-10 px-2 sm:px-6">
                  
                  {shelfBooks.map(book => (
                    <BookSpine key={book.id} book={book} onClick={handleNavigate} />
                  ))}

                  {shelfBooks.length === 0 && (
                    <div className="w-full min-h-[160px] flex items-center justify-center border-2 border-dashed rounded-3xl backdrop-blur-sm text-sm font-medium" style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text-3)' }}>
                      У цьому розділі поки немає книг
                    </div>
                  )}
                  
                  {/* Простір в кінці для скролу */}
                  <div className="min-w-[40px] flex-shrink-0" />
                </div>

                {/* 3D Ефект "Лампової" дошки */}
                <div className="absolute bottom-5 left-0 right-0 h-4 z-0 shadow-inner rounded-sm" style={{ background: 'var(--c-border-2)' }} />
                <div className="absolute bottom-3 left-0 right-0 h-2.5 z-0 rounded-b-md border-t" style={{ background: 'var(--c-border)', borderColor: 'rgba(255,255,255,0.3)', boxShadow: '0 10px 20px -5px rgba(42,36,29,0.1)' }} />
              </div>
            </section>
          );
        })}
      </div>

      {/* ── ПЛАВАЮЧА КНОПКА (FAB) ДЛЯ МОБІЛОК ────────────────────────── */}
      <button className="md:hidden fixed bottom-[88px] right-5 w-14 h-14 text-white rounded-full flex items-center justify-center shadow-lg z-40 active:scale-95 transition-transform" style={{ background: 'var(--c-primary)' }}>
        <Plus className="w-6 h-6" />
      </button>

    </main>
  );
}