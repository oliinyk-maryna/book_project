import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2, Play, Plus, List, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/user.api';

const DEFAULT_SHELVES = [
  { id: 'reading', title: 'Читаю зараз', statuses: ['reading'] },
  { id: 'planned', title: 'В планах', statuses: ['planned'] },
  { id: 'read', title: 'Прочитано', statuses: ['read', 'finished'] }, 
  { id: 'dropped', title: 'Покинуті', statuses: ['dropped'] },
];

function BookSpine({ book, onClick, onRemove }) {
  return (
    <div className="relative group cursor-pointer flex-shrink-0 snap-center pb-[16px]">
      {/* 3D Ефект книги[cite: 16] */}
      <div className="w-28 md:w-32 aspect-[2/3] rounded-r-lg rounded-l-sm shadow-[-8px_8px_20px_rgba(0,0,0,0.25)] overflow-hidden transition-all duration-300 group-hover:-translate-y-6 group-hover:rotate-2 origin-bottom relative border-l-2 border-white/20 z-10">
        {book.cover_url ? (
          <img src={book.cover_url} className="w-full h-full object-cover" alt={book.title} />
        ) : (
          <div className="w-full h-full bg-stone-800 p-3 flex flex-col justify-end">
            <span className="text-white font-serif text-sm font-bold leading-tight">{book.title}</span>
          </div>
        )}
        
        {/* Оверлей дій при наведенні */}
        <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
          {book.status === 'reading' && (
            <button onClick={(e) => { e.stopPropagation(); onClick('reading', book.id); }} className="bg-[#D97757] text-white p-4 rounded-full shadow-xl transform hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current ml-1" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onRemove(book.id); }} className="bg-white/20 text-white p-2.5 rounded-full hover:bg-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div onClick={() => onClick('book', book.id)} className="absolute inset-0 z-20" />
    </div>
  );
}

export default function LibraryPage({ isLoggedIn, openAuth }) {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [customShelves, setCustomShelves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingShelf, setIsCreatingShelf] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { setIsLoading(false); return; }
    Promise.all([userApi.getBooks(), userApi.getShelves()])
      .then(([booksData, shelvesData]) => {
        setBooks(booksData || []);
        setCustomShelves(shelvesData || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isLoggedIn]);

  const handleCreateShelf = async () => {
    if (!newShelfName.trim()) return;
    try {
      await userApi.createShelf({ name: newShelfName });
      const shelvesData = await userApi.getShelves();
      setCustomShelves(shelvesData || []);
      setNewShelfName('');
      setIsCreatingShelf(false);
    } catch (e) { console.error(e); }
  };

  const handleRemoveBook = async (bookId) => {
    if (!window.confirm('Видалити книгу назавжди?')) return;
    try {
      await userApi.removeBook(bookId);
      setBooks(prev => prev.filter(b => b.id !== bookId));
    } catch (e) { console.error(e); }
  };

  const handleNavigate = (path, id) => navigate(`/${path}/${id}`);

  if (!isLoggedIn) return (
    <div className="p-20 text-center flex flex-col items-center">
      <BookOpen className="w-16 h-16 text-stone-200 mb-6" />
      <h2 className="text-3xl font-serif font-bold text-stone-900 mb-4">Ваша бібліотека</h2>
      <button onClick={() => openAuth('login')} className="bg-[#1A361D] text-white px-8 py-4 rounded-2xl font-bold">Увійти в систему</button>
    </div>
  );

  if (isLoading) return <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#1A361D]"/></div>;

  const ALL_SHELVES = [...DEFAULT_SHELVES, ...customShelves.map(s => ({ id: s.id, title: s.name, isCustom: true, statuses: [] }))];

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 pb-28 md:pb-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between md:items-end mb-12 border-b border-stone-200 pb-6 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif font-black text-stone-900">Моя бібліотека</h1>
          <p className="text-stone-500 mt-3 text-lg font-medium">Ваші збережені книги та прогрес читання[cite: 16].</p>
        </div>
        
        {isCreatingShelf ? (
          <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
            <input 
              autoFocus value={newShelfName} onChange={e => setNewShelfName(e.target.value)}
              placeholder="Назва полиці..."
              className="bg-white border border-stone-200 rounded-2xl px-5 py-3 outline-none focus:border-[#1A361D] focus:ring-4 ring-green-900/10 shadow-sm"
            />
            <button onClick={handleCreateShelf} className="bg-[#1A361D] text-white p-3.5 rounded-2xl hover:bg-[#2C5234] shadow-sm"><Check className="w-5 h-5"/></button>
            <button onClick={() => setIsCreatingShelf(false)} className="bg-stone-100 text-stone-600 p-3.5 rounded-2xl hover:bg-stone-200"><X className="w-5 h-5"/></button>
          </div>
        ) : (
          <button onClick={() => setIsCreatingShelf(true)} className="flex bg-white border border-stone-200 text-stone-700 px-6 py-3.5 rounded-2xl font-bold items-center justify-center gap-2 hover:bg-stone-50 shadow-sm transition-colors">
            <Plus className="w-5 h-5"/> Створити кастомну полицю[cite: 16]
          </button>
        )}
      </header>

      <div className="space-y-20">
        {ALL_SHELVES.map(shelf => {
          // Якщо кастомна полиця, в ідеалі ми маємо тягнути книги саме для неї.
          // Поки що фільтруємо стандартні по статусу[cite: 16].
          const shelfBooks = shelf.isCustom ? [] : books.filter(b => shelf.statuses.includes(b.status));
          
          if (shelfBooks.length === 0 && !shelf.isCustom) return null; // Ховаємо порожні стандартні полиці

          return (
            <section key={shelf.id} className="relative">
              <div className="flex items-center gap-4 mb-8 relative z-20 px-4">
                <div className={`p-3 rounded-2xl shadow-sm ${shelf.isCustom ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-white border border-stone-200 text-stone-600'}`}>
                  {shelf.isCustom ? <List className="w-5 h-5"/> : <BookOpen className="w-5 h-5"/>}
                </div>
                <h2 className="text-2xl font-serif font-bold text-stone-900">{shelf.title}</h2>
                <span className="text-xs font-black uppercase tracking-widest text-stone-400 ml-auto bg-stone-100 px-3 py-1.5 rounded-full">
                  {shelfBooks.length} книг
                </span>
              </div>

              {/* Рендер 3D Полиці[cite: 16] */}
              <div className="relative pt-4 pb-2 px-2 overflow-hidden">
                <div className="flex gap-6 md:gap-8 overflow-x-auto pb-10 pt-4 snap-x snap-mandatory no-scrollbar relative z-10 px-8">
                  {shelfBooks.map(book => (
                    <BookSpine key={book.id} book={book} onClick={handleNavigate} onRemove={handleRemoveBook} />
                  ))}
                  {shelfBooks.length === 0 && shelf.isCustom && (
                    <div className="w-full text-center text-stone-400 text-sm font-medium border-2 border-dashed border-stone-200 rounded-3xl py-10 bg-white/50">
                      Полиця порожня. Додайте книги через сторінку книги.
                    </div>
                  )}
                  <div className="min-w-[40px] flex-shrink-0" />
                </div>
                
                {/* Дерев'яна основа 3D Полиці[cite: 16] */}
                <div className="absolute bottom-8 left-0 right-0 h-5 bg-[#E5E0D8] z-0 shadow-inner rounded-t-sm" />
                <div className="absolute bottom-4 left-0 right-0 h-4 bg-[#D4CBBF] z-0 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] rounded-b-md border-t border-[#C3B9AB]" />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}