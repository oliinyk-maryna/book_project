import React, { useState } from 'react';
import { Users, Search, MessageCircle, Calendar, ArrowRight } from 'lucide-react';

export default function ClubsPage({ isLoggedIn }) {
  const [search, setSearch] = useState('');

  const clubs = [
    { id: 1, name: "Сучасна українська проза", members: 128, activeBook: "Танці з кістками", nextMeeting: "20.05.2026" },
    { id: 2, name: "Sci-Fi & Fantasy", members: 342, activeBook: "Дюна", nextMeeting: "22.05.2026" },
    { id: 3, name: "Філософський клуб", members: 89, activeBook: "Мислення швидке й повільне", nextMeeting: "25.05.2026" }
  ];

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">Книжкові клуби</h1>
          <p className="text-stone-500 font-medium">Читайте разом, обговорюйте, знаходьте однодумців.</p>
        </div>
        
        <div className="relative w-full md:w-72 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-emerald-600 transition-colors" />
          <input 
            type="text"
            placeholder="Знайти клуб..."
            className="w-full bg-white border border-stone-200 rounded-2xl py-3 pl-11 pr-4 focus:border-emerald-500 focus:ring-4 ring-emerald-500/10 transition-all outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.map(club => (
          <article key={club.id} className="bg-white rounded-[2rem] border border-stone-200 p-6 hover:shadow-lg hover:shadow-stone-200/50 transition-all group flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <span className="bg-stone-100 text-stone-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Users className="w-3 h-3" /> {club.members}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-stone-900 mb-1">{club.name}</h3>
            <p className="text-stone-500 text-sm mb-6 flex-1">
              Зараз читаємо: <span className="font-semibold text-stone-700 italic">{club.activeBook}</span>
            </p>
            
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-400">
                <Calendar className="w-4 h-4" />
                {club.nextMeeting}
              </div>
              <button className="text-[#2C5234] p-2 rounded-full hover:bg-emerald-50 transition-colors group-hover:translate-x-1 duration-300">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}