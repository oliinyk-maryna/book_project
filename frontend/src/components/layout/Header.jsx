import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, Settings, Shield, LogOut, X, BookOpen, User } from 'lucide-react';
import { booksApi } from '../../api/books.api';
import { userApi } from '../../api/user.api';
import { getAuthorsString } from '../../utils/helpers';

// ── Пошук ─────────────────────────────────────────────────────────────────────
function SearchBar({ onNavigate }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await booksApi.search(query);
        setResults((data || []).slice(0, 7));
      } catch {}
      finally { setLoading(false); }
    }, 350);
  }, [query]);

  const go = (book) => {
    setQuery(''); setOpen(false); setResults([]);
    onNavigate('book', book.id);
  };

  return (
    <div ref={wrapRef} className="relative hidden sm:block w-64 lg:w-96">
      <div className={`flex items-center gap-2 bg-stone-100 rounded-full px-4 py-2 transition-all ${open ? 'ring-2 ring-[#2C5234]/30' : ''}`}>
        <Search className="w-4 h-4 text-stone-400 shrink-0" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Пошук книг та авторів..."
          className="bg-transparent text-sm outline-none w-full text-stone-800 placeholder:text-stone-400"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }}>
            <X className="w-3.5 h-3.5 text-stone-400" />
          </button>
        )}
      </div>

      {open && (query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-stone-400">Шукаємо...</div>
          ) : results.length > 0 ? (
            results.map(book => (
              <button key={book.id} onClick={() => go(book)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left">
                <div className="w-8 h-12 bg-stone-100 rounded overflow-hidden shrink-0">
                  {book.cover_url
                    ? <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-3.5 h-3.5 text-stone-400" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{book.title}</p>
                  <p className="text-xs text-stone-400 truncate">{getAuthorsString(book)}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-stone-400">Нічого не знайдено</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Сповіщення ────────────────────────────────────────────────────────────────
function NotificationDropdown({ isLoggedIn }) {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const load = async () => {
      try {
        const data = await userApi.getNotifications();
        if (data) { setNotifs(data.notifications || []); setUnread(data.unread_count || 0); }
      } catch {}
    };
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [isLoggedIn]);

  const markAll = async () => {
    await userApi.markAllRead().catch(() => {});
    setUnread(0);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const TYPE_ICONS = { club_invite: '📚', friend_request: '👤', review_like: '❤️', milestone: '🎯', default: '🔔' };

  if (!isLoggedIn) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-stone-100 transition-colors">
        <Bell className="w-5 h-5 text-stone-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <span className="font-bold text-stone-900 text-sm">Сповіщення</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-[#2C5234] font-semibold">Всі прочитані</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm">Немає сповіщень</div>
            ) : notifs.map(n => (
              <div key={n.id} className={`px-4 py-3 border-b border-stone-50 last:border-0 ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                <div className="flex gap-3">
                  <span className="text-lg shrink-0">{TYPE_ICONS[n.type] || TYPE_ICONS.default}</span>
                  <div className="flex-1 min-w-0">
                    {n.title && <p className="text-sm font-semibold text-stone-900 leading-tight">{n.title}</p>}
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.body}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Профіль-дропдаун ─────────────────────────────────────────────────────────
function UserDropdown({ user, onLogout, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initials = user.username?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full hover:bg-stone-100 pl-1 pr-2 py-1 transition-colors">
        <div className="w-8 h-8 rounded-full bg-[#2C5234] text-white text-xs font-bold flex items-center justify-center overflow-hidden">
          {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
        </div>
        <span className="text-sm font-semibold text-stone-800 hidden sm:block max-w-24 truncate">{user.username}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 overflow-hidden animate-in zoom-in-95 duration-100">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="font-bold text-stone-900 text-sm truncate">{user.username}</p>
            <p className="text-xs text-stone-400 truncate">{user.email}</p>
          </div>
          <div className="p-1.5 space-y-0.5">
            <button onClick={() => { setOpen(false); onNavigate('profile'); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors">
              <User className="w-4 h-4" /> Мій профіль
            </button>
            <button onClick={() => { setOpen(false); onNavigate('settings'); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-colors">
              <Settings className="w-4 h-4" /> Налаштування
            </button>
            {user.role === 'admin' && (
              <button onClick={() => { setOpen(false); onNavigate('admin'); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-amber-600 hover:bg-amber-50 transition-colors">
                <Shield className="w-4 h-4" /> Адмін-панель
              </button>
            )}
            <div className="h-px bg-stone-100 my-1" />
            <button onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" /> Вийти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ user, isLoggedIn, onNavigate, onLogout, onOpenAuth }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-stone-200 z-40">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 gap-4">
        {/* Логотип */}
        <button onClick={() => onNavigate('home')}
          className="font-serif font-extrabold text-xl text-[#2C5234] tracking-tight shrink-0 select-none hover:opacity-80 transition-opacity">
          ReadLounge
        </button>

        {/* Пошук */}
        <SearchBar onNavigate={onNavigate} />

        {/* Права частина */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationDropdown isLoggedIn={isLoggedIn} />
          {isLoggedIn && user ? (
            <UserDropdown user={user} onLogout={onLogout} onNavigate={onNavigate} />
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => onOpenAuth('login')}
                className="text-sm font-semibold text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                Увійти
              </button>
              <button onClick={() => onOpenAuth('register')}
                className="text-sm font-bold text-white bg-[#2C5234] px-4 py-1.5 rounded-full hover:bg-[#1f3a25] transition-colors shadow-sm">
                Реєстрація
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}