import React from 'react';
import { Star, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BookCard({ book }) {
  return (
    <Link to={`/book/${book.id}`} className="group block">
      <div className="relative aspect-[2/3] rounded-2xl bg-stone-100 mb-3 overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 border border-stone-200/50">
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-stone-200">
             <BookOpen className="w-6 h-6 text-stone-400 mb-2" />
             <span className="font-serif text-stone-500 text-xs font-bold leading-tight">{book.title}</span>
          </div>
        )}
        
        {book.average_rating > 0 && (
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
            <span className="text-[10px] font-black text-stone-800">{Number(book.average_rating).toFixed(1)}</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="font-bold text-sm text-stone-900 leading-tight mb-1 group-hover:text-[#1A361D] transition-colors line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs font-medium text-stone-500 line-clamp-1">{book.authors?.join(', ') || book.author}</p>
      </div>
    </Link>
  );
}