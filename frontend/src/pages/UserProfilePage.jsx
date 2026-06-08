import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserCheck, BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi } from '../api/user.api';

export default function UserProfilePage({ isLoggedIn, currentUser, handleNavigate }) {
  const { id }    = useParams();
  const navigate  = useNavigate();
  
  const [profile, setProfile]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isFollowing, setFollowing] = useState(false);

  useEffect(() => {
    // Якщо користувач перейшов на свій власний ID — перекидаємо на його особисту сторінку
    if (currentUser?.id === id) { 
      navigate('/profile', { replace: true }); 
      return; 
    }
    
    userApi.getUser(id)
      .then(data => { 
        setProfile(data); 
        setFollowing(data.is_following); 
      })
      .catch(() => { 
        toast.error('Користувача не знайдено'); 
        navigate(-1); 
      })
      .finally(() => setLoading(false));
  }, [id, currentUser, navigate]);

  const toggleFollow = async () => {
    if (!isLoggedIn) return toast.error('Спочатку увійдіть в акаунт');
    const was = isFollowing;
    setFollowing(!was); // Оптимістичне оновлення UI
    
    try {
      was ? await userApi.unfollow(id) : await userApi.follow(id);
      toast.success(was ? 'Ви відписалися' : 'Ви підписалися!');
      setProfile(p => ({ ...p, followers_count: was ? p.followers_count - 1 : p.followers_count + 1 }));
    } catch { 
      setFollowing(was); // Відкат при помилці
      toast.error('Сталася помилка'); 
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex justify-center items-center">
      <div className="w-10 h-10 border-4 rounded-full animate-spin border-t-transparent" style={{ borderColor: 'var(--c-border)', borderTopColor: 'var(--c-primary)' }} />
    </div>
  );

  if (!profile) return null;

  const books = profile.recent_books || [];

  return (
    <main className="max-w-2xl mx-auto md:py-8 pb-28 page-enter" style={{ background: 'var(--c-bg)' }}>
      
      {/* ── ШАПКА ────────────────────────────────────────────────── */}
      <div className="flex items-center px-4 py-3 md:px-0 mb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 -ml-2 rounded-full font-bold text-sm transition-colors hover:bg-[var(--c-surface-2)]" style={{ color: 'var(--c-text-2)' }}>
          <ArrowLeft className="w-5 h-5" /> Назад
        </button>
      </div>

      <div className="px-4 md:px-0 space-y-6">
        
        {/* ── КАРТКА ПРОФІЛЮ ─────────────────────────────────────── */}
        <section className="flex flex-col items-center text-center gap-4 bg-[var(--c-surface)] p-6 md:p-8 rounded-3xl shadow-sm border border-[var(--c-border)]">
          
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold font-serif text-white shadow-lg"
            style={{ background: profile.avatar_url ? 'transparent' : 'var(--c-primary)' }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} alt="" />
              : profile.username?.[0]?.toUpperCase()}
          </div>
          
          <div>
            <h1 className="font-serif font-black text-2xl leading-tight" style={{ color: 'var(--c-text)' }}>{profile.username}</h1>
            {profile.bio ? (
               <p className="text-sm mt-2 max-w-sm mx-auto leading-relaxed font-medium" style={{ color: 'var(--c-text-2)' }}>{profile.bio}</p>
            ) : (
               <p className="text-xs mt-1 italic" style={{ color: 'var(--c-text-3)' }}>Користувач не додав інформацію про себе</p>
            )}
          </div>

          {/* Статистика */}
          <div className="flex gap-0 rounded-2xl overflow-hidden w-full max-w-sm mt-2" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
            <div className="flex-1 py-3 text-center">
              <p className="font-display font-bold text-xl leading-none" style={{ color: 'var(--c-text)' }}>{profile.followers_count ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-1.5" style={{ color: 'var(--c-text-3)' }}>Підписники</p>
            </div>
            <div style={{ width: 1, background: 'var(--c-border)' }} />
            <div className="flex-1 py-3 text-center">
              <p className="font-display font-bold text-xl leading-none" style={{ color: 'var(--c-text)' }}>{profile.following_count ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-1.5" style={{ color: 'var(--c-text-3)' }}>Підписки</p>
            </div>
            <div style={{ width: 1, background: 'var(--c-border)' }} />
            <div className="flex-1 py-3 text-center">
              <p className="font-display font-bold text-xl leading-none" style={{ color: 'var(--c-primary)' }}>{profile.books_read ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider mt-1.5" style={{ color: 'var(--c-text-3)' }}>Книг</p>
            </div>
          </div>

          {/* Кнопка підписки */}
          {isLoggedIn && (
            <button onClick={toggleFollow}
              className="w-full max-w-sm mt-2 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
              style={isFollowing
                ? { background: 'var(--c-surface-2)', color: 'var(--c-text)', border: '1px solid var(--c-border)' }
                : { background: 'var(--c-primary)', color: '#fff' }}>
              {isFollowing ? <><UserCheck className="w-4 h-4" /> Ви підписані</> : <><UserPlus className="w-4 h-4" /> Підписатися</>}
            </button>
          )}
        </section>

        {/* ── ОСТАННІ КНИГИ ──────────────────────────────────────── */}
        {books.length > 0 ? (
          <section className="bg-[var(--c-surface)] p-6 rounded-3xl border border-[var(--c-border)] shadow-sm">
            <h2 className="font-serif font-bold text-lg mb-4 flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
              <BookOpen className="w-5 h-5" style={{ color: 'var(--c-text-3)' }}/> Читає або прочитав(ла)
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory custom-scrollbar -mx-6 px-6">
              {books.map(book => (
                <div key={book.id} onClick={() => handleNavigate('book', book.id)}
                  className="min-w-[110px] max-w-[110px] shrink-0 snap-start cursor-pointer group flex flex-col">
                  
                  <div className="w-full aspect-[2/3] rounded-xl overflow-hidden mb-2.5 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-md border" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border-2)' }}>
                    {book.cover_url
                      ? <img src={book.cover_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={book.title} />
                      : <div className="w-full h-full flex items-center justify-center p-2 text-center">
                          <span className="font-serif text-[10px] leading-snug line-clamp-3" style={{ color: 'var(--c-text-3)' }}>{book.title}</span>
                        </div>}
                  </div>
                  
                  <p className="text-xs font-bold leading-tight line-clamp-2 transition-colors group-hover:text-[var(--c-primary)]" style={{ color: 'var(--c-text)' }}>
                    {book.title}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="bg-[var(--c-surface)] p-8 rounded-3xl border border-[var(--c-border)] border-dashed shadow-sm text-center">
             <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--c-border)' }} />
             <p className="text-sm font-medium" style={{ color: 'var(--c-text-2)' }}>Користувач ще не додав жодної книги на свою полицю.</p>
          </section>
        )}

      </div>
    </main>
  );
}