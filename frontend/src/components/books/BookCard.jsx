import React from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BookCard({ book, loading = false }) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="aspect-[2/3] bg-stone-200 rounded-2xl mb-4 w-full shadow-sm" />
        <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
      </div>
    );
  }

  // Заглушка, якщо дані книги не передані
  const item = book || {
    id: 1,
    title: "Тіні забутих предків",
    author: "Михайло Коцюбинський",
    rating: 4.8,
    cover: null
  };

  return (
    <Link to={`/book/${item.id}`} className="group block">
      <div className="relative aspect-[2/3] rounded-2xl bg-stone-100 mb-4 overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
        {item.cover ? (
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-stone-200 flex flex-col items-center justify-center p-4 text-center">
             <span className="font-serif text-stone-400 font-bold leading-tight">{item.title}</span>
          </div>
        )}
        
        {/* Оверлей з рейтингом */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-[10px] font-bold text-stone-700">{item.rating}</span>
        </div>
      </div>
      
      <div>
        <h3 className="font-bold text-stone-900 leading-tight mb-1 group-hover:text-[#2C5234] transition-colors line-clamp-1">
          {item.title}
        </h3>
        <p className="text-sm font-medium text-stone-500 line-clamp-1">{item.author}</p>
      </div>
    </Link>
  );
}