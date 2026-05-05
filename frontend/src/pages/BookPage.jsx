import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft, Star, BookOpen, Users, Plus, ChevronDown,
  MessageSquare, Quote, Heart, Lock, Unlock,
  Loader2, Check, ThumbsUp, Eye, EyeOff, AlertTriangle, Send
} from 'lucide-react';
import { booksApi } from '../api/books.api';
import { clubsApi } from '../api/clubs.api';
import { userApi } from '../api/user.api';
import { BOOK_STATUSES, CLUB_STATUSES } from '../utils/constants';
import { getAuthorsString } from '../utils/helpers';
import { Loader, Modal, Button } from '../components/ui';

// ── Бейдж статусу ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  planned:  'bg-zinc-100 text-zinc-700',
  reading:  'bg-blue-50 text-blue-700',
  finished: 'bg-emerald-50 text-emerald-700',
  dropped:  'bg-red-50 text-red-600',
};
const STATUS_LABELS = {
  planned: 'В планах', reading: 'Читаю', finished: 'Прочитано', dropped: 'Покинуто',
};

// ── Кнопка додавання/зміни статусу ───────────────────────────────────────────
function ShelfButton({ bookId, initialStatus, isLoggedIn, openAuth, onStatusChange }) {
  const [status, setStatus]     = useState(initialStatus || null);
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [removing, setRemoving] = useState(false);

  const changeStatus = async (newStatus) => {
    if (!isLoggedIn) { openAuth?.('login'); return; }
    setSaving(true); setOpen(false);
    try {
      await userApi.updateBook(bookId, { status: newStatus });
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    } catch {}
    finally { setSaving(false); }
  };

  const addToShelf = async () => {
    if (!isLoggedIn) { openAuth?.('login'); return; }
    setSaving(true);
    try {
      await userApi.addBook({ book: { id: bookId }, status: 'planned' });
      setStatus('planned');
      onStatusChange?.('planned');
    } catch {}
    finally { setSaving(false); }
  };

  const removeFromShelf = async () => {
    if (!confirm('Видалити книгу з полиці?')) return;
    setRemoving(true);
    try {
      await userApi.removeBook(bookId);
      setStatus(null);
      onStatusChange?.(null);
    } catch {}
    finally { setRemoving(false); }
  };

  if (status) {
    const st = STATUS_STYLES[status] || 'bg-zinc-100 text-zinc-700';
    return (
      <div className="relative">
        <button onClick={() => setOpen(!open)} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${st} hover:brightness-95`}>
          <Check className="w-4 h-4" />
          {STATUS_LABELS[status] || status}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute left-0 top-full mt-1.5 bg-white border border-zinc-200 rounded-2xl shadow-xl z-20 overflow-hidden w-52">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => changeStatus(key)}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-zinc-50 transition-colors flex items-center justify-between ${status === key ? 'text-[#2C5234] font-semibold' : 'text-zinc-700'}`}>
                {label}
                {status === key && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
            <div className="border-t border-zinc-100 mx-3 my-1" />
            <button onClick={removeFromShelf} disabled={removing}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
              {removing ? 'Видалення...' : 'Видалити з полиці'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button onClick={addToShelf} disabled={saving}
      className="flex items-center gap-2 px-5 py-2.5 bg-[#2C5234] text-white rounded-xl font-semibold text-sm hover:bg-[#1f3a25] transition-colors disabled:opacity-60 shadow-sm">
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      Додати на полицю
    </button>
  );
}

// ── Відгук ────────────────────────────────────────────────────────────────────
function ReviewItem({ review, isLoggedIn, onLike }) {
  const [revealed, setRevealed] = useState(false);
  const [liked, setLiked]       = useState(false);
  const [likes, setLikes]       = useState(review.likes_count || 0);

  const handleLike = async () => {
    if (!isLoggedIn) return;
    setLiked(!liked);
    setLikes(l => liked ? l - 1 : l + 1);
    await booksApi.likeReview(review.id).catch(() => {});
  };

  return (
    <div className="py-4 border-b border-zinc-100 last:border-0">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 bg-zinc-200 rounded-full flex items-center justify-center text-xs font-bold uppercase text-zinc-500 shrink-0">
          {(review.user_name || review.username || '?')[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{review.user_name || review.username}</p>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'}`} />
            ))}
          </div>
        </div>
        <span className="text-[11px] text-zinc-400 shrink-0">
          {new Date(review.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {review.review_text && (
        review.has_spoiler ? (
          <div className="mb-2">
            {!revealed ? (
              <button onClick={() => setRevealed(true)}
                className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 w-full">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Містить спойлери — натисніть щоб прочитати
              </button>
            ) : (
              <p className="text-sm text-zinc-600 leading-relaxed">{review.review_text}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-600 leading-relaxed mb-2">{review.review_text}</p>
        )
      )}

      <button onClick={handleLike}
        className={`flex items-center gap-1 text-xs font-medium transition-colors ${liked ? 'text-red-500' : 'text-zinc-400 hover:text-red-400'}`}>
        <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500' : ''}`} /> {likes}
      </button>
    </div>
  );
}

// ── Клуби книги ───────────────────────────────────────────────────────────────
function BookClubsSection({ bookId, book, isLoggedIn, openAuth, onNavigate, user }) {
  const [clubs, setClubs]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining]   = useState(null);
  const [form, setForm]         = useState({ name: '', is_private: false, max_members: 20 });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await booksApi.getBookClubs(bookId).catch(() => []);
    setClubs(data || []);
    setLoading(false);
  }, [bookId]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (clubId) => {
    if (!isLoggedIn) { openAuth?.('login'); return; }
    setJoining(clubId);
    await clubsApi.join(clubId).catch(e => alert(e.message));
    await load();
    setJoining(null);
  };

  const createClub = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await clubsApi.create({ ...form, work_id: bookId });
      setShowCreate(false);
      await load();
    } catch (e) { alert(e.message); }
    finally { setCreating(false); }
  };

  const openClubs = clubs.filter(c => c.status !== 'closed');

  return (
    <div>
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={`Клуб для «${book?.title}»`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1.5">Назва клубу *</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="Напр: Читаємо разом"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2C5234]" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block mb-1.5">Макс. учасників</label>
            <input type="number" min={2} max={100} value={form.max_members}
              onChange={e => setForm(f => ({...f, max_members: +e.target.value}))}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2C5234]" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setForm(f => ({...f, is_private: !f.is_private}))}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${form.is_private ? 'bg-[#2C5234]' : 'bg-zinc-200'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_private ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
              {form.is_private ? <><Lock className="w-4 h-4" /> Приватний</> : <><Unlock className="w-4 h-4" /> Відкритий</>}
            </span>
          </label>
          <Button onClick={createClub} isLoading={creating} disabled={!form.name.trim()} className="w-full" icon={Plus}>
            Створити клуб
          </Button>
        </div>
      </Modal>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-14 bg-zinc-100 animate-pulse rounded-xl" />)}
        </div>
      ) : openClubs.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-zinc-100 rounded-2xl">
          <Users className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">Немає активних клубів по цій книзі</p>
          {isLoggedIn && (
            <button onClick={() => setShowCreate(true)} className="mt-2 text-sm text-[#2C5234] font-semibold hover:underline">
              Створити перший клуб →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {openClubs.map(club => {
            const st = CLUB_STATUSES[club.status] || CLUB_STATUSES.recruiting;
            const isMember = !!club.is_member;
            return (
              <div key={club.id} className="flex items-center gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-semibold text-zinc-900 truncate">{club.name}</h4>
                    {club.is_private && <Lock className="w-3 h-3 text-zinc-400 shrink-0" />}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {club.members_count}/{club.max_members || '∞'}
                  </p>
                </div>
                {isMember ? (
                  <button onClick={() => onNavigate('clubs')}
                    className="text-xs font-bold bg-[#2C5234] text-white px-3 py-2 rounded-lg hover:bg-[#1f3a25] transition-colors shrink-0">
                    Відкрити
                  </button>
                ) : club.is_private ? (
                  <span className="text-xs text-zinc-400 shrink-0 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Тільки за запрошенням
                  </span>
                ) : club.status === 'recruiting' ? (
                  <button onClick={() => handleJoin(club.id)} disabled={joining === club.id}
                    className="text-xs font-bold bg-[#2C5234] text-white px-3 py-2 rounded-lg hover:bg-[#1f3a25] disabled:opacity-50 transition-colors shrink-0">
                    {joining === club.id ? '...' : 'Приєднатись'}
                  </button>
                ) : null}
              </div>
            );
          })}
          {isLoggedIn && (
            <button onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-zinc-200 rounded-xl text-xs font-semibold text-zinc-500 hover:border-[#2C5234] hover:text-[#2C5234] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Створити ще один клуб
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Форма відгуку ─────────────────────────────────────────────────────────────
function ReviewForm({ bookId, isLoggedIn, openAuth, onAdded }) {
  const [rating, setRating]       = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [comment, setComment]     = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!isLoggedIn) { openAuth?.('login'); return; }
    if (!rating) return;
    setSubmitting(true);
    try {
      await booksApi.addReview(bookId, { rating, comment, has_spoiler: hasSpoiler });
      setRating(0); setComment(''); setHasSpoiler(false);
      onAdded?.();
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="bg-zinc-50 rounded-2xl p-4 space-y-3">
      <p className="text-sm font-semibold text-zinc-700">Ваш відгук</p>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} onMouseEnter={() => setHovered(i + 1)} onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(i + 1)}>
            <Star className={`w-6 h-6 transition-colors ${i < (hovered || rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'}`} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
        placeholder="Ваші враження від книги..."
        className="w-full border border-zinc-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2C5234] resize-none" />
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={hasSpoiler} onChange={e => setHasSpoiler(e.target.checked)}
          className="rounded border-zinc-300" />
        <span className="text-xs text-zinc-600 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Містить спойлери
        </span>
      </label>
      <Button onClick={submit} isLoading={submitting} disabled={!rating} className="w-full" icon={Send}>
        Опублікувати відгук
      </Button>
    </div>
  );
}

// ── Обговорення ───────────────────────────────────────────────────────────────
function DiscussionsSection({ bookId, isLoggedIn, openAuth }) {
  const [threads, setThreads]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: '', body: '', has_spoiler: false });
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [replies, setReplies]   = useState({});
  const [replyInput, setReplyInput] = useState({});

  useEffect(() => {
    booksApi.getDiscussions(bookId).then(d => setThreads(d || [])).catch(() => {}).finally(() => setLoading(false));
  }, [bookId]);

  const createThread = async () => {
    if (!isLoggedIn) { openAuth?.('login'); return; }
    if (!form.title || !form.body) return;
    setSaving(true);
    try {
      const d = await booksApi.createDiscussion(bookId, form);
      setThreads(p => [d, ...p]);
      setForm({ title: '', body: '', has_spoiler: false });
      setShowForm(false);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const expandThread = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!replies[id]) {
      const d = await booksApi.getDiscussion(id).catch(() => null);
      if (d) setReplies(p => ({ ...p, [id]: d.replies || [] }));
    }
  };

  const sendReply = async (threadId) => {
    const body = replyInput[threadId];
    if (!body?.trim()) return;
    const r = await booksApi.addReply(threadId, { body }).catch(() => null);
    if (r) {
      setReplies(p => ({ ...p, [threadId]: [...(p[threadId] || []), r] }));
      setReplyInput(p => ({ ...p, [threadId]: '' }));
    }
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-zinc-100 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-2">
      <button onClick={() => setShowForm(!showForm)}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-zinc-200 rounded-xl text-xs font-semibold text-zinc-500 hover:border-[#2C5234] hover:text-[#2C5234] transition-colors">
        <Plus className="w-3.5 h-3.5" /> Нова гілка обговорення
      </button>

      {showForm && (
        <div className="bg-zinc-50 rounded-2xl p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
            placeholder="Заголовок гілки..."
            className="w-full border border-zinc-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2C5234]" />
          <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} rows={3}
            placeholder="Текст обговорення..."
            className="w-full border border-zinc-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2C5234] resize-none" />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.has_spoiler} onChange={e => setForm(f => ({...f, has_spoiler: e.target.checked}))} className="rounded" />
            <span className="text-xs text-zinc-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Спойлер</span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Скасувати</Button>
            <Button onClick={createThread} isLoading={saving} disabled={!form.title || !form.body} className="flex-1">Створити</Button>
          </div>
        </div>
      )}

      {threads.length === 0 ? (
        <p className="text-sm text-zinc-400 text-center py-6">Обговорень ще немає — будьте першим!</p>
      ) : threads.map(t => (
        <div key={t.id} className="border border-zinc-100 rounded-xl overflow-hidden">
          <button onClick={() => expandThread(t.id)}
            className="w-full text-left p-3.5 hover:bg-zinc-50 transition-colors">
            <div className="flex items-start gap-2">
              {t.has_spoiler && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 line-clamp-1">{t.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {t.username} · {t.replies_count || 0} відп. · {new Date(t.created_at).toLocaleDateString('uk-UA')}
                </p>
              </div>
              <MessageSquare className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
            </div>
          </button>
          {expanded === t.id && (
            <div className="border-t border-zinc-100 bg-zinc-50/50 p-3.5 space-y-3">
              <p className="text-sm text-zinc-600 leading-relaxed">{t.body}</p>
              {(replies[t.id] || []).map(r => (
                <div key={r.id} className="ml-4 flex gap-2">
                  <div className="w-6 h-6 bg-zinc-200 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold uppercase">{(r.username || '?')[0]}</div>
                  <div className="bg-white rounded-xl px-3 py-2 flex-1 shadow-sm">
                    <p className="text-[11px] font-semibold text-zinc-700 mb-0.5">{r.username}</p>
                    <p className="text-xs text-zinc-600 leading-relaxed">{r.body}</p>
                  </div>
                </div>
              ))}
              {isLoggedIn && (
                <div className="flex gap-2 ml-4">
                  <input value={replyInput[t.id] || ''} onChange={e => setReplyInput(p => ({...p, [t.id]: e.target.value}))}
                    onKeyDown={e => e.key === 'Enter' && sendReply(t.id)}
                    placeholder="Відповісти..."
                    className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#2C5234]" />
                  <button onClick={() => sendReply(t.id)} className="p-2 bg-[#2C5234] text-white rounded-xl hover:bg-[#1f3a25] transition-colors">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Головний компонент ────────────────────────────────────────────────────────
export default function BookPage({ onNavigate, isLoggedIn, user, openAuth }) {
  const { id }             = useParams();
  const [book, setBook]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [revLoading, setRevLoading] = useState(true);
  const [tab, setTab]      = useState('about'); // about | reviews | clubs | discussions
  const [userStatus, setUserStatus] = useState(null);

  useEffect(() => {
    setLoading(true);
    booksApi.getOne(id)
      .then(data => {
        setBook(data);
        setUserStatus(data?.user_status || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    booksApi.getReviews(id)
      .then(data => setReviews(data || []))
      .catch(() => {})
      .finally(() => setRevLoading(false));
  }, [id]);

  if (loading) return <Loader fullPage />;
  if (!book) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-zinc-500">Книгу не знайдено</p>
      <Button onClick={() => onNavigate('back')} variant="outline">Назад</Button>
    </div>
  );

  const avgRating = parseFloat(book.average_rating || 0);
  const authors   = getAuthorsString(book);

  const TABS = [
    { id: 'about', label: 'Про книгу' },
    { id: 'reviews', label: `Відгуки${reviews.length ? ` (${reviews.length})` : ''}` },
    { id: 'clubs', label: `Клуби` },
    { id: 'discussions', label: 'Обговорення' },
  ];

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Хедер */}
      <div className="sticky top-14 z-30 bg-white/90 backdrop-blur border-b border-zinc-100 flex items-center px-4 h-12">
        <button onClick={() => onNavigate('back')} className="p-1.5 -ml-1.5 rounded-full hover:bg-zinc-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-zinc-700" />
        </button>
        <h1 className="flex-1 text-sm font-semibold text-zinc-900 truncate ml-2">{book.title}</h1>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-zinc-100 to-white px-5 pt-6 pb-4 max-w-xl mx-auto">
        <div className="flex gap-5">
          <div className="w-28 shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-lg bg-zinc-200">
            {book.cover_url
              ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8 text-zinc-400" /></div>
            }
          </div>
          <div className="flex-1 min-w-0 py-1">
            <h1 className="font-serif text-xl font-bold text-zinc-900 leading-tight mb-1">{book.title}</h1>
            <p className="text-sm text-zinc-500 mb-3">{authors}</p>
            {avgRating > 0 && (
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'}`} />
                  ))}
                </div>
                <span className="text-sm font-bold text-zinc-700">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-zinc-400">({book.total_ratings || 0})</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {book.category && (
                <span className="text-[11px] font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">{book.category}</span>
              )}
              {book.page_count > 0 && (
                <span className="text-[11px] font-semibold bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">{book.page_count} стор.</span>
              )}
            </div>
            <ShelfButton
              bookId={id}
              initialStatus={userStatus}
              isLoggedIn={isLoggedIn}
              openAuth={openAuth}
              onStatusChange={setUserStatus}
            />
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="sticky top-[calc(3.5rem+3rem)] z-20 bg-white border-b border-zinc-100">
        <div className="flex overflow-x-auto no-scrollbar max-w-xl mx-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-[#2C5234] text-[#2C5234]' : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-xl mx-auto px-5 py-5">
        {tab === 'about' && (
          <div className="space-y-4">
            {book.description ? (
              <p className="text-sm text-zinc-600 leading-relaxed">{book.description}</p>
            ) : (
              <p className="text-sm text-zinc-400 italic">Опис відсутній</p>
            )}
            {(book.publisher || book.publication_date) && (
              <div className="border-t border-zinc-100 pt-4 grid grid-cols-2 gap-3 text-sm">
                {book.publisher && (
                  <div><p className="text-xs text-zinc-400 mb-0.5">Видавець</p><p className="font-medium text-zinc-700">{book.publisher}</p></div>
                )}
                {book.publication_date && (
                  <div><p className="text-xs text-zinc-400 mb-0.5">Рік видання</p><p className="font-medium text-zinc-700">{book.publication_date.slice(0, 4)}</p></div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-4">
            <ReviewForm bookId={id} isLoggedIn={isLoggedIn} openAuth={openAuth}
              onAdded={() => booksApi.getReviews(id).then(d => setReviews(d || []))} />
            {revLoading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Поки немає відгуків — будьте першим!</p>
            ) : reviews.map(r => (
              <ReviewItem key={r.id} review={r} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        )}

        {tab === 'clubs' && (
          <BookClubsSection
            bookId={id}
            book={book}
            isLoggedIn={isLoggedIn}
            openAuth={openAuth}
            onNavigate={onNavigate}
            user={user}
          />
        )}

        {tab === 'discussions' && (
          <DiscussionsSection bookId={id} isLoggedIn={isLoggedIn} openAuth={openAuth} />
        )}
      </div>
    </div>
  );
}