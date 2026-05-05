import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, ChevronDown, X, Loader2 } from 'lucide-react';
import { booksApi } from '../api/books.api';
import BookCard from '../components/books/BookCard';

export default function DiscoverPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Фільтри
  const [filters, setFilters] = useState({
    search: '', genres: [], publishers: [], ratingMin: '', sort: '', yearFrom: '', yearTo: '', offset: 0
  });
  const [filterOptions, setFilterOptions] = useState({ categories: [], publishers: [] });
  const [showFilters, setShowFilters] = useState(false);

  const observer = useRef();
  const lastBookRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setFilters(prev => ({ ...prev, offset: prev.offset + 24 }));
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  // Завантаження опцій фільтрів при старті
  useEffect(() => {
    booksApi.getFilters().then(data => {
      if(data) setFilterOptions({ categories: data.categories || [], publishers: data.publishers || [] });
    });
  }, []);

  // Завантаження книг при зміні фільтрів (debounce для пошуку)
  useEffect(() => {
    const fetchBooks = async () => {
      if (filters.offset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const data = await booksApi.getAll({ ...filters, limit: 24 });
        if (filters.offset === 0) setBooks(data || []);
        else setBooks(prev => [...prev, ...(data || [])]);
        
        setHasMore((data || []).length === 24);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    const delay = setTimeout(fetchBooks, 300);
    return () => clearTimeout(delay);
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const toggleArrayFilter = (key, value) => {
    setFilters(prev => {
      const arr = prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value];
      return { ...prev, [key]: arr, offset: 0 };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8">
      
      {/* Бокова панель фільтрів */}
      <aside className={`w-full md:w-72 shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-sm sticky top-24 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-stone-900">Фільтри</h2>
            <button onClick={() => setFilters({ search: '', genres: [], publishers: [], ratingMin: '', sort: '', yearFrom: '', yearTo: '', offset: 0 })} className="text-xs font-bold text-[#D97757] hover:underline">Скинути</button>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Жанри</p>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {filterOptions.categories.map(cat => (
                <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="hidden" checked={filters.genres.includes(cat)} onChange={() => toggleArrayFilter('genres', cat)} />
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${filters.genres.includes(cat) ? 'bg-[#1A361D]' : 'bg-stone-100 group-hover:bg-stone-200'}`}>
                    {filters.genres.includes(cat) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm font-medium text-stone-700">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Рейтинг</p>
            <select value={filters.ratingMin} onChange={e => updateFilter('ratingMin', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none font-medium">
              <option value="">Будь-який</option>
              <option value="4">Від 4 зірок</option>
              <option value="4.5">Від 4.5 зірок</option>
            </select>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Рік видання</p>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Від" value={filters.yearFrom} onChange={e => updateFilter('yearFrom', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none text-center" />
              <span className="text-stone-300">-</span>
              <input type="number" placeholder="До" value={filters.yearTo} onChange={e => updateFilter('yearTo', e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm outline-none text-center" />
            </div>
          </div>
        </div>
      </aside>

      {/* Основний контент */}
      <div className="flex-1">
        <header className="mb-8">
          <h1 className="text-4xl font-serif font-black text-stone-900 mb-6">Каталог</h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-[#1A361D] transition-colors" />
              <input 
                type="text" 
                value={filters.search} onChange={e => updateFilter('search', e.target.value)}
                placeholder="Назва, автор або ISBN..." 
                className="w-full bg-white border border-stone-200 rounded-2xl py-3.5 pl-12 pr-4 focus:ring-4 ring-green-900/10 outline-none transition-all shadow-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <select value={filters.sort} onChange={e => updateFilter('sort', e.target.value)} className="bg-white border border-stone-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none cursor-pointer shadow-sm">
                <option value="">Актуальні</option>
                <option value="newest">Новинки</option>
                <option value="popular">Популярні</option>
                <option value="rating">Рейтинг</option>
              </select>
              <button onClick={() => setShowFilters(!showFilters)} className="md:hidden bg-white border border-stone-200 p-3.5 rounded-2xl shadow-sm">
                <SlidersHorizontal className="w-5 h-5 text-stone-600" />
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1A361D]" /></div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-stone-200">
            <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="font-bold text-stone-500">За вашим запитом нічого не знайдено</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {books.map((book, i) => {
                if (books.length === i + 1) return <div ref={lastBookRef} key={book.id}><BookCard book={book} /></div>;
                return <BookCard key={book.id} book={book} />;
              })}
            </div>
            {loadingMore && <div className="flex justify-center mt-8"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>}
          </>
        )}
      </div>
    </div>
  );
}