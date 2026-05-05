import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Crown, Lock } from 'lucide-react';
import { clubsApi } from '../api/clubs.api';
import ClubChat from '../components/clubs/ClubChat';

export default function ClubsPage({ isLoggedIn, user, openAuth }) {
  const [clubs, setClubs] = useState([]);
  const [activeClub, setActiveClub] = useState(null);
  const [loading, setLoading] = useState(true);

  // Завантажуємо клуби щоразу при відкритті сторінки або зміні авторизації
  useEffect(() => {
    clubsApi.getAll()
      .then(data => setClubs(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleJoin = async (clubId) => {
    if (!isLoggedIn) return openAuth('login');
    try {
      await clubsApi.join(clubId);
      const updated = await clubsApi.getAll();
      setClubs(updated || []);
    } catch (e) { alert(e.message); }
  };

  const handleEnterChat = async (club) => {
    if (!isLoggedIn) return openAuth('login');
    try {
      const fullData = await clubsApi.getOne(club.id);
      setActiveClub(fullData);
    } catch (e) { console.error(e); }
  };

  if (activeClub) {
    return <ClubChat club={activeClub} user={user} onBack={() => setActiveClub(null)} />;
  }

  const myClubs = clubs.filter(c => c.user_role); // Де юзер є учасником або адміном
  const publicClubs = clubs.filter(c => !c.user_role && c.status !== 'closed');

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-200 pb-8">
        <div>
          <h1 className="text-4xl font-serif font-black text-stone-900 mb-2">Книжкові клуби</h1>
          <p className="text-stone-500 font-medium">Читайте разом, обговорюйте, знаходьте однодумців.</p>
        </div>
        <button className="bg-[#1A361D] text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#2C5234] shadow-lg">
          <Plus className="w-5 h-5" /> Створити клуб
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#1A361D] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-12">
          {myClubs.length > 0 && (
            <section>
              <h2 className="text-xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#D97757]" /> Ваші клуби
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myClubs.map(c => <ClubCard key={c.id} club={c} onEnter={() => handleEnterChat(c)} />)}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1A361D]" /> Відкриті спільноти
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicClubs.map(c => <ClubCard key={c.id} club={c} onEnter={() => handleEnterChat(c)} onJoin={() => handleJoin(c.id)} />)}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

// Компонент картки клубу[cite: 51]
function ClubCard({ club, onEnter, onJoin }) {
  return (
    <article className="bg-white rounded-[2rem] border border-stone-200 p-6 hover:shadow-xl transition-all flex flex-col h-full group">
      <div className="flex gap-4 mb-6">
        <div className="w-16 aspect-[2/3] bg-stone-100 rounded-xl overflow-hidden shadow-sm shrink-0 border border-stone-200/50">
          {club.book_cover ? <img src={club.book_cover} className="w-full h-full object-cover" /> : <BookOpen className="w-6 h-6 m-auto mt-4 text-stone-300" />}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            {club.is_private && <Lock className="w-3.5 h-3.5 text-stone-400" />}
            <span className="text-[10px] font-black uppercase tracking-widest bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{club.status === 'recruiting' ? 'Набір' : 'Читаємо'}</span>
          </div>
          <h3 className="font-bold text-stone-900 leading-tight group-hover:text-[#1A361D] transition-colors">{club.name}</h3>
          <p className="text-xs text-stone-500 mt-1 line-clamp-2">{club.description}</p>
        </div>
      </div>
      
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-stone-100">
        <span className="text-xs font-bold text-stone-400 flex items-center gap-1.5"><Users className="w-4 h-4" /> {club.members_count} / {club.max_members}</span>
        {club.user_role ? (
          <button onClick={onEnter} className="bg-[#1A361D] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#2C5234]">Відкрити</button>
        ) : club.is_private ? (
          <span className="text-[10px] font-black uppercase text-stone-400">Закритий</span>
        ) : (
          <button onClick={onJoin} className="bg-stone-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-stone-800">Вступити</button>
        )}
      </div>
    </article>
  );
}