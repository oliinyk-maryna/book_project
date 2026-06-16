import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, BookOpen } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { booksApi } from '../../api/books.api';

// ДОДАНО: Приймаємо пропси onCloseMobile та handleNavigate з App.jsx
export default function GlobalSearch({ onCloseMobile, handleNavigate, isMobile }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await booksApi.search(query);
        setResults(data || []);
      } catch (err) {
        console.error("Помилка пошуку:", err);
      } finally { 
        setLoading(false); 
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const forceCloseSearch = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    // ВАЖЛИВО: Кажемо App.jsx закрити мобільний оверлей
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Поле вводу */}
      <div className={`flex items-center bg-stone-100 border border-transparent rounded-full px-4 py-2 transition-all focus-within:bg-white focus-within:border-stone-300 focus-within:shadow-sm ${isOpen && results.length > 0 ? 'rounded-b-none border-stone-300 bg-white' : ''}`}>
        <Search className="w-4 h-4 text-stone-400 shrink-0" />
        <input
          ref={inputRef}
          type="text" 
          value={query} 
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Пошук книг або авторів..."
          className="w-full bg-transparent border-none px-3 text-sm outline-none text-stone-900 font-medium placeholder:text-stone-400"
        />
        {query && (
          <X 
            className="w-4 h-4 text-stone-400 cursor-pointer hover:text-stone-700" 
            onClick={forceCloseSearch} 
          />
        )}
      </div>

      {/* Результати пошуку */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-stone-200 border-t-0 rounded-b-2xl shadow-xl z-50 overflow-hidden">
          {loading ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#1A361D]" />
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map(book => (
                <div 
                  key={book.id} 
                  onClick={() => {
                    // Використовуємо глобальну навігацію з App.jsx, якщо вона є
                    if (handleNavigate) {
                      handleNavigate('book', book.id);
                    } else {
                      navigate(`/book/${book.id}`);
                    }
                    forceCloseSearch(); // Закриваємо всі вікна
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-stone-50 border-b border-stone-50 block cursor-pointer select-none"
                >
                  {/* Обкладинка */}
                  <div className="w-8 h-12 bg-stone-200 rounded overflow-hidden shrink-0 flex items-center justify-center">
                    {book.cover_url ? (
                      <img src={book.cover_url} className="w-full h-full object-cover" alt={book.title} />
                    ) : (
                      <BookOpen className="w-4 h-4 text-stone-400"/>
                    )}
                  </div>
                  
                  {/* Інформація про книгу */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-stone-900 truncate">{book.title}</p>
                    <p className="text-xs text-stone-500 truncate">
                      {book.authors?.join(', ') || book.author || 'Невідомий автор'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-stone-500">Нічого не знайдено</div>
          )}
        </div>
      )}
    </div>
  );
}