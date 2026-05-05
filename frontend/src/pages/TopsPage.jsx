import React from 'react';
import { Trophy, ChevronRight, BookOpen, Users, Star } from 'lucide-react';

const mockCategories = [
  { id: 'fiction', name: 'Художня література', votes: 124500 },
  { id: 'fantasy', name: 'Фентезі та Магія', votes: 189300 },
  { id: 'thriller', name: 'Трилер та Детектив', votes: 98400 },
  { id: 'romance', name: 'Романтика', votes: 145000 },
  { id: 'scifi', name: 'Наукова фантастика', votes: 76200 },
  { id: 'history', name: 'Історичний роман', votes: 45100 },
];

export default function TopsPage({ handleNavigate }) {
  const totalVotes = mockCategories.reduce((acc, cat) => acc + cat.votes, 0); // Підрахунок голосів[cite: 68]

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 pb-28 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-stone-200 pb-12 mb-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
            <Star className="w-3.5 h-3.5 fill-current" />
            Голосування триває
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-black text-stone-900 tracking-tight mb-6">
            Libro Awards 2025
          </h1>
          <p className="text-stone-500 text-lg leading-relaxed font-medium">
            Щорічна премія, де найкращі книги року обираєте саме ви. Віддайте свій голос та визначте фаворитів сезону[cite: 68].
          </p>
        </div>
        
        <div className="flex items-center gap-5 bg-white p-6 rounded-[2rem] border border-stone-100 shadow-xl shadow-stone-100/50 shrink-0">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Усього голосів</p>
            <p className="text-3xl font-black text-stone-900">
              {totalVotes.toLocaleString('uk-UA')}[cite: 68]
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockCategories.map(cat => (
          <div 
            key={cat.id} 
            onClick={() => handleNavigate('discover')} 
            className="bg-white rounded-[2.5rem] border border-stone-100 overflow-hidden hover:shadow-2xl hover:border-emerald-500/20 transition-all duration-500 cursor-pointer group"
          >
            <div className="bg-stone-50/50 py-4 px-8 border-b border-stone-50 flex justify-between items-center group-hover:bg-emerald-900 transition-colors duration-500">
              <h3 className="font-serif font-bold text-stone-800 group-hover:text-white text-xl">
                {cat.name}
              </h3>
            </div>
            
            <div className="p-8 flex gap-6 items-center">
              <div className="w-28 aspect-[2/3] shrink-0 bg-stone-100 rounded-2xl shadow-inner border border-stone-200/30 flex flex-col items-center justify-center relative overflow-hidden group-hover:scale-105 transition-all duration-500">
                <BookOpen className="w-10 h-10 text-stone-300 mb-3" />
                <span className="text-[8px] text-stone-400 uppercase font-black tracking-[0.2em] px-4 text-center leading-tight">
                  Номінант
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5"/>
                  {cat.votes.toLocaleString('uk-UA')} голосів[cite: 68]
                </p>
                <h4 className="font-bold text-lg text-stone-900 leading-tight mb-2 truncate group-hover:text-emerald-700 transition-colors">
                  Визначається...
                </h4>
                <button className="text-xs font-black uppercase tracking-widest text-emerald-800 flex items-center gap-2 mt-6 group-hover:translate-x-2 transition-transform">
                  Голосувати <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}