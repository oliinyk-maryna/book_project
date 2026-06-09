import React, { useState, useEffect, useCallback } from 'react';
import { Settings, LogOut, Edit2, Check, Target, BookOpen, Users, X, ChevronRight, UserPlus, Search, Shield } from 'lucide-react';
import { API_URL } from '../config';
import { userApi } from '../api/user.api';
import toast from 'react-hot-toast';

/* ── Модалка підписники/підписки з точним запитом до бекенду ─────── */
function ConnectionsModal({ type, currentUserId, onClose, handleNavigate }) {
  const [people, setPeople]     = useState([]);
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(true);
  const title = type === 'followers' ? 'Підписники' : 'Підписки';

  const loadConnections = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // Змінено на ${API_URL}/users/... щоб уникнути дублювання /api/api
      const res = await fetch(`${API_URL}/users/${currentUserId}/${type}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Гнучка перевірка структури відповіді бекенду
        setPeople(Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []));
      } else {
        setPeople([]);
      }
    } catch { 
      setPeople([]); 
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUserId) {
      loadConnections();
    }
  }, [type, currentUserId]);

  // Локальний пошук серед отриманого списку
  const filteredPeople = people.filter(p => 
    p.username?.toLowerCase().includes(query.toLowerCase())
  );

  const shown = query.trim().length > 0 ? filteredPeople : people;
  const emptyLabel = query.trim().length > 0 ? 'Нікого не знайдено' :
    type === 'followers' ? 'Ще немає підписників' : 'Ви ще ні на кого не підписані';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-t-3xl md:rounded-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid var(--c-border)' }}>
          <h3 className="font-bold text-base">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full" style={{ background:'var(--c-bg)' }}><X className="w-4 h-4" /></button>
        </div>

        {/* Пошук */}
        <div className="px-4 py-3" style={{ borderBottom:'1px solid var(--c-border-2)' }}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--c-text-3)' }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Пошук серед списку..."
              className="w-full pl-8 pr-4 py-2 rounded-xl text-sm outline-none"
              style={{ background:'var(--c-bg)', border:'1px solid var(--c-border)', color:'var(--c-text)' }} />
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-3 space-y-0.5">
          {loading ? (
            Array.from({length:4}).map((_,i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                <div className="w-9 h-9 rounded-full" style={{ background:'var(--c-surface-2)' }} />
                <div className="h-3 rounded w-32" style={{ background:'var(--c-surface-2)' }} />
              </div>
            ))
          ) : shown.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color:'var(--c-text-3)' }}>{emptyLabel}</p>
          ) : shown.map(p => {
            // Безпечно витягуємо будь-який можливий ID користувача з бази даних
            const targetId = p.id || p.user_id || p.follower_id || p.following_id;
            return (
              <div key={targetId || Math.random()} onClick={() => { if(targetId) { handleNavigate('user', targetId); onClose(); } }} 
                   className="w-full block cursor-pointer">
                 <PersonRow person={p} onNavigate={() => { if(targetId) { handleNavigate('user', targetId); onClose(); } }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PersonRow({ person, onNavigate }) {
  const [following, setFollowing] = useState(person.is_following);
  const targetId = person.id || person.user_id || person.follower_id || person.following_id;

  const toggle = async (e) => {
    e.stopPropagation();
    if (!targetId) return; // Захист від undefined запитів
    
    const was = following;
    setFollowing(!was);
    try {
      const method = was ? 'DELETE' : 'POST';
      // Використовуємо ${API_URL}/users/... без зайвого другого префіксу /api
      const res = await fetch(`${API_URL}/users/${targetId}/follow`, {
        method: method,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) setFollowing(was);
    } catch { setFollowing(was); }
  };

  return (
    <div onClick={onNavigate}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors hover:bg-[var(--c-bg)] text-left cursor-pointer">
      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background:'var(--c-primary)' }}>
        {person.avatar_url ? <img src={person.avatar_url} className="w-full h-full object-cover" alt="" onError={e=>e.target.style.display='none'} /> : person.username?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{person.username}</p>
        {person.bio && <p className="text-xs truncate" style={{ color:'var(--c-text-3)' }}>{person.bio}</p>}
      </div>
      <button onClick={toggle}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all"
        style={following
          ? { background:'var(--c-bg)', border:'1px solid var(--c-border)', color:'var(--c-text-2)' }
          : { background:'var(--c-primary)', color:'#fff' }}>
        {following ? 'Підписані' : <><UserPlus className="w-3 h-3" />Стежити</>}
      </button>
    </div>
  );
}
/* ── Картка книги що читається ─────────────────────────────────── */
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
        
        {/* Рядок прогресу */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--c-bg)' }}>
          <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:'var(--c-primary)' }} />
        </div>
        
        {/* Текст прогресу: відображаємо сторінки, тільки якщо вони відомі */}
        <p className="text-[10px] mt-1" style={{ color:'var:' }}>
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

/* ── Main ───────────────────────────────────────────────────────── */
export default function ProfilePage({ handleNavigate, handleLogout, currentUser, isLoggedIn, openAuthModal }) {
  const [stats, setStats]           = useState(null);
  const [goal, setGoal]             = useState(null);
  const [reading, setReading]       = useState([]);
  const [profile, setProfile]       = useState(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [tempGoal, setTempGoal]     = useState('');
  const [modal, setModal]           = useState(null);

  const tok = () => localStorage.getItem('token');

  const fetchAll = useCallback(async () => {
    if (!currentUser) return;
    const h = { Authorization:`Bearer ${tok()}` };
    const [sR, gR, pR, bR] = await Promise.allSettled([
      fetch(`${API_URL}/me/stats`,  { headers:h }),
      fetch(`${API_URL}/me/goals`,  { headers:h }),
      fetch(`${API_URL}/profile`,   { headers:h }),
      fetch(`${API_URL}/me/books`,  { headers:h }),
    ]);
    if (sR.status==='fulfilled' && sR.value.ok) setStats(await sR.value.json());
    if (gR.status==='fulfilled' && gR.value.ok) setGoal(await gR.value.json());
    if (pR.status==='fulfilled' && pR.value.ok) setProfile(await pR.value.json());
    if (bR.status==='fulfilled' && bR.value.ok) {
      const books = await bR.value.json();
      setReading((books || []).filter(b => b.status === 'reading').slice(0, 5));
    }
  }, [currentUser]);

  useEffect(() => { if (currentUser) fetchAll(); }, [currentUser, fetchAll]);

  const saveGoal = async () => {
    const target = parseInt(tempGoal);
    if (isNaN(target) || target <= 0) { setEditingGoal(false); return; }
    await fetch(`${API_URL}/me/goals`, {
      method:'POST',
      headers: { Authorization:`Bearer ${tok()}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ target_books:target, goal_year:new Date().getFullYear() }),
    });
    setEditingGoal(false);
    fetchAll();
    toast.success('Ціль збережено!');
  };

  if (!currentUser) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <BookOpen className="w-12 h-12" style={{ color:'var(--c-border)' }} />
      <h2 className="font-display font-bold text-xl">Мій профіль</h2>
      <p className="text-sm" style={{ color:'var(--c-text-3)' }}>Увійдіть, щоб переглянути профіль</p>
      {openAuthModal && <button onClick={() => openAuthModal('login')} className="px-6 py-2.5 rounded-full text-sm font-bold text-white" style={{ background:'var(--c-primary)' }}>Увійти</button>}
    </div>
  );

  const booksRead   = stats?.books_read || 0;
  const targetBooks = goal?.target_books || 0;
  const goalPct     = targetBooks > 0 ? Math.min(100, Math.round((booksRead / targetBooks) * 100)) : 0;
  const followers   = profile?.followers_count ?? stats?.followers_count ?? 0;
  const following   = profile?.following_count  ?? stats?.following_count  ?? 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-10 page-enter space-y-5">

      {/* Avatar + name */}
      <section className="flex flex-col items-center text-center gap-3 pt-2">
        <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold text-white shadow-lg"
          style={{ background: currentUser.avatar_url ? 'transparent' : 'var(--c-primary)' }}>
          {currentUser.avatar_url
            ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" onError={e=>e.target.style.display='none'} alt="" />
            : currentUser.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl leading-tight">{currentUser.username}</h1>
          {profile?.bio && <p className="text-sm mt-1 max-w-xs" style={{ color:'var(--c-text-2)' }}>{profile.bio}</p>}
        </div>

        {/* Stats row */}
        <div className="flex rounded-2xl overflow-hidden w-full max-w-xs" style={{ border:'1px solid var(--c-border)' }}>
          {[
            { v:followers, l:'Підписники', action:() => setModal('followers') },
            { v:following, l:'Підписки',   action:() => setModal('following') },
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

        {/* Actions Container */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {/* Відображається тільки якщо роль користувача 'admin' */}
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

      {/* Читаю зараз */}
      {reading.length > 0 && (
        <section>
          <h3 className="font-bold text-sm mb-3">Читаю зараз</h3>
          <div className="space-y-2">
            {reading.map(book => <ReadingCard key={book.id} book={book} onNavigate={handleNavigate} />)}
          </div>
        </section>
      )}

      {/* Читацький виклик */}
      <section className="rounded-3xl p-5" style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color:'var(--c-primary)' }} />
            <h3 className="font-bold text-sm">Виклик {new Date().getFullYear()}</h3>
          </div>
          {editingGoal ? (
            <div className="flex items-center gap-2">
              <input type="number" autoFocus value={tempGoal} onChange={e=>setTempGoal(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&saveGoal()}
                placeholder="К-сть" className="w-20 px-2 py-1 text-center rounded-xl text-sm font-bold outline-none"
                style={{ border:'1px solid var(--c-primary)', color:'var(--c-primary)', background:'var(--c-primary-muted)' }} />
              <button onClick={saveGoal} className="w-7 h-7 rounded-xl flex items-center justify-center text-white" style={{ background:'var(--c-primary)' }}>
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => { setTempGoal(targetBooks||''); setEditingGoal(true); }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
              style={{ color:'var(--c-text-2)', border:'1px solid var(--c-border)' }}>
              <Edit2 className="w-3 h-3" /> Змінити
            </button>
          )}
        </div>
        {targetBooks > 0 ? (
          <>
            <p className="text-xs mb-2" style={{ color:'var(--c-text-3)' }}>{booksRead} з {targetBooks} книг · {goalPct}%</p>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background:'var(--c-bg)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width:`${goalPct}%`, background:'var(--c-primary)' }} />
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color:'var(--c-text-3)' }}>Поставте ціль на рік 📚</p>
        )}
      </section>

      {modal && <ConnectionsModal type={modal} currentUserId={currentUser?.id} onClose={() => setModal(null)} handleNavigate={handleNavigate} />}
    </main>
  );
}