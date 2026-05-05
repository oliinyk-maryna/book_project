import React from 'react';
import { Sparkles, ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

// Виправлення ReferenceError: Компонент тепер визначений
const AIRecommendations = ({ isLoggedIn }) => (
  <section className="bg-emerald-50/50 border border-emerald-100 rounded-[2.5rem] p-8 mt-12">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600">
        <Sparkles className="w-5 h-5" />
      </div>
      <h2 className="text-xl font-serif font-bold text-stone-800">Персоналізовані поради</h2>
    </div>
    
    {isLoggedIn ? (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Картки рекомендацій на основі алгоритмів */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="aspect-[3/4] bg-stone-100 rounded-lg mb-4 animate-pulse" />
            <div className="h-4 w-3/4 bg-stone-100 rounded mb-2" />
            <div className="h-3 w-1/2 bg-stone-50 rounded" />
          </div>
        ))}
      </div>
    ) : (
      <p className="text-stone-500 italic">Увійдіть, щоб отримати рекомендації на основі ваших вподобань.</p>
    )}
  </section>
);

export default function HomePage({ isLoggedIn }) {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16">
      <section className="text-center mb-20 space-y-6">
        <h1 className="text-6xl md:text-7xl font-serif font-black text-stone-900 tracking-tight">
          Твоя цифрова <br />
          <span className="text-[#2C5234] italic">бібліотека</span>
        </h1>
        <p className="text-xl text-stone-500 max-w-2xl mx-auto">
          Аналізуйте свій прогрес, знаходьте нові сенси та діліться враженнями у спільноті однодумців.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link to="/discover" className="bg-stone-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center gap-2">
            Каталог книг <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Використання виправленого компонента[cite: 1] */}
      <AIRecommendations isLoggedIn={isLoggedIn} />

      <section className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-4xl font-serif font-bold text-stone-800">Більше ніж просто трекер</h2>
          <p className="text-stone-600 leading-relaxed">
            Ми використовуємо сучасні математичні моделі для аналізу вашої швидкості читання та занурення в матеріал.
          </p>
          <ul className="space-y-4">
            {['Детальна аналітика', 'Книжкові клуби', 'Розумні нотатки'].map(item => (
              <li key={item} className="flex items-center gap-3 font-bold text-stone-700">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-600" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-stone-100 aspect-video rounded-[3rem] shadow-inner flex items-center justify-center">
           <BookOpen className="w-20 h-20 text-stone-300" />
        </div>
      </section>
    </main>
  );
}