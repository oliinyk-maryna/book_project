import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Star, Users, MessageCircle, Clock, Play } from 'lucide-react';
import { booksApi } from '../api/books.api';
import { userApi } from '../api/user.api';
import ReviewSection from '../components/books/ReviewSection';
import BookClubsList from '../components/clubs/BookClubsList';

export default function BookPage({ isLoggedIn, user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about'); // 'about' | 'reviews' | 'clubs'
  const [userStatus, setUserStatus] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    booksApi.getOne(id)
      .then(data => {
        setBook(data);
        setUserStatus(data.user_status || null);
      })
      .catch(() => navigate('/discover')) // Якщо книги немає
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleStatusChange = async (status) => {
    if (!isLoggedIn) return window.dispatchEvent(new Event('auth:expired'));
    try {
      await userApi.updateBook(id, { status });
      setUserStatus(status);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex justify-center items-center">
      <div className="w-10 h-10 border-4 border-[#1A361D] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 hover:text-[#1A361D] mb-8 transition-colors font-medium">
        <ArrowLeft className="w-5 h-5" /> Назад
      </button>

      {/* Hero-блок книги */}
      <div className="flex flex-col md:flex-row gap-10 items-start mb-12">
        <div className="w-48 md:w-64 shrink-0 mx-auto md:mx-0">
          <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-stone-300">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-stone-200 flex items-center justify-center"><BookOpen className="w-12 h-12 text-stone-400" /></div>
            )}
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-serif font-black text-stone-900 leading-tight mb-2">
            {book.title}
          </h1>
          <p className="text-xl text-[#D97757] font-medium mb-6">
            {book.authors?.join(', ') || book.author}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 mb-8 text-sm font-medium text-stone-600">
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span className="font-bold">{book.average_rating > 0 ? Number(book.average_rating).toFixed(1) : 'Нова'}</span>
            </div>
            {book.category && <span className="bg-stone-100 px-3 py-1.5 rounded-xl">{book.category}</span>}
            {book.page_count > 0 && <span className="bg-stone-100 px-3 py-1.5 rounded-xl">{book.page_count} стор.</span>}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Кнопка статусу */}
            <select 
              value={userStatus || ''}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-[#1A361D] text-white px-6 py-3.5 rounded-2xl font-bold text-center cursor-pointer outline-none hover:bg-[#2C5234] transition-colors shadow-lg shadow-green-900/20"
            >
              <option value="" disabled>Додати на полицю</option>
              <option value="planned">В планах</option>
              <option value="reading">Читаю зараз</option>
              <option value="read">Прочитано</option>
              <option value="dropped">Покинуто</option>
            </select>

            {/* Кнопка читалки (Якщо статус reading) */}
            {userStatus === 'reading' && (
              <button 
                onClick={() => navigate(`/reading/${id}`)}
                className="w-full sm:w-auto bg-stone-100 text-[#1A361D] px-6 py-3.5 rounded-2xl font-bold hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> Читати / Таймер
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="flex gap-8 border-b border-stone-200 mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'about', label: 'Про книгу' },
          { id: 'reviews', label: 'Рецензії' },
          { id: 'clubs', label: 'Клуби' }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id)}
            className={`pb-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors relative ${
              activeTab === t.id ? 'text-[#1A361D]' : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            {t.label}
            {activeTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1A361D] rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Вміст вкладок */}
      <div className="min-h-[400px]">
        {activeTab === 'about' && (
          <div className="prose prose-stone max-w-none text-stone-600 leading-relaxed">
            {book.description ? <p>{book.description}</p> : <p className="italic text-stone-400">Опис відсутній.</p>}
          </div>
        )}
        {activeTab === 'reviews' && <ReviewSection bookId={id} isLoggedIn={isLoggedIn} />}
        {activeTab === 'clubs' && <BookClubsList bookId={id} isLoggedIn={isLoggedIn} />}
      </div>
    </div>
  );
}