import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserPlus, UserMinus, MessageSquare, BookOpen, Users, Check, Clock } from 'lucide-react';
import { userApi } from '../api/user.api';
import Loader from '../components/ui/Loader';
import StatCard from '../components/ui/StatCard';

export default function UserProfilePage({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Якщо клікнули на свій же профіль — перекидаємо на власну сторінку
    if (currentUser?.id === id) {
      navigate('/profile');
      return;
    }
    
    userApi.getUser(id)
      .then(setProfile)
      .catch(() => navigate('/discover')) // Якщо юзера не знайдено
      .finally(() => setLoading(false));
  }, [id, currentUser, navigate]);

  const handleFollow = async () => {
    try {
      if (profile.is_following) {
        await userApi.unfollow(id);
        setProfile(p => ({ ...p, is_following: false, followers_count: p.followers_count - 1 }));
      } else {
        await userApi.follow(id);
        setProfile(p => ({ ...p, is_following: true, followers_count: p.followers_count + 1 }));
      }
    } catch (e) { console.error(e); }
  };

  const handleFriendRequest = async () => {
    try {
      await userApi.sendFriendRequest(id);
      setProfile(p => ({ ...p, friend_status: 'pending' }));
    } catch (e) { console.error(e); }
  };

  const handleMessage = async () => {
    try {
      // Створюємо або отримуємо існуючу кімнату
      const res = await userApi.startConversation(id);
      navigate(`/messages?conv=${res.conversation_id}`);
    } catch (e) { console.error(e); }
  };

  if (loading) return <Loader fullPage />;
  if (!profile) return null;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <header className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 text-center md:text-left">
        <div className="w-32 h-32 bg-stone-200 rounded-full overflow-hidden border-4 border-white shadow-xl shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover"/>
          ) : (
            <div className="w-full h-full bg-[#1A361D] flex items-center justify-center text-white text-4xl font-black">
              {profile.username[0].toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-black text-stone-900 mb-2">{profile.username}</h1>
          <p className="text-stone-500 font-medium mb-6 max-w-lg">{profile.bio || 'Користувач ще не додав інформацію про себе.'}</p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button 
              onClick={handleFollow}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                profile.is_following 
                  ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' 
                  : 'bg-[#1A361D] text-white hover:bg-[#2C5234]'
              }`}
            >
              {profile.is_following ? 'Відписатися' : 'Підписатися'}
            </button>

            {!profile.is_friend && profile.friend_status !== 'pending' && (
              <button onClick={handleFriendRequest} className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-stone-800 shadow-sm">
                <UserPlus className="w-4 h-4" /> Додати в друзі
              </button>
            )}

            {profile.friend_status === 'pending' && (
              <span className="px-6 py-2.5 bg-amber-50 text-amber-600 rounded-xl text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" /> Запит надіслано
              </span>
            )}

            {profile.is_friend && (
              <span className="px-6 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold flex items-center gap-2">
                <Check className="w-4 h-4" /> Ви друзі
              </span>
            )}

            <button onClick={handleMessage} className="p-2.5 bg-stone-100 text-stone-600 rounded-xl hover:bg-[#D97757] hover:text-white transition-colors shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Підписників" value={profile.followers_count} variant="light" icon={Users} />
        <StatCard label="Підписок" value={profile.following_count} variant="light" icon={UserPlus} />
        <StatCard label="Друзів" value={profile.friends_count} variant="light" icon={Users} />
        <StatCard label="Прочитано" value={profile.books_read} sub="книг" variant="light" icon={BookOpen} />
      </div>
    </main>
  );
}