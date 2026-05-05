import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, Check, Loader2 } from 'lucide-react';
import { booksApi } from '../api/books.api';
import BookCard from '../components/books/BookCard';
import SkeletonCard from '../components/books/SkeletonCard';

export default function DiscoverPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const [filters, setFilters] = useState({
    search: '', genres: [], publishers: [], ratingMin: '', sort: '', yearFrom: '', yearTo: '', offset: 0
  });
  const [options, setOptions] = useState({ categories: [], publishers: [] });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Intersection Observer для нескінченного скролу
  const observer = useRef();
  const lastBookElementRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setFilters(prev => ({ ...prev, offset: prev.offset + 24 }));
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  // Завантажуємо доступні жанри та видавництва для бокової панелі
  useEffect(() => {
    booksApi.getFilters().then(data => {
      if (data) setOptions({ categories: data.categories || [], publishers: data.publishers || [] });
    }).catch(console.error);
  }, []);

  // Головний ефект для завантаження книг при зміні фільтрів
  useEffect(() => {
    const fetchBooks = async () => {
      if (filters.offset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await booksApi.getAll({ ...filters, limit: 24 });
        const newBooks = data || [];
        
        if (filters.offset === 0) {
          setBooks(newBooks);
        } else {
          setBooks(prev => [...prev, ...newBooks]);
        }
        
        setHasMore(newBooks.length === 24); // Якщо прийшло менше ліміту — це кінець
      } catch (e) {
        console.error("Помилка завантаження каталогу:", e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    // Debounce для пошуку
    const timeoutId = setTimeout(fetchBooks, filters.search ? 500 : 0);
    return () => clearTimeout(timeoutId);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const toggleArrayFilter = (key, value) => {
    setFilters(prev => {
      const current = prev[key];
      const updated = current.includes(value) 
        ? current.filter(item => item !== value) 
        : [...current, value];
      return { ...prev, [key]: updated, offset: 0 };
    });
  };

  const resetFilters = () => {
    setFilters({ search: '', genres: [], publishers: [], ratingMin: '', sort: '', yearFrom: '', yearTo: '', offset: 0 });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      
      {/* Бокова панель фільтрів */}
      <aside className={`w-full md:w-72 shrink-0 ${showMobileFilters ? 'block' : 'hidden md:block'}`}>
        <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm sticky top-24 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-stone-900">Фільтри</h2>
            <button onClick={resetFilters} className="text-xs font-bold text-[#D97757] hover:underline">Скинути</button>
          </div>

          {/* Жанри */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-4">Жанри</p>
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {options.categories.map(cat => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="hidden" checked={filters.genres.includes(cat)} onChange={() => toggleArrayFilter('genres', cat)} />
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${filters.genres.includes(cat) ? 'bg-[#1A361D]' : 'bg-stone-100 group-hover:bg-stone-200'}`}>
                    {filters.genres.includes(cat) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm font-medium text-stone-700 select-none">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Рейтинг */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-4">Мінімальний рейтинг</p>
            <select value={filters.ratingMin} onChange={e => handleFilterChange('ratingMin', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none font-medium focus:border-[#1A361D]">
              <option value="">Будь-який</option>
              <option value="4">Від 4 зірок</option>
              <option value="4.5">Від 4.5 зірок</option>
            </select>
          </div>

          {/* Роки */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-4">Рік видання</p>
            <div className="flex items-center gap-3">
              <input type="number" placeholder="Від" value={filters.yearFrom} onChange={e => handleFilterChange('yearFrom', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none text-center focus:border-[#1A361D]" />
              <span className="text-stone-300 font-bold">-</span>
              <input type="number" placeholder="До" value={filters.yearTo} onChange={e => handleFilterChange('yearTo', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none text-center focus:border-[#1A361D]" />
            </div>
          </div>
        </div>
      </aside>

      {/* Основний контент */}
      <div className="flex-1 min-w-0">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-serif font-black text-stone-900 mb-8">Каталог</h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-[#1A361D] transition-colors" />
              <input 
                type="text" 
                value={filters.search} 
                onChange={e => handleFilterChange('search', e.target.value)}
                placeholder="Пошук за назвою або автором..." 
                className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 ring-green-900/10 outline-none transition-all shadow-sm font-medium"
              />
            </div>
            
            <div className="flex gap-3 shrink-0">
              <select value={filters.sort} onChange={e => handleFilterChange('sort', e.target.value)} className="bg-white border border-stone-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none cursor-pointer shadow-sm focus:ring-4 ring-green-900/10">
                <option value="">Актуальні</option>
                <option value="newest">Новинки</option>
                <option value="popular">Найбільше відгуків</option>
                <option value="rating">За рейтингом</option>
                <option value="pages_asc">Найменше сторінок</option>
                <option value="pages_desc">Найбільше сторінок</option>
              </select>
              <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="md:hidden bg-white border border-stone-200 p-3.5 rounded-2xl shadow-sm">
                <SlidersHorizontal className="w-5 h-5 text-stone-600" />
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-stone-200">
            <Search className="w-16 h-16 text-stone-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-stone-900 mb-2">Нічого не знайдено</h3>
            <p className="font-medium text-stone-500">Спробуйте змінити критерії пошуку або фільтри.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {books.map((book, i) => {
                if (books.length === i + 1) {
                  return <div ref={lastBookElementRef} key={book.id}><BookCard book={book} /></div>;
                }
                return <BookCard key={book.id} book={book} />;
              })}
            </div>
            {loadingMore && (
              <div className="flex justify-center mt-12 mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}