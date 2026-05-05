import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, Loader2, BookOpen, X } from 'lucide-react';
import { booksApi } from '../../api/books.api';
import { userApi } from '../../api/user.api';

export default function GlobalSearch({ handleNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addingBookId, setAddingBookId] = useState(null);
  const [addedBooks, setAddedBooks] = useState(new Set());
  
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Закриття при кліку поза елементом[cite: 23]
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce пошук через booksApi[cite: 23]
  useEffect(() => {
    const searchTerm = query.trim();
    if (searchTerm.length < 3) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await booksApi.search(searchTerm);
        setResults(data || []);
      } catch (error) {
        console.error("Помилка пошуку:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);
  
  const handleAddToShelf = async (book) => {
    const uniqueId = book.id || book.google_id || book.isbn;
    setAddingBookId(uniqueId);

    try {
      // Використовуємо новий userApi замість прямого fetch[cite: 23]
      await userApi.addBook({ book: book, status: 'planned' });
      setAddedBooks(prev => new Set(prev).add(uniqueId));
    } catch (error) {
      if (error.status === 401) window.dispatchEvent(new Event('auth:expired'));
      else console.error("Помилка додавання:", error);
    } finally {
      setAddingBookId(null);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl hidden md:block">
      <div className={`relative flex items-center w-full h-12 rounded-full transition-all ${
        isOpen && query ? 'bg-white border border-stone-200 shadow-sm rounded-b-none' : 'bg-stone-100 border border-transparent focus-within:bg-white focus-within:border-stone-200 focus-within:shadow-sm'
      }`}>
        <Search className="w-5 h-5 text-stone-400 ml-4 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => { if (query) setIsOpen(true); }}
          placeholder="Шукати книги або авторів..."
          className="w-full bg-transparent border-none px-3 py-2 text-sm outline-none text-stone-900 placeholder:text-stone-400 font-medium"
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
            className="p-1 mr-3 text-stone-400 hover:text-stone-700 bg-stone-200/50 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 bg-white rounded-b-2xl shadow-xl border border-stone-100 overflow-hidden z-50 flex flex-col max-h-[60vh]">
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {isLoading && (
              <div className="py-8 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#1A361D] mb-2" />
                <p className="text-xs text-stone-500 font-medium">Шукаємо...</p>
              </div>
            )}

            {!isLoading && results?.length === 0 && (
              <div className="py-8 text-center text-stone-500 text-sm">Нічого не знайдено за запитом "{query}"</div>
            )}

            {!isLoading && results?.length > 0 && (
              <div className="flex flex-col gap-1">
                {results.map((book, index) => {
                  const uniqueId = book.id || book.google_id; 
                  const isAdding = addingBookId === uniqueId;
                  const isAdded = addedBooks.has(uniqueId);

                  return (
                    <div key={index} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-stone-50 transition-colors group">
                      <div 
                        onClick={() => { setIsOpen(false); handleNavigate('book', uniqueId); }}
                        className="w-10 h-14 bg-stone-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-stone-200 cursor-pointer"
                      >
                        {book.cover_url ? <img src={book.cover_url} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-4 h-4 text-stone-300" />}
                      </div>
                      
                      <div 
                        onClick={() => { setIsOpen(false); handleNavigate('book', uniqueId); }}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <h4 className="font-bold text-stone-900 text-sm truncate group-hover:text-[#1A361D] transition-colors">{book.title}</h4>
                        <p className="text-xs text-stone-500 truncate">{book.authors?.join(', ') || 'Невідомий автор'}</p>
                      </div>
                      
                      <button 
                        onClick={() => handleAddToShelf(book)}
                        disabled={isAdding || isAdded}
                        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all mr-1 ${
                          isAdded ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600 hover:bg-[#1A361D] hover:text-white'
                        }`}
                      >
                        {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}