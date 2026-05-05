import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Bookmark, CheckCircle2, XCircle, Plus, Clock,
  Play, Pause, Square, ChevronRight, Tag, Trash2, Loader2
} from 'lucide-react';
import { userApi } from '../api/user.api';
import { BOOK_STATUSES } from '../utils/constants';
import { getAuthorsString } from '../utils/helpers';
import { Modal, Button, Loader } from '../components/ui';

// ── Таймер читання ─────────────────────────────────────────────────────────────
function ReadingTimer({ book, onClose, onSaved }) {
  const [running, setRunning]     = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [startPage, setStartPage] = useState(book.current_page || 0);
  const [endPage, setEndPage]     = useState('');
  const [saving, setSaving]       = useState(false);
  const intervalRef = useRef(null);
  const startTime   = useRef(null);

  const toggle = () => {
    if (running) {
      clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      if (!startTime.current) startTime.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
      }, 1000);
      setRunning(true);
    }
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false); setElapsed(0);
    startTime.current = null;
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const save = async () => {
    const ep = parseInt(endPage);
    if (!ep || ep <= startPage) { alert('Вкажіть коректну кінцеву сторінку'); return; }
    setSaving(true);
    try {
      await userApi.addSession(book.id, {
        duration_seconds: elapsed,
        pages_read: ep - startPage,
        start_page: startPage,
        end_page: ep,
      });
      await userApi.updateProgress(book.id, { current_page: ep, status: 'reading' });
      onSaved?.();
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const fmtTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5">
      {/* Обкладинка */}
      <div className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3">
        <div className="w-12 h-16 bg-zinc-200 rounded-lg overflow-hidden shrink-0 shadow-sm">
          {book.cover_url ? <img src={book.cover_url} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-full h-full p-2 text-zinc-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-900 truncate">{book.title}</p>
          <p className="text-xs text-zinc-500">{getAuthorsString(book)}</p>
        </div>
      </div>

      {/* Таймер */}
      <div className="text-center">
        <div className={`text-5xl font-black font-mono tracking-tighter mb-4 transition-colors ${running ? 'text-[#2C5234]' : 'text-zinc-800'}`}>
          {fmtTime(elapsed)}
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={toggle}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${running ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-[#2C5234] text-white hover:bg-[#1f3a25]'}`}>
            {running ? <><Pause className="w-4 h-4" /> Пауза</> : <><Play className="w-4 h-4" /> {elapsed > 0 ? 'Продовжити' : 'Старт'}</>}
          </button>
          {elapsed > 0 && (
            <button onClick={reset} className="p-3 bg-zinc-100 rounded-2xl text-zinc-500 hover:bg-zinc-200 transition-colors">
              <Square className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Сторінки */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1.5">Почали з сторінки</label>
          <input type="number" value={startPage} onChange={e => setStartPage(+e.target.value)} min={0}
            className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2C5234]" />
        </div>
        <div>
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1.5">Зупинились на</label>
          <input type="number" value={endPage} onChange={e => setEndPage(e.target.value)} min={startPage + 1}
            placeholder={`${startPage + 1}+`}
            className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2C5234]" />
        </div>
      </div>

      {elapsed > 0 && endPage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
          <p className="font-semibold">📖 Підсумок сесії:</p>
          <p>{fmtTime(elapsed)} читання · {Math.max(0, parseInt(endPage) - startPage)} сторінок</p>
        </div>
      )}

      <Button onClick={save} isLoading={saving} disabled={!endPage || parseInt(endPage) <= startPage} className="w-full" icon={CheckCircle2}>
        Зберегти сесію
      </Button>
    </div>
  );
}

// ── Карточка книги на полиці ───────────────────────────────────────────────────
function ShelfBookCard({ book, onNavigate, onStartReading, onChangeStatus, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isReading = book.status === 'reading';
  const progress = book.total_pages > 0
    ? Math.round((book.current_page / book.total_pages) * 100)
    : 0;

  return (
    <div className="flex gap-3 p-3 bg-white rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors group">
      <div onClick={() => onNavigate('book', book.id)}
        className="w-14 h-20 bg-zinc-100 rounded-lg overflow-hidden shrink-0 cursor-pointer shadow-sm">
        {book.cover_url
          ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-5 h-5 text-zinc-300" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p onClick={() => onNavigate('book', book.id)}
          className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-tight cursor-pointer hover:text-[#2C5234] transition-colors mb-0.5">
          {book.title}
        </p>
        <p className="text-xs text-zinc-500 truncate mb-2">{getAuthorsString(book)}</p>
        {isReading && book.total_pages > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
              <span>стор. {book.current_page || 0}</span>
              <span>{progress}% · {book.total_pages} стор.</span>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#2C5234] rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {isReading && (
          <button onClick={() => onStartReading(book)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#2C5234] bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
            <Clock className="w-3.5 h-3.5" /> Читати зараз
          </button>
        )}
      </div>
      {/* Меню */}
      <div className="relative shrink-0">
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-0 bg-white border border-zinc-200 rounded-xl shadow-xl z-10 w-40 overflow-hidden"
            onMouseLeave={() => setMenuOpen(false)}>
            {Object.entries(BOOK_STATUSES).map(([key, { label }]) => (
              <button key={key} onClick={() => { onChangeStatus(book.id, key); setMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 transition-colors ${book.status === key ? 'font-bold text-[#2C5234]' : 'text-zinc-600'}`}>
                {label}
              </button>
            ))}
            <div className="border-t border-zinc-100 mx-2 my-1" />
            <button onClick={() => { onRemove(book.id); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-1.5 transition-colors">
              <Trash2 className="w-3 h-3" /> Видалити
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Кастомні полиці ───────────────────────────────────────────────────────────
function CustomShelvesPanel({ onNavigate }) {
  const [shelves, setShelves]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName]         = useState('');
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    const data = await userApi.getShelves().catch(() => []);
    setShelves(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await userApi.createShelf({ name, is_public: false }).catch(() => {});
    await load();
    setName(''); setShowForm(false); setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Видалити полицю?')) return;
    await userApi.deleteShelf(id).catch(() => {});
    await load();
  };

  if (loading) return <div className="h-24 bg-zinc-100 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-2">
      {shelves.map(s => (
        <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-zinc-100">
          <Tag className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className="flex-1 text-sm font-medium text-zinc-800">{s.name}</span>
          <span className="text-xs text-zinc-400">{s.books_count || 0} кн.</span>
          <button onClick={() => remove(s.id)} className="p-1 text-zinc-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {showForm ? (
        <div className="flex gap-2">
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setShowForm(false); }}
            placeholder="Назва полиці..."
            className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2C5234]" />
          <Button onClick={create} isLoading={saving} disabled={!name.trim()} className="shrink-0">Зберегти</Button>
          <Button variant="outline" onClick={() => setShowForm(false)} className="shrink-0">×</Button>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-zinc-200 rounded-xl text-xs font-semibold text-zinc-400 hover:border-[#2C5234] hover:text-[#2C5234] transition-colors">
          <Plus className="w-3.5 h-3.5" /> Нова кастомна полиця
        </button>
      )}
    </div>
  );
}

// ── Головна бібліотека ────────────────────────────────────────────────────────
export default function LibraryPage({ onNavigate, isLoggedIn, openAuth }) {
  const [allBooks, setAllBooks]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('reading');
  const [timerBook, setTimerBook]   = useState(null);
  const [showShelves, setShowShelves] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await userApi.getBooks().catch(() => []);
    setAllBooks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    load();
  }, [isLoggedIn, load]);

  const changeStatus = async (bookId, status) => {
    await userApi.updateBook(bookId, { status }).catch(() => {});
    setAllBooks(prev => prev.map(b => b.id === bookId ? {...b, status} : b));
  };

  const removeBook = async (bookId) => {
    if (!confirm('Видалити книгу з полиці?')) return;
    await userApi.removeBook(bookId).catch(() => {});
    setAllBooks(prev => prev.filter(b => b.id !== bookId));
  };

  if (!isLoggedIn) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-5">
      <BookOpen className="w-16 h-16 text-zinc-200" />
      <h2 className="text-xl font-bold text-zinc-800">Ваша бібліотека</h2>
      <p className="text-zinc-500 text-center text-sm">Увійдіть, щоб бачити ваші книги та відстежувати прогрес читання</p>
      <Button onClick={() => openAuth?.('login')}>Увійти</Button>
    </div>
  );

  const TABS = [
    { id: 'reading',  label: 'Читаю',     icon: BookOpen,      color: 'text-blue-600' },
    { id: 'planned',  label: 'В планах',  icon: Bookmark,      color: 'text-zinc-600' },
    { id: 'finished', label: 'Прочитано', icon: CheckCircle2,  color: 'text-emerald-600' },
    { id: 'dropped',  label: 'Покинуто',  icon: XCircle,       color: 'text-red-500' },
  ];

  const filtered = allBooks.filter(b => b.status === activeTab);
  const counts   = TABS.reduce((a, t) => ({ ...a, [t.id]: allBooks.filter(b => b.status === t.id).length }), {});

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <Modal isOpen={!!timerBook} onClose={() => setTimerBook(null)} title="Сесія читання">
        {timerBook && <ReadingTimer book={timerBook} onClose={() => setTimerBook(null)} onSaved={load} />}
      </Modal>

      {/* Заголовок */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-zinc-900">Моя бібліотека</h1>
        <button onClick={() => setShowShelves(!showShelves)}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 bg-zinc-100 px-3 py-2 rounded-full hover:bg-zinc-200 transition-colors">
          <Tag className="w-3.5 h-3.5" /> Полиці
        </button>
      </div>

      {/* Кастомні полиці */}
      {showShelves && (
        <div className="px-5 mb-5">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">Кастомні полиці</h2>
          <CustomShelvesPanel onNavigate={onNavigate} />
        </div>
      )}

      {/* Вкладки */}
      <div className="flex border-b border-zinc-100 px-2 mb-4 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.id ? 'border-[#2C5234] text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}>
            <t.icon className={`w-3.5 h-3.5 ${activeTab === t.id ? t.color : 'text-zinc-300'}`} />
            {t.label}
            {counts[t.id] > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-100 text-zinc-400'}`}>
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Книги */}
      <div className="px-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-14 h-20 bg-zinc-100 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-zinc-100 rounded w-3/4" />
                  <div className="h-3 bg-zinc-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
            {React.createElement(TABS.find(t => t.id === activeTab)?.icon || BookOpen, { className: 'w-10 h-10 text-zinc-200 mx-auto mb-3' })}
            <p className="text-zinc-400 text-sm">Тут поки порожньо</p>
            <button onClick={() => onNavigate('discover')} className="mt-2 text-sm text-[#2C5234] font-semibold hover:underline">
              Знайти книги →
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(book => (
              <ShelfBookCard
                key={book.id}
                book={book}
                onNavigate={onNavigate}
                onStartReading={setTimerBook}
                onChangeStatus={changeStatus}
                onRemove={removeBook}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}