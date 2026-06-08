import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Check, X, SlidersHorizontal, Star, ChevronDown, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { API_URL } from '../config';

/* ── ДОПОМІЖНІ ФУНКЦІЇ ─────────────────────────────────────────── */
function getAuthorsString(book) {
  if (book.authors?.length > 0) return book.authors.join(', ');
  if (book.author) return book.author;
  return 'Невідомий автор';
}

/* ── КАРТКА КНИГИ В КАТАЛОЗІ ───────────────────────────────────── */
function BookGridCard({ book, onClick }) {
  return (
    <div 
      className="group flex flex-col cursor-pointer h-full p-3 rounded-2xl transition-all duration-300 hover:-translate-y-1" 
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: '0 4px 12px rgba(42, 36, 29, 0.02)' }}
      onClick={() => onClick('book', book.id)}
    >
      <div className="aspect-[2/3] w-full mb-3 overflow-hidden rounded-xl relative transition-transform duration-300 group-hover:shadow-md" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border-2)' }}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 text-center">
            <span className="text-xs font-serif leading-snug line-clamp-4" style={{ color: 'var(--c-text-3)' }}>{book.title}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="flex flex-col flex-1">
        {book.category && <p className="text-[10px] font-bold mb-1.5 uppercase tracking-widest truncate transition-colors group-hover:text-[var(--c-accent)]" style={{ color: 'var(--c-primary)' }}>{book.category}</p>}
        <h3 className="font-bold text-sm leading-snug mb-1 line-clamp-2 transition-colors" style={{ color: 'var(--c-text)' }}>{book.title}</h3>
        <p className="text-xs truncate mt-auto" style={{ color: 'var(--c-text-3)' }}>{getAuthorsString(book)}</p>
      </div>
    </div>
  );
}

/* ── СКЕЛЕТОН (ЗАВАНТАЖЕННЯ) ───────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="animate-pulse flex flex-col h-full p-3 rounded-2xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
      <div className="aspect-[2/3] rounded-xl mb-3" style={{ background: 'var(--c-bg)' }} />
      <div className="h-3 rounded mb-2 w-4/5" style={{ background: 'var(--c-bg)' }} />
      <div className="h-2.5 rounded w-3/5" style={{ background: 'var(--c-border-2)' }} />
    </div>
  );
}

/* ── АВТОКОМПЛІТ АВТОРІВ ───────────────────────────────────────── */
function AuthorSearch({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  const handleInput = (v) => {
    onChange(v);
    clearTimeout(timer.current);
    if (v.length < 2) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/authors/search?q=${encodeURIComponent(v)}`);
        if (res.ok) setSuggestions((await res.json()) || []);
      } catch {}
    }, 300);
  };

  return (
    <div className="relative">
      <input 
        value={value} 
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setShow(true)} 
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder="Пошук за автором..."
        className="w-full rounded-xl p-3 text-sm outline-none transition-all font-medium" 
        style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
      />
      {show && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          {suggestions.map(a => (
            <button key={a} onMouseDown={() => { onChange(a); setShow(false); setSuggestions([]); }} className="w-full text-left px-4 py-3 text-sm transition-colors last:border-0 hover:bg-[var(--c-surface-2)]" style={{ borderBottom: '1px solid var(--c-border-2)', color: 'var(--c-text)' }}>
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── КОНСТАНТИ ФІЛЬТРІВ ────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: '',         label: 'За замовчуванням' },
  { value: 'newest',   label: 'Найновіші надходження' },
  { value: 'popular',  label: 'За популярністю' },
  { value: 'rating',   label: 'Найвищий рейтинг' },
  { value: 'year',     label: 'За роком видання' },
  { value: 'random',   label: '🎲 Випадковий вибір' },
];

const PAGE_RANGES = [
  { label: 'Будь-який обсяг', min: 0, max: 0 },
  { label: 'Короткі твори (<200 ст.)', min: 0, max: 200 },
  { label: 'Середні (200-400 ст.)', min: 200, max: 400 },
  { label: 'Товсті романи (400+ ст.)', min: 400, max: 0 },
];

/* ── ГОЛОВНИЙ КОМПОНЕНТ ────────────────────────────────────────── */
export default function DiscoverPage({ handleNavigate }) {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterOpts, setFilterOpts] = useState({ categories: [], publishers: [], languages: [] });
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Стан фільтрів
  const [searchQuery, setSearchQuery] = useState('');
  const [authorQuery, setAuthorQuery] = useState('');
  const [selectedCats, setSelectedCats] = useState([]);
  const [selectedLangs, setSelectedLangs] = useState([]);
  const [selectedPubs, setSelectedPubs] = useState([]);
  const [pageRange, setPageRange] = useState(0); 
  const [ratingMin, setRatingMin] = useState(0);
  const [sortBy, setSortBy] = useState('');
  const [offset, setOffset] = useState(0);

  const LIMIT = 24;
  const searchTimer = useRef(null);
  const observerRef = useRef(null);
  const bottomRef = useRef(null);

  const buildParams = useCallback((extra = {}) => {
    const p = new URLSearchParams();
    if (searchQuery) p.append('search', searchQuery);
    if (authorQuery) p.append('author', authorQuery);
    selectedCats.forEach(c => p.append('genres', c));
    selectedLangs.forEach(l => p.append('languages', l));
    selectedPubs.forEach(v => p.append('publishers', v));
    const pr = PAGE_RANGES[pageRange];
    if (pr.min) p.append('page_min', pr.min);
    if (pr.max) p.append('page_max', pr.max);
    if (ratingMin > 0) p.append('rating_min', ratingMin);
    if (sortBy) p.append('sort', sortBy);
    p.append('limit', LIMIT);
    p.append('offset', extra.offset ?? 0);
    return p.toString();
  }, [searchQuery, authorQuery, selectedCats, selectedLangs, selectedPubs, pageRange, ratingMin, sortBy]);

  const fetchBooks = useCallback(async (off = 0, append = false) => {
    if (append) setIsLoadingMore(true); else setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/books?${buildParams({ offset: off })}`);
      const data = (await res.json()) || [];
      if (append) setBooks(prev => [...prev, ...data]); else setBooks(data);
      setHasMore(data.length === LIMIT);
      setOffset(off + data.length);
    } catch {
      if (!append) setBooks([]);
    } finally {
      setIsLoading(false); setIsLoadingMore(false);
    }
  }, [buildParams]);

  // Нескінченний скрол
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) fetchBooks(offset, true);
    }, { threshold: 0.1 });
    if (bottomRef.current) observerRef.current.observe(bottomRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoadingMore, isLoading, offset, fetchBooks]);

  // Дебаунс для пошуку
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setOffset(0); fetchBooks(0, false); }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery]);

  // Завантаження опцій фільтрів
  useEffect(() => {
    fetch(`${API_URL}/filters`)
      .then(r => r.json())
      .then(d => setFilterOpts({ categories: d?.categories || [], publishers: d?.publishers || [], languages: d?.languages || [] }))
      .catch(() => {});
    fetchBooks(0, false);
  }, []);

  const applyFilters = () => { setShowMobileFilters(false); setOffset(0); fetchBooks(0, false); };
  const resetFilters = () => {
    setSelectedCats([]); setSelectedLangs([]); setSelectedPubs([]);
    setPageRange(0); setRatingMin(0); setSortBy(''); setAuthorQuery(''); setSearchQuery(''); setOffset(0);
    setTimeout(() => fetchBooks(0, false), 50);
  };

  const toggle = (arr, setArr, val) => setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  const activeCount = selectedCats.length + selectedLangs.length + selectedPubs.length + (pageRange > 0 ? 1 : 0) + (ratingMin > 0 ? 1 : 0) + (authorQuery ? 1 : 0);

  /* ── БЛОК ФІЛЬТРІВ (Десктоп + Мобілка) ───────────────────────── */
  const FilterContent = () => (
    <div className="space-y-7">
      <div>
        <h3 className="font-bold text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-3)' }}>Пошук за автором</h3>
        <AuthorSearch value={authorQuery} onChange={setAuthorQuery} />
      </div>

      {filterOpts.categories.length > 0 && (
        <div>
          <h3 className="font-bold text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-3)' }}>Жанри та категорії</h3>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
            {filterOpts.categories.map(cat => (
              <label key={cat} className="flex items-center gap-3 cursor-pointer group py-1">
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${selectedCats.includes(cat) ? 'border-transparent shadow-sm' : 'border-[var(--c-border)] group-hover:border-[var(--c-primary)]'}`} style={selectedCats.includes(cat) ? { background: 'var(--c-primary)' } : {}}>
                  <input type="checkbox" className="hidden" checked={selectedCats.includes(cat)} onChange={() => toggle(selectedCats, setSelectedCats, cat)} />
                  {selectedCats.includes(cat) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm transition-colors font-medium" style={{ color: selectedCats.includes(cat) ? 'var(--c-text)' : 'var(--c-text-2)' }}>{cat}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {filterOpts.publishers.length > 0 && (
        <div>
          <h3 className="font-bold text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-3)' }}>Видавництва</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {filterOpts.publishers.map(pub => (
              <label key={pub} className="flex items-center gap-3 cursor-pointer group py-1">
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${selectedPubs.includes(pub) ? 'border-transparent shadow-sm' : 'border-[var(--c-border)] group-hover:border-[var(--c-primary)]'}`} style={selectedPubs.includes(pub) ? { background: 'var(--c-primary)' } : {}}>
                  <input type="checkbox" className="hidden" checked={selectedPubs.includes(pub)} onChange={() => toggle(selectedPubs, setSelectedPubs, pub)} />
                  {selectedPubs.includes(pub) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm transition-colors font-medium truncate" style={{ color: selectedPubs.includes(pub) ? 'var(--c-text)' : 'var(--c-text-2)' }}>{pub}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-bold text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-3)' }}>Обсяг книги</h3>
        <div className="space-y-2.5">
          {PAGE_RANGES.map((pr, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer group">
              <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all" style={{ borderColor: pageRange === i ? 'var(--c-primary)' : 'var(--c-border)' }}>
                <div className="w-2 h-2 rounded-full transition-all" style={{ background: pageRange === i ? 'var(--c-primary)' : 'transparent', transform: pageRange === i ? 'scale(1)' : 'scale(0)' }} />
                <input type="radio" name="pageRange" checked={pageRange === i} onChange={() => setPageRange(i)} className="hidden" />
              </div>
              <span className="text-sm transition-colors font-medium" style={{ color: pageRange === i ? 'var(--c-text)' : 'var(--c-text-2)' }}>{pr.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-3)' }}>Мінімальна оцінка читачів</h3>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map(r => (
            <button key={r} onClick={() => setRatingMin(r === ratingMin ? 0 : r + 1)} className="focus:outline-none p-1.5 hover:scale-110 transition-transform bg-[var(--c-bg)] rounded-xl border border-[var(--c-border-2)]">
              <Star className="w-5 h-5 transition-colors" style={{ color: r < ratingMin ? 'var(--c-accent)' : 'var(--c-border)', fill: r < ratingMin ? 'var(--c-accent)' : 'transparent' }} />
            </button>
          ))}
          {ratingMin > 0 && <span className="text-xs font-bold ml-3 px-2 py-1 rounded-md" style={{ background: 'var(--c-accent-muted)', color: 'var(--c-accent-h)' }}>{ratingMin}+ зірок</span>}
        </div>
      </div>

      {filterOpts.languages.length > 0 && (
        <div>
          <h3 className="font-bold text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-3)' }}>Мова видання</h3>
          <div className="flex flex-wrap gap-2">
            {filterOpts.languages.map(lang => (
              <button key={lang} onClick={() => toggle(selectedLangs, setSelectedLangs, lang)} className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm" style={selectedLangs.includes(lang) ? { background: 'var(--c-primary)', color: 'white', border: '1px solid transparent' } : { background: 'var(--c-bg)', color: 'var(--c-text-2)', border: '1px solid var(--c-border)' }}>
                {lang}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Кнопки (тільки для десктопу) */}
      <div className="hidden lg:flex flex-col gap-2 pt-6 border-t" style={{ borderColor: 'var(--c-border)' }}>
        <button onClick={applyFilters} className="w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition-all hover:opacity-90 active:scale-95 shadow-md" style={{ background: 'var(--c-primary)' }}>Застосувати</button>
        {activeCount > 0 && <button onClick={resetFilters} className="w-full py-2 text-sm font-bold transition-colors hover:underline" style={{ color: 'var(--c-text-3)' }}>Скинути всі {activeCount} фільтрів</button>}
      </div>
    </div>
  );

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 mt-6 md:mt-8 pb-28 md:pb-12 page-enter">
        
        {/* ── ШАПКА ТА ПОШУК ──────────────────────────────────────────── */}
        <div className="mb-6 md:mb-8 pb-5 md:pb-6 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <h1 className="text-3xl md:text-4xl font-serif font-black mb-4 md:mb-6 tracking-tight" style={{ color: 'var(--c-text)' }}>Бібліотечний каталог</h1>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 max-w-4xl">

            <div className="flex gap-3">
              <div className="relative flex-1 sm:flex-none sm:w-56">
                <select 
                  value={sortBy} onChange={e => { setSortBy(e.target.value); setOffset(0); setTimeout(() => fetchBooks(0, false), 50); }}
                  className="w-full appearance-none rounded-2xl py-3.5 pl-4 pr-10 text-sm outline-none cursor-pointer shadow-sm font-bold transition-all"
                  style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                >
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--c-text-3)' }} />
              </div>

              <button onClick={() => setShowMobileFilters(true)} className="lg:hidden flex items-center justify-center w-12 shrink-0 rounded-2xl border transition-colors shadow-sm" style={activeCount > 0 ? { background: 'var(--c-primary)', borderColor: 'var(--c-primary)', color: 'white' } : { background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}>
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">

          {/* ── ФІЛЬТРИ ДЕСКТОП ────────────────────────────────────────── */}
          <aside className="hidden lg:block w-64 shrink-0">
            {FilterContent()}
          </aside>

          {/* ── СПИСОК КНИГ ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <span className="text-sm font-bold" style={{ color: 'var(--c-text-3)' }}>
                {isLoading ? 'Шукаємо твори...' : `Знайдено видань: ${books.length}${hasMore ? '+' : ''}`}
              </span>
              {/* Активні фільтри */}
              {activeCount > 0 && (
                <div className="flex flex-wrap gap-2">
                  {[...selectedCats, ...selectedPubs, ...selectedLangs].slice(0, 3).map(c => (
                    <button key={c} onClick={() => { toggle(selectedCats.includes(c) ? selectedCats : selectedPubs.includes(c) ? selectedPubs : selectedLangs, selectedCats.includes(c) ? setSelectedCats : selectedPubs.includes(c) ? setSelectedPubs : selectedLangs, c); setTimeout(applyFilters, 50); }} className="text-[10px] px-2.5 py-1.5 font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-colors shadow-sm hover:line-through" style={{ background: 'var(--c-surface)', color: 'var(--c-text-2)', border: '1px solid var(--c-border)' }}>
                      {c} <X className="w-3 h-3" />
                    </button>
                  ))}
                  {(activeCount > 3) && <span className="text-[10px] font-bold px-2 py-1.5" style={{ color: 'var(--c-text-3)' }}>+{activeCount - 3} ще</span>}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-24 rounded-3xl border border-dashed" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <Search className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--c-border)' }} />
                <p className="font-bold text-base mb-1" style={{ color: 'var(--c-text)' }}>За вашим запитом нічого не знайдено.</p>
                <p className="text-sm mb-4" style={{ color: 'var(--c-text-3)' }}>Спробуйте змінити критерії пошуку або обрати інші жанри.</p>
                <button onClick={resetFilters} className="text-sm font-bold hover:underline" style={{ color: 'var(--c-primary)' }}>Скинути всі фільтри</button>
              </div>
            ) : (
              <>
                <div className="grid gap-x-4 gap-y-8 sm:gap-6 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                  {books.map(book => <BookGridCard key={book.id} book={book} onClick={handleNavigate} />)}
                </div>

                {/* Індикатор нескінченного скролу */}
                <div ref={bottomRef} className="h-24 flex flex-col items-center justify-center mt-6">
                  {isLoadingMore && <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--c-primary)' }} />}
                  {!hasMore && books.length > 0 && <p className="text-[11px] font-bold uppercase tracking-widest mt-4" style={{ color: 'var(--c-text-3)' }}>Ви переглянули всі результати</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── ФІЛЬТРИ МОБІЛЬНІ (Рендеримо через Portal у самому корені компонента) ── */}
      {showMobileFilters && createPortal(
        <div className="fixed inset-0 z-[60] lg:hidden flex flex-col justify-end animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          <div className="relative w-full rounded-t-3xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300 shadow-2xl" style={{ background: 'var(--c-surface)' }}>
            <div className="flex justify-between items-center px-6 py-5 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <h2 className="text-xl font-serif font-bold" style={{ color: 'var(--c-text)' }}>Фільтри та налаштування</h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-full transition-colors hover:bg-[var(--c-surface-2)]">
                <X className="w-5 h-5" style={{ color: 'var(--c-text-3)' }}/>
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
              {FilterContent()}
            </div>
            <div className="p-5 border-t grid grid-cols-2 gap-4 pb-safe" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
              <button onClick={resetFilters} className="py-3.5 rounded-xl text-sm font-bold transition-colors" style={{ background: 'var(--c-bg)', color: 'var(--c-text-2)' }}>Скинути все</button>
              <button onClick={applyFilters} className="py-3.5 rounded-xl text-sm font-bold text-white shadow-sm" style={{ background: 'var(--c-primary)' }}>Показати книги</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}