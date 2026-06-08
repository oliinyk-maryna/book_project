import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Users, Search, UserPlus, UserCheck, Activity, Check, X, BookOpen, Clock } from 'lucide-react';
import { userApi } from '../api/user.api';
import toast from 'react-hot-toast';

/* ── Friend request card ────────────────────────────────────────── */
function RequestCard({ req, onAccept, onDecline }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background:'var(--c-accent-muted)', border:'1px solid #F5D9B4' }}>
      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white shrink-0"
        style={{ background:'var(--c-accent)' }}>
        {req.avatar_url ? <img src={req.avatar_url} className="w-full h-full object-cover" alt="" /> : req.username?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color:'var(--c-text)' }}>{req.username}</p>
        <p className="text-xs" style={{ color:'var(--c-text-3)' }}>хоче підписатися</p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button onClick={() => onAccept(req.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background:'var(--c-primary)' }}>
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDecline(req.id)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background:'var(--c-bg)', border:'1px solid var(--c-border)' }}>
          <X className="w-3.5 h-3.5" style={{ color:'var(--c-text-3)' }} />
        </button>
      </div>
    </div>
  );
}

/* ── Feed event ─────────────────────────────────────────────────── */
function FeedEvent({ event, handleNavigate }) {
  const icons = {
    started_reading: { emoji:'📖', verb:'починає читати' },
    finished:        { emoji:'🎉', verb:'прочитав(ла)' },
    reviewed:        { emoji:'⭐', verb:'залишив(ла) відгук на' },
    joined_club:     { emoji:'👥', verb:'приєднався до спільноти' },
    follow:          { emoji:'🤝', verb:'підписався(лась)' },
  };
  const info = icons[event.type] || { emoji:'📌', verb:'оновив(ла)' };

  return (
    <div className="flex items-start gap-3 py-4 px-4 rounded-3xl mb-2 transition-colors"
      style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)' }}>
      {/* Actor avatar */}
      <button onClick={() => event.actor_id && handleNavigate('user', event.actor_id)}
        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
        style={{ background:'var(--c-primary)' }}>
        {event.actor_avatar ? <img src={event.actor_avatar} className="w-full h-full object-cover" alt="" /> : event.actor_name?.[0]?.toUpperCase()}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color:'var(--c-text-2)' }}>
          <button onClick={() => handleNavigate('user', event.actor_id)}
            className="font-bold hover:underline" style={{ color:'var(--c-text)' }}>{event.actor_name}</button>
          {' '}<span>{info.verb}</span>
          {event.book_title && (
            <button onClick={() => event.work_id && handleNavigate('book', event.work_id)}
              className="font-bold ml-1 hover:underline" style={{ color:'var(--c-primary)' }}>«{event.book_title}»</button>
          )}
          {event.club_name && <span className="font-bold ml-1" style={{ color:'var(--c-text)' }}>«{event.club_name}»</span>}
        </p>
        <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color:'var(--c-text-3)' }}>
          <Clock className="w-3 h-3" />
          {new Date(event.created_at).toLocaleDateString('uk-UA', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })}
        </p>
        {event.review_text && (
          <p className="text-xs mt-2 px-3 py-2 rounded-xl italic leading-relaxed" style={{ background:'var(--c-bg)', color:'var(--c-text-2)' }}>
            «{event.review_text.slice(0, 120)}{event.review_text.length > 120 ? '...' : ''}»
          </p>
        )}
      </div>

      {event.book_cover && (
        <img src={event.book_cover} alt="" className="w-10 h-14 rounded-xl object-cover shrink-0" style={{ border:'1px solid var(--c-border)' }}
          onError={e => e.target.style.display='none'} />
      )}
    </div>
  );
}

/* ── People list ────────────────────────────────────────────────── */
function PersonCard({ person, handleNavigate }) {
  const [following, setFollowing] = useState(person.is_following);
  const toggle = async () => {
    const was = following;
    setFollowing(!was);
    try {
      was ? await userApi.unfollow(person.id) : await userApi.follow(person.id);
      toast.success(was ? 'Відписано' : 'Підписано!');
    } catch { setFollowing(was); }
  };
  return (
    <div className="flex items-center gap-3 px-1 py-2.5" style={{ borderBottom:'1px solid var(--c-border-2)' }}>
      <button onClick={() => handleNavigate('user', person.id)}
        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background:'var(--c-primary)' }}>
        {person.avatar_url ? <img src={person.avatar_url} className="w-full h-full object-cover" alt="" /> : person.username?.[0]?.toUpperCase()}
      </button>
      <div className="flex-1 min-w-0" onClick={() => handleNavigate('user', person.id)} style={{ cursor:'pointer' }}>
        <p className="text-sm font-bold truncate" style={{ color:'var(--c-text)' }}>{person.username}</p>
        {person.bio && <p className="text-xs truncate" style={{ color:'var(--c-text-3)' }}>{person.bio}</p>}
      </div>
      <button onClick={toggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all"
        style={following
          ? { background:'var(--c-bg)', border:'1px solid var(--c-border)', color:'var(--c-text-2)' }
          : { background:'var(--c-primary)', color:'#fff' }}>
        {following ? <><UserCheck className="w-3 h-3" /> Підписані</> : <><UserPlus className="w-3 h-3" /> Підписатись</>}
      </button>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────── */
export default function FeedPage({ isLoggedIn, currentUser, handleNavigate, openAuthModal }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'feed';

  const [feed, setFeed]         = useState([]);
  const [people, setPeople]     = useState([]);
  const [requests, setRequests] = useState([]);
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(true);
  const searchRef               = useRef(null);

  const load = async () => {
    if (!isLoggedIn) { setLoading(false); return; }
    setLoading(true);
    try {
      if (activeTab === 'feed') {
        const [f, r] = await Promise.all([userApi.getFeed(), userApi.getFriendRequests()]);
        setFeed(f || []);
        setRequests(r || []);
      } else if (activeTab === 'search' && query.length >= 2) {
        setPeople(await userApi.searchUsers(query) || []);
      } else if (activeTab !== 'search') {
        setPeople(await userApi.getProfileConnections(activeTab) || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeTab, isLoggedIn]);
  useEffect(() => {
    if (activeTab !== 'search') return;
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [query]);

  const handleAccept  = async (id) => { await userApi.acceptFriendRequest(id);  setRequests(r => r.filter(x => x.id !== id)); toast.success('Запит прийнято!'); };
  const handleDecline = async (id) => { await userApi.declineFriendRequest(id); setRequests(r => r.filter(x => x.id !== id)); };

  const tabs = [
    { id:'feed',      label:'Стрічка' },
    { id:'search',    label:'Пошук людей' },
    { id:'followers', label:'Підписники' },
    { id:'following', label:'Підписки' },
  ];

  if (!isLoggedIn) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
      <Users className="w-12 h-12" style={{ color:'var(--c-border)' }} />
      <h2 className="font-display font-bold text-xl text-center" style={{ color:'var(--c-text)' }}>Соціальна стрічка</h2>
      <p className="text-sm text-center" style={{ color:'var(--c-text-3)' }}>Увійдіть, щоб бачити активність друзів</p>
      <button onClick={() => openAuthModal('login')} className="px-6 py-2.5 rounded-full text-sm font-bold text-white" style={{ background:'var(--c-primary)' }}>Увійти</button>
    </div>
  );

  return (
    <main className="max-w-2xl mx-auto px-4 py-5 page-enter">
      <h1 className="font-display font-bold text-2xl mb-5" style={{ color:'var(--c-text)' }}>Спільнота</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setSearchParams({ tab: t.id })}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-all"
            style={activeTab===t.id
              ? { background:'var(--c-primary)', color:'#fff' }
              : { background:'var(--c-surface)', color:'var(--c-text-2)', border:'1px solid var(--c-border)' }}>
            {t.label}
            {t.id==='feed' && requests.length>0 && (
              <span className="ml-1.5 w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px]"
                style={{ background:'var(--c-accent)', color:'#fff' }}>{requests.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search bar */}
      {activeTab === 'search' && (
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:'var(--c-text-3)' }} />
          <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Пошук за ніком або ім'ям..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm outline-none"
            style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', color:'var(--c-text)' }}
            autoFocus />
        </div>
      )}

      {/* Pending requests */}
      {activeTab === 'feed' && requests.length > 0 && (
        <div className="mb-4 space-y-2">
          {requests.map(r => <RequestCard key={r.id} req={r} onAccept={handleAccept} onDecline={handleDecline} />)}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({length:4}).map((_,i) => (
            <div key={i} className="h-20 rounded-3xl animate-pulse" style={{ background:'var(--c-surface)' }} />
          ))}
        </div>
      ) : activeTab === 'feed' ? (
        feed.length > 0
          ? feed.map(e => <FeedEvent key={e.id} event={e} handleNavigate={handleNavigate} />)
          : <div className="text-center py-16"><Activity className="w-8 h-8 mx-auto mb-2" style={{ color:'var(--c-border)' }} /><p className="text-sm" style={{ color:'var(--c-text-3)' }}>Підпишіться на когось, щоб бачити їх активність</p></div>
      ) : (
        people.length > 0 ? (
          <div className="rounded-3xl px-3" style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)' }}>
            {people.map(p => <PersonCard key={p.id} person={p} handleNavigate={handleNavigate} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="w-8 h-8 mx-auto mb-2" style={{ color:'var(--c-border)' }} />
            <p className="text-sm" style={{ color:'var(--c-text-3)' }}>{activeTab==='search' && query.length < 2 ? 'Введіть мінімум 2 символи' : 'Нікого не знайдено'}</p>
          </div>
        )
      )}
    </main>
  );
}