import React, { useState } from 'react';
import { Search, Filter, Grid, List as ListIcon } from 'lucide-react';
import BookCard from '../components/books/BookCard';

export default function DiscoverPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Fiction', 'Science', 'History', 'Tech', 'Philosophy'];

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-serif font-bold text-stone-900 mb-8">Відкривайте нове</h1>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-emerald-600 transition-colors" />
            <input 
              type="text"
              placeholder="Пошук за назвою, автором або ISBN..."
              className="w-full bg-stone-100 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 ring-emerald-500/20 transition-all outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="p-4 bg-stone-100 rounded-2xl hover:bg-stone-200 transition-colors text-stone-600">
            <Filter className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex gap-2 mt-8 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                activeCategory === cat 
                  ? 'bg-[#2C5234] text-white' 
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </nav>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {/* Тут буде масив книг з API */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <BookCard key={i} loading={false} />
        ))}
      </section>
    </main>
  );
}