import React, { useState, useEffect } from 'react';
import { Users, Lock, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { booksApi } from '../../api/books.api';

export default function BookClubsList({ bookId, isLoggedIn }) {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) return;
    
    // Отримуємо клуби для конкретної книги
    booksApi.getBookClubs(bookId)
      .then(data => setClubs(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A361D]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {clubs.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
          <Users className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-medium mb-4">Ще немає активних клубів, які читають цю книгу.</p>
          <button
            onClick={() => navigate('/clubs')}
            className="bg-[#1A361D] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2C5234] transition-colors shadow-lg shadow-green-900/10"
          >
            Створити клуб
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clubs.map(club => (
            <div 
              key={club.id} 
              className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-stone-900 group-hover:text-[#1A361D] transition-colors line-clamp-1">
                  {club.name}
                </h3>
                {club.is_private && <Lock className="w-4 h-4 text-stone-400 shrink-0 ml-2" />}
              </div>
              
              <p className="text-xs text-stone-500 mb-6 line-clamp-2 flex-1">
                {club.description || 'Опис відсутній...'}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-stone-50 mt-auto">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-400">
                  <Users className="w-4 h-4" />
                  <span>
                    {club.members_count || 0} {club.max_members ? `/ ${club.max_members}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/clubs')}
                  className="text-xs font-black uppercase tracking-widest text-[#D97757] flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  Перейти <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}