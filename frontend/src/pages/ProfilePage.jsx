import React, { useState, useEffect, useCallback } from 'react';
import { Settings, LogOut, BookOpen, Users, X, ChevronRight, UserPlus, Search, Shield } from 'lucide-react';
import { userApi } from '../api/user.api';
import toast from 'react-hot-toast';
import { API_URL, getImageUrl } from '../config';

/* ── Модалка підписники/підписки з рекомендаціями + пошуком ─────── */
function ConnectionsModal({ type, userId, onClose, handleNavigate }) {
  const [people, setPeople] = useState([]);
  const [recoms, setRecoms] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
  const title = type === 'followers' ? 'Підписники' : 'Підписки';

  // 1. ФІКСАЦІЯ ФОНУ
  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${userId}/${type}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPeople(data || []);
      } else {
        setPeople([]);
      }
    } catch { setPeople([]); }
    setLoading(false);
  };

  const loadRecommended = async () => {
    try {
      const res = await fetch(`${API_URL}/users/search?q=`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecoms((data || []).slice(0, 8));
      }
    } catch { setRecoms([]); }
  };

  useEffect(() => {
    loadConnections();
    loadRecommended();
  }, [type, userId]);

  // Глобальний пошук нових користувачів
  useEffect(() => {
    if (query.trim().length < 1) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          const filtered = (data || []).filter(user => user.id !== userId);
          setSearchResults(filtered);
        }
      } catch { }
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [query, userId]);

  const isSearchActive = query.trim().length >= 1;
  const shown = isSearchActive ? searchResults : people;
  const showRecoms = !isSearchActive && people.length === 0;

  const emptyLabel = isSearchActive ? 'Нікого не знайдено' :
    type === 'followers' ? 'У вас ще немає підписників' : 'Ви ще ні на кого не підписані';

  return (
    <div
      className="fixed top-0 left-0 w-full h-[100dvh] z-[9999] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          maxHeight: '75dvh' // Використовуємо безпечну динамічну висоту для мобільних
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
          <h3 className="font-bold text-base">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full transition-colors hover:bg-stone-100" style={{ background: 'var(--c-bg)', color: 'var(--c-text-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--c-border-2)' }}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-3)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Знайти користувачів..."
              className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
              style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }} />
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-0.5">
          {loading || isSearching ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
                <div className="w-10 h-10 rounded-full" style={{ background: 'var(--c-surface-2)' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 rounded w-24" style={{ background: 'var(--c-surface-2)' }} />
                  <div className="h-2.5 rounded w-40" style={{ background: 'var(--c-surface-2)' }} />
                </div>
              </div>
            ))
          ) : shown.length === 0 && !showRecoms ? (
            <p className="text-center py-10 text-sm font-medium" style={{ color: 'var(--c-text-3)' }}>{emptyLabel}</p>
          ) : (
            <>
              {showRecoms && (
                <div className="text-center pb-2 pt-3">
                  <p className="text-sm font-bold mb-4" style={{ color: 'var(--c-text-2)' }}>{emptyLabel}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-left px-3 mb-1" style={{ color: 'var(--c-text-3)' }}>Можливо, ви знайомі:</p>
                </div>
              )}
              {(showRecoms ? recoms : shown).map(p => (
                <div key={p.id} className="w-full block">
                  <PersonRow person={p} onNavigate={() => { handleNavigate('user', p.id); onClose(); }} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonRow({ person, onNavigate }) {
  const [following, setFollowing] = useState(person.is_following);
  
  const toggle = async (e) => {
    e.stopPropagation();
    const was = following;
    setFollowing(!was);
    try {
      const url = `${API_URL}/users/${person.id}/follow`;
      const res = await fetch(url, {
        method: was ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error();
      window.dispatchEvent(new Event('app:refresh'));
    } catch { 
      setFollowing(was);
      toast.error('Помилка дії'); 
    }
  };

  return (
    <div onClick={onNavigate}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-[var(--c-bg)] text-left cursor-pointer">
      <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
        {person.avatar_url 
          ? <img src={getImageUrl(person.avatar_url)} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full flex items-center justify-center bg-stone-200 text-xs font-bold text-stone-600">{person.username?.[0]?.toUpperCase()}</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate leading-snug" style={{ color:'var(--c-text)' }}>{person.username}</p>
        {person.bio && <p className="text-xs truncate" style={{ color:'var(--c-text-3)' }}>{person.bio}</p>}
      </div>
      <button onClick={toggle}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-all"
        style={following
          ? { background:'var(--c-bg)', border:'1px solid var(--c-border)', color:'var(--c-text-2)' }
          : { background:'var(--c-primary)', color:'#fff' }}>
        {following ? 'Підписані' : <><UserPlus className="w-3 h-3" />Стежити</>}
      </button>
    </div>
  );
}

function ReadingCard({ book, onNavigate }) {
  const pageCount = book.page_count || book.total_pages || 0;
  const currentPage = book.current_page || 0; 
  const pct = pageCount > 0 ? Math.round((currentPage / pageCount) * 100) : 0;
  return (
    <button onClick={() => onNavigate('book', book.id)}
      className="flex items-center gap-3 p-3 rounded-2xl text-left w-full transition-all hover:scale-[1.01]"
      style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)' }}>
      <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0" style={{ background:'var(--c-surface-2)' }}>
        {book.cover_url
          ? <img src={book.cover_url} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-4 h-4" style={{ color:'var(--c-text-3)' }} /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{book.title}</p>
        <p className="text-xs truncate mb-2" style={{ color:'var(--c-text-3)' }}>{book.authors?.join(', ') || book.author}</p>
        
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--c-bg)' }}>
          <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:'var(--c-primary)' }} />
        </div>
        
        <p className="text-[10px] mt-1" style={{ color:'var(--c-text-3)' }}>
          {pageCount > 0 ? (
            <>{pct}% · стор. {currentPage}/{pageCount}</>
          ) : (
            <>{currentPage > 0 ? `Прочитано сторінок: ${currentPage}` : 'Початок читання'}</>
          )}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color:'var(--c-text-3)' }} />
    </button>
  );
}

export default function ProfilePage({ handleNavigate, handleLogout, currentUser, isLoggedIn, openAuthModal }) {
  const [stats, setStats] = useState(null);
  const [reading, setReading] = useState([]);
  const [profile, setProfile] = useState(null);
  const [modal, setModal] = useState(null);

  const tok = () => localStorage.getItem('token');

  const fetchAll = useCallback(async () => {
    if (!currentUser) return;
    const h = { Authorization:`Bearer ${tok()}` };
    const [sR, pR, bR] = await Promise.allSettled([
      fetch(`${API_URL}/me/stats`,  { headers:h }),
      fetch(`${API_URL}/profile`,   { headers:h }),
      fetch(`${API_URL}/me/books`,  { headers:h }),
    ]);
    if (sR.status==='fulfilled' && sR.value.ok) setStats(await sR.value.json());
    if (pR.status==='fulfilled' && pR.value.ok) setProfile(await pR.value.json());
    if (bR.status==='fulfilled' && bR.value.ok) {
      const books = await bR.value.json();
      setReading((books || []).filter(b => b.status === 'reading').slice(0, 5));
    }
  }, [currentUser]);

  useEffect(() => { if (currentUser) fetchAll(); }, [currentUser, fetchAll]);

  if (!currentUser) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <BookOpen className="w-12 h-12" style={{ color:'var(--c-border)' }} />
      <h2 className="font-display font-bold text-xl">Мій профіль</h2>
      <p className="text-sm" style={{ color:'var(--c-text-3)' }}>Увійдіть, щоб переглянути профіль</p>
      {openAuthModal && <button onClick={() => openAuthModal('login')} className="px-6 py-2.5 rounded-full text-sm font-bold text-white" style={{ background:'var(--c-primary)' }}>Увійти</button>}
    </div>
  );

  const booksRead = stats?.books_read || 0;
  const followers = profile?.followers_count ?? stats?.followers_count ?? 0;
  const following = profile?.following_count ?? stats?.following_count ?? 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-10 page-enter space-y-5">
      <section className="flex flex-col items-center text-center gap-3 pt-2">
        <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold text-white shadow-lg"
          style={{ background: currentUser.avatar_url ? 'transparent' : 'var(--c-primary)' }}>
          {currentUser.avatar_url
            ? <img src={getImageUrl(currentUser.avatar_url)} className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} alt="" />
            : currentUser.username?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-2xl leading-tight truncate max-w-[200px]">{currentUser.username}</h1>
          {profile?.bio && <p className="text-sm mt-1 max-w-xs break-words" style={{ color:'var(--c-text-2)' }}>{profile.bio}</p>}
        </div>

        <div className="flex rounded-2xl overflow-hidden w-full max-w-xs" style={{ border:'1px solid var(--c-border)' }}>
          {[
            { v:followers, l:'Підписники', action:() => setModal('followers') },
            { v:following, l:'Підписки',  action:() => setModal('following') },
            { v:booksRead, l:'Прочитано',  action:null },
          ].map((s,i) => (
            <React.Fragment key={i}>
              {i>0 && <div style={{ width:1, background:'var(--c-border)' }} />}
              <button onClick={s.action || undefined}
                className={`flex-1 py-3 text-center ${s.action ? 'hover:bg-[var(--c-bg)] transition-colors cursor-pointer' : 'cursor-default'}`}>
                <p className="font-display font-bold text-xl leading-none">{s.v}</p>
                <p className="text-[10px] font-medium mt-1" style={{ color:'var(--c-text-3)' }}>{s.l}</p>
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          {currentUser?.role === 'admin' && (
            <button onClick={() => handleNavigate('admin')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold transition-colors text-white hover:opacity-90 shadow-sm"
              style={{ background: 'var(--c-primary)' }}>
              <Shield className="w-4 h-4" /> Панель адміністратора
            </button>
          )}

          <div className="flex gap-2 w-full">
            <button onClick={() => handleNavigate('settings')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold transition-colors hover:bg-[var(--c-surface-2)]"
              style={{ border:'1px solid var(--c-border)', color:'var(--c-text-2)' }}>
              <Settings className="w-4 h-4" /> Налаштування
            </button>
            <button onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-colors hover:bg-red-100"
              style={{ background:'#FEE2E2', color:'#B91C1C' }}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {reading.length > 0 && (
        <section>
          <h3 className="font-bold text-sm mb-3">Читаю зараз</h3>
          <div className="space-y-2">
            {reading.map(book => <ReadingCard key={book.id} book={book} onNavigate={handleNavigate} />)}
          </div>
        </section>
      )}

      {modal && <ConnectionsModal type={modal} userId={currentUser.id} onClose={() => setModal(null)} handleNavigate={handleNavigate} />}
    </main>
  );
}