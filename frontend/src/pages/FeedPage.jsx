import React, { useState, useEffect } from 'react';
import { Activity, UserPlus, Check, X, BookOpen, Users } from 'lucide-react';
import { userApi } from '../api/user.api';
import Loader from '../components/ui/Loader';
import { useNavigate } from 'react-router-dom';

export default function FeedPage({ isLoggedIn }) {
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;
    Promise.all([userApi.getFeed(), userApi.getFriendRequests()])
      .then(([feedData, reqData]) => {
        setFeed(feedData || []);
        setRequests(reqData || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const handleRequest = async (id, action) => {
    try {
      if (action === 'accept') await userApi.acceptFriendRequest(id);
      else await userApi.declineFriendRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (e) { console.error(e); }
  };

  if (loading) return <Loader fullPage />;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-4xl font-serif font-black text-stone-900 mb-2">Мережа</h1>
        <p className="text-stone-500 font-medium">Активність ваших друзів та підписок.</p>
      </header>

      {/* Запити в друзі */}
      {requests.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm font-black uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Запити в друзі ({requests.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm flex items-center justify-between">
                <div 
                  onClick={() => navigate(`/user/${req.from_user_id}`)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center font-bold text-stone-500 overflow-hidden">
                    {req.from_avatar ? <img src={req.from_avatar} className="w-full h-full object-cover" /> : req.from_username[0].toUpperCase()}
                  </div>
                  <p className="font-bold text-stone-900 group-hover:text-[#1A361D] transition-colors">{req.from_username}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRequest(req.id, 'accept')} className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleRequest(req.id, 'decline')} className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Стрічка новин */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Стрічка активності
        </h2>
        
        {feed.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[2.5rem] border border-stone-100">
            <p className="text-stone-500 font-medium">Тут поки тихо. Підпишіться на когось, щоб бачити їхню активність.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {feed.map(event => (
              <div key={event.id} className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm flex gap-4">
                <div 
                  onClick={() => navigate(`/user/${event.actor_id}`)}
                  className="w-12 h-12 bg-stone-100 rounded-full shrink-0 flex items-center justify-center font-bold text-stone-500 overflow-hidden cursor-pointer"
                >
                  {event.actor_avatar ? <img src={event.actor_avatar} className="w-full h-full object-cover" /> : event.actor_name[0].toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-600">
                    <span className="font-bold text-stone-900 cursor-pointer hover:underline" onClick={() => navigate(`/user/${event.actor_id}`)}>
                      {event.actor_name}
                    </span>
                    {event.type === 'add_book' && ' додав(ла) книгу на полицю'}
                    {event.type === 'review' && ' написав(ла) відгук'}
                    {event.type === 'join_club' && ' приєднався(лась) до клубу'}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-wider text-stone-400 mt-1 mb-4">
                    {new Date(event.created_at).toLocaleDateString('uk-UA')}
                  </p>

                  {/* Картка об'єкта (Книга або Клуб) */}
                  {(event.work_id || event.club_id) && (
                    <div 
                      onClick={() => navigate(event.work_id ? `/book/${event.work_id}` : `/clubs`)}
                      className="inline-flex items-center gap-4 bg-stone-50 p-3 pr-6 rounded-2xl border border-stone-100 hover:border-stone-200 transition-colors cursor-pointer"
                    >
                      {event.work_id ? (
                        <>
                          <div className="w-10 h-14 bg-stone-200 rounded overflow-hidden shrink-0 shadow-sm">
                            {event.book_cover ? <img src={event.book_cover} className="w-full h-full object-cover"/> : <BookOpen className="w-4 h-4 m-auto mt-5 text-stone-400"/>}
                          </div>
                          <span className="font-bold text-stone-900 text-sm line-clamp-2">{event.book_title}</span>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-stone-900 text-sm">{event.club_name}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}