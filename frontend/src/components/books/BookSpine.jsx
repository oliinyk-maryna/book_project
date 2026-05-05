import React from 'react';

export default function BookSpine({ book, onClick }) {
  return (
    <div 
      className="relative group cursor-pointer flex-shrink-0 snap-center pb-4"
      onClick={() => onClick('book', book.id)}
    >
      <div className="w-28 sm:w-32 aspect-[2/3] rounded-r-md rounded-l-sm shadow-[-5px_5px_15px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-300 group-hover:-translate-y-4 group-hover:rotate-1 origin-bottom relative border-l border-stone-300/30 bg-stone-200">
        {book.cover_url ? (
          <img src={book.cover_url} className="w-full h-full object-cover" alt={book.title} />
        ) : (
          <div className="p-4 flex flex-col h-full justify-center">
            <p className="text-[10px] font-serif font-bold leading-tight line-clamp-4 uppercase opacity-50">{book.title}</p>
          </div>
        )}
      </div>
    </div>
  );
}