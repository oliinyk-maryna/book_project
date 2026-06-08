import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Star, BookOpen, Users, FileText, Bookmark, 
  Calendar, Loader2, Info, Check, Plus, ChevronDown, Trash2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

/* ── КОНСТАНТИ ТА ДОПОМІЖНІ ФУНКЦІЇ ────────────────────────────── */
const STATUS_META = {
  planned: { label: 'В планах',  cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  reading: { label: 'Читаю',     cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  read:    { label: 'Прочитано', cls: 'text-green-700 bg-green-50 border-green-200' },
  dropped: { label: 'Покинуто',  cls: 'text-stone-500 bg-stone-100 border-stone-200' },
};

const token = () => localStorage.getItem('token');
const authH = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

/* ── КОМПОНЕНТ РЕЙТИНГУ (ЗІРОЧКИ) ──────────────────────────────── */
function Stars({ value, onChange, size = 6 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <Star 
          key={s} 
          onClick={() => onChange?.(s)}
          className={`w-${size} h-${size} transition-transform 
            ${onChange ? 'cursor-pointer hover:scale-110' : ''} 
            ${s <= value ? 'fill-[var(--c-accent)] text-[var(--c-accent)]' : 'text-[var(--c-border)]'}`
          } 
        />
      ))}
    </div>
  );
}

/* ── ГОЛОВНИЙ КОМПОНЕНТ СТОРІНКИ ───────────────────────────────── */
export default function BookPage({ isLoggedIn, currentUser, handleNavigate, openAuthModal }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // 1. Стейт: Основні дані
  const [book, setBook]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('info');

  // 2. Стейт: Читацька полиця
  const [isOnShelf, setIsOnShelf]     = useState(false);
  const [isDropdown, setDropdown]     = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
  const [isAdding, setIsAdding]       = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [shelf, setShelf] = useState({ 
    status: 'planned', 
    current_page: 0, 
    start_date: '', 
    end_date: '', 
    notes: '' 
  });
  
  // 3. Стейт: Відгуки
  const [reviews, setReviews]       = useState([]);
  const [myRating, setMyRating]     = useState(0);
  const [myText, setMyText]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editText, setEditText]     = useState('');

  // 4. Стейт: Клуби
  const [clubs, setClubs] = useState([]);

  /* ── БЛОКУВАННЯ СКРОЛУ ПРИ ВІДКРИТІЙ МОДАЛЦІ ─────────────────── */
  useEffect(() => {
    if (showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showDeleteModal]);

  /* ── ЗАВАНТАЖЕННЯ ДАНИХ ──────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = token() ? { Authorization: `Bearer ${token()}` } : {};
      const [bR, rR, cR] = await Promise.all([
        fetch(`${API_URL}/books/${id}`, { headers }),
        fetch(`${API_URL}/books/${id}/reviews`, { headers }),
        fetch(`${API_URL}/clubs?work_id=${id}`, { headers }),
      ]);

      if (bR.ok) {
        const bd = await bR.json();
        setBook(bd);
        
        setMyRating(bd.personal_rating || bd.user_rating || 0);

        if (bd.user_status) {
          setIsOnShelf(true);
          setShelf({
            status:       bd.user_status,
            current_page: bd.current_page || 0,
            start_date:   bd.started_at ? bd.started_at.split('T')[0] : '',
            end_date:     bd.finished_at ? bd.finished_at.split('T')[0] : '',
            notes:        bd.notes || '',
          });
        } else {
          setIsOnShelf(false);
          setShelf({ status: 'planned', current_page: 0, start_date: '', end_date: '', notes: '' });
        }
      }

      if (rR.ok) {
        const revData = await rR.json();
        setReviews(Array.isArray(revData) ? revData : (revData.data || revData.reviews || []));
      }

      if (cR.ok) {
        const clubsData = await cR.json();
        setClubs(Array.isArray(clubsData) ? clubsData : (clubsData.data || clubsData.clubs || []));
      }
    } catch { 
      toast.error('Помилка завантаження даних'); 
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    window.addEventListener('app:refresh', loadData);
    return () => window.removeEventListener('app:refresh', loadData);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── ЛОГІКА: ПОЛИЦЯ ──────────────────────────────────────────── */
  const handleRemoveFromShelf = async () => {
    setShowDeleteModal(false); 
    setIsAdding(true);         
    
    try {
      const res = await fetch(`${API_URL}/me/books/${id}`, { method: 'DELETE', headers: authH() });
      if (res.ok) {
        toast.success('Книгу видалено з полиці');
        setIsOnShelf(false);
        setShelf({ status: 'planned', current_page: 0, start_date: '', end_date: '', notes: '' });
        await loadData();
      } else {
        toast.error('Помилка видалення');
      }
    } catch { 
      toast.error("Помилка з'єднання з сервером"); 
    } finally {
      setIsAdding(false);
    }
  };

  const handleStatusSelect = async (newStatus) => {
    if (!isLoggedIn) return openAuthModal?.('login');
    
    setDropdown(false);
    setIsAdding(true);
    
    try {
      if (!isOnShelf) {
        await fetch(`${API_URL}/me/books/${id}`, { method: 'POST', headers: authH(), body: JSON.stringify({ status: newStatus }) });
      }

      const targetPage = (newStatus === 'read' && book?.page_count) ? book.page_count : shelf.current_page;

      const res = await fetch(`${API_URL}/me/books/${id}/progress`, {
        method: 'PATCH',
        headers: authH(),
        body: JSON.stringify({ status: newStatus, current_page: targetPage, notes: shelf.notes }),
      });
      
      if (res.ok) {
        await loadData();
        toast.success('Статус оновлено');
        window.dispatchEvent(new Event('app:refresh'));
      } else {
        toast.error('Помилка оновлення');
      }
    } catch { 
      toast.error("Помилка з'єднання"); 
    } finally {
      setIsAdding(false);
    }
  };

  const handleSave = async () => {
    if (!isLoggedIn) return openAuthModal?.('login');
    
    setIsSaving(true);
    try {
      if (!isOnShelf) {
        await fetch(`${API_URL}/me/books/${id}`, { method: 'POST', headers: authH(), body: JSON.stringify({ status: shelf.status }) });
      }

      const res = await fetch(`${API_URL}/me/books/${id}/progress`, {
        method: 'PATCH', 
        headers: authH(),
        body: JSON.stringify({
          current_page: Number(shelf.current_page),
          status:       shelf.status,
          notes:        shelf.notes,
          start_date:   shelf.start_date || null,
          end_date:     shelf.end_date || null, 
        }),
      });

      if (res.ok) { 
        toast.success('Збережено!'); 
        setIsOnShelf(true); 
        await loadData(); 
      } else { 
        toast.error('Помилка збереження прогресу'); 
      }
    } catch { 
      toast.error("Помилка з'єднання"); 
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageChange = (val) => {
    const maxPages = book?.page_count || book?.total_pages || 99999;
    const num = Math.max(0, Math.min(Number(val), maxPages));
    setShelf(prev => ({ ...prev, current_page: num }));
  };

  /* ── ЛОГІКА: ВІДГУКИ ТА ОЦІНКИ ───────────────────────────────── */
  const handleRatingChange = async (val) => {
    if (!isLoggedIn) return openAuthModal?.('login');
    
    const previousRating = myRating; 
    setMyRating(val); 
    
    try {
      const res = await fetch(`${API_URL}/me/books/${id}/rating`, {
        method: 'PATCH', 
        headers: authH(),
        body: JSON.stringify({ personal_rating: val }),
      });
      
      if (res.ok) {
        toast.success('Оцінку збережено!');
        loadData();
      } else {
        setMyRating(previousRating); 
        toast.error('Щоб оцінити книгу, додайте її на полицю');
      }
    } catch { 
      setMyRating(previousRating); 
      toast.error("Помилка з'єднання"); 
    }
  };

  const handleReviewSubmit = async () => {
    if (!isLoggedIn) return openAuthModal?.('login');
    if (!myText.trim()) return toast.error('Напишіть текст відгуку');
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/books/${id}/reviews`, {
        method: 'POST', 
        headers: authH(),
        body: JSON.stringify({ comment: myText, has_spoiler: false }),
      });
      
      if (res.ok) { 
        toast.success('Відгук опубліковано!'); 
        setMyText(''); 
        loadData(); 
      } else { 
        toast.error('Помилка публікації'); 
      }
    } catch { 
      toast.error("Помилка з'єднання"); 
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей відгук?')) return;
    try {
      const res = await fetch(`${API_URL}/reviews/${reviewId}`, { method: 'DELETE', headers: authH() });
      if (res.ok) {
        toast.success('Відгук видалено');
        loadData(); 
      } else { toast.error('Помилка видалення'); }
    } catch { toast.error("Помилка з'єднання"); }
  };

  const handleSaveEdit = async (reviewId) => {
    if (!editText.trim()) return toast.error('Текст не може бути порожнім');
    try {
      const res = await fetch(`${API_URL}/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: authH(),
        body: JSON.stringify({ comment: editText, has_spoiler: false }),
      });
      if (res.ok) {
        toast.success('Відгук оновлено');
        setEditingId(null); 
        loadData();
      } else { toast.error('Помилка оновлення'); }
    } catch { toast.error("Помилка з'єднання"); }
  };

  /* ── ЛОГІКА: КЛУБИ ───────────────────────────────────────────── */
  const handleJoinClub = async (clubId) => {
    if (!isLoggedIn) return openAuthModal?.('login');
    try {
      const res = await fetch(`${API_URL}/clubs/${clubId}/join`, { method: 'POST', headers: authH() });
      if (res.ok) {
        toast.success('Ви успішно приєдналися до спільноти!');
        setClubs(prevClubs => prevClubs.map(c => 
          c.id === clubId ? { ...c, is_member: true, members_count: Number(c.members_count || 0) + 1 } : c
        ));
      } else {
        const error = await res.json();
        toast.error(error.message || 'Помилка приєднання');
      }
    } catch { toast.error("Помилка з'єднання"); }
  };

  /* ── РЕНДЕР ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-9 h-9 animate-spin" style={{ color: 'var(--c-primary)' }} />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex justify-center items-center h-[60vh] text-sm" style={{ color: 'var(--c-text-3)' }}>
        Книгу не знайдено
      </div>
    );
  }

  const pageCount  = book.page_count || book.total_pages || 0;
  const pct        = pageCount > 0 ? Math.round((shelf.current_page / pageCount) * 100) : 0;
  const statusMeta = STATUS_META[shelf.status] || STATUS_META.planned;

  const TABS = [
    { id: 'info',  label: 'Інформація', icon: Info },
    { id: 'shelf', label: 'Полиця',     icon: Bookmark },
    { id: 'clubs', label: 'Спільноти',  icon: Users },
  ];

  return (
    <>
      <main className="max-w-4xl mx-auto px-4 pt-5 pb-24 page-enter">
        {/* Кнопка Назад */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors hover:bg-[var(--c-surface-2)]"
          style={{ color: 'var(--c-text-2)' }}
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        {/* ── ШАПКА КНИГИ ─────────────────────────────────────────── */}
        <div 
          className="flex flex-col md:flex-row gap-6 md:gap-8 mb-6 p-5 md:p-7 rounded-3xl"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
        >
          {/* Ліва колонка: Обкладинка і кнопки */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-lg" style={{ background: 'var(--c-surface-2)' }}>
              {book.cover_url ? (
                <img src={book.cover_url} className="w-full h-full object-cover" alt={book.title} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-9 h-9" style={{ color: 'var(--c-border)' }} />
                </div>
              )}
            </div>

            {isLoggedIn ? (
              <div className="relative w-full max-w-[128px]">
                <button 
                  onClick={() => setDropdown(!isDropdown)} 
                  disabled={isAdding}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isOnShelf ? statusMeta.cls : 'text-white'}`}
                  style={!isOnShelf ? { background: 'var(--c-primary)', border: '1px solid var(--c-primary)' } : {}}
                >
                  {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                   isOnShelf ? <><Check className="w-3 h-3" /> {statusMeta.label} <ChevronDown className="w-3 h-3 ml-auto" /></> : 
                   <><Plus className="w-3 h-3" /> Додати</>}
                </button>

                {isDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-1.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] z-20 flex flex-col gap-0.5 animate-in slide-in-from-top-2 duration-200"
                    style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                    
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <button key={k} onClick={() => handleStatusSelect(k)}
                        className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all hover:bg-[var(--c-bg)] ${shelf.status === k ? 'bg-[var(--c-bg)] opacity-100' : 'opacity-70'}`}
                        style={{ color: shelf.status === k ? 'var(--c-primary)' : 'var(--c-text-2)' }}>
                        {v.label}
                      </button>
                    ))}

                    {isOnShelf && (
                      <>
                        <div className="h-px w-full my-0.5" style={{ background: 'var(--c-border-2)' }} />
                        <button 
                          onClick={() => { setDropdown(false); setShowDeleteModal(true); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Видалити
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => openAuthModal?.('login')}
                className="w-full max-w-[128px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                style={{ background: 'var(--c-primary)' }}
              >
                <Plus className="w-3 h-3" /> Додати
              </button>
            )}
          </div>

          {/* Права колонка: Текст і прогрес */}
          <div className="flex-1 flex flex-col justify-center gap-3 text-center md:text-left">
            <h1 className="font-serif font-black text-2xl md:text-3xl leading-tight" style={{ color: 'var(--c-text)' }}>
              {book.title}
            </h1>
            <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-3)' }}>
              {book.authors?.join(', ') || book.author || 'Невідомий автор'}
            </p>
            
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
                style={{ background: 'var(--c-accent-muted)', color: 'var(--c-accent)' }}>
                <Star className="w-4 h-4 fill-[var(--c-accent)]" />
                {book.average_rating > 0 ? Number(book.average_rating).toFixed(1) : ''}
                <span className="text-xs opacity-70 ml-0.5">({book.total_ratings || 0})</span>
              </div>
            </div>

            {isOnShelf && shelf.status === 'reading' && pageCount > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--c-text-3)' }}>
                  <span>Прогрес</span>
                  <span className="font-bold">{pct}% · стор. {shelf.current_page}/{pageCount}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-surface-2)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--c-primary)' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── НАВІГАЦІЯ (ВКЛАДКИ) ──────────────────────────────────── */}
        <div 
          className="flex p-1 rounded-2xl mb-6 overflow-x-auto no-scrollbar"
          style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
        >
          {TABS.map(t => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)}
              className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={tab === t.id
                ? { background: 'var(--c-surface)', color: 'var(--c-primary)', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }
                : { color: 'var(--c-text-3)' }
              }
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── КОНТЕНТ ВКЛАДОК ─────────────────────────────────────── */}
        <div className="animate-in fade-in duration-200">

          {/* Вкладка 1: ІНФОРМАЦІЯ ТА ВІДГУКИ */}
          {tab === 'info' && (
            <div className="space-y-8">
              {/* Опис книги */}
              <div className="rounded-3xl p-6 md:p-8 space-y-6" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                <p className="text-sm md:text-base leading-relaxed whitespace-pre-line text-justify" style={{ color: 'var(--c-text-2)' }}>
                  {book.description || 'Опис відсутній.'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5" style={{ borderTop: '1px solid var(--c-border-2)' }}>
                  {[
                    { l: 'Сторінок',    v: pageCount > 0 ? pageCount : '—' },
                    { l: 'Рік',         v: book.publication_date?.slice(0,4) || '—' },
                    { l: 'Видавництво', v: book.publisher || '—' },
                    { l: 'Жанри',       v: book.category || '—' },
                  ].map(m => (
                    <div key={m.l} className="p-4 rounded-2xl" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-3)' }}>{m.l}</p>
                      <p className="font-bold text-sm leading-tight" style={{ color: 'var(--c-text)' }}>{m.v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Блок відгуків */}
              <div className="pt-4">
                <h3 className="font-serif font-bold text-2xl mb-5" style={{ color: 'var(--c-text)' }}>Відгуки читачів</h3>
                
                {isLoggedIn ? (
                  <div className="space-y-6 mb-8">
                    {/* Виставлення оцінки */}
                    <div className="p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                      <div className="text-center sm:text-left">
                        <h4 className="font-bold text-sm" style={{ color: 'var(--c-text)' }}>Моя оцінка</h4>
                        <p className="text-xs mt-1" style={{ color: 'var(--c-text-3)' }}>Натисніть на зірочку, щоб оцінити книгу</p>
                      </div>
                      <Stars value={myRating} onChange={handleRatingChange} size={8} />
                    </div>

                    {/* Написання відгуку */}
                    <div className="p-6 rounded-3xl space-y-4 shadow-sm" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                      <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid var(--c-border-2)' }}>
                        <span className="font-bold text-sm uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--c-text-3)' }}>
                          <FileText className="w-4 h-4" /> Написати рецензію
                        </span>
                      </div>
                      <textarea 
                        value={myText} 
                        onChange={e => setMyText(e.target.value)}
                        placeholder="Поділіться враженнями про сюжет, героїв, атмосферу..."
                        className="w-full border p-4 rounded-2xl outline-none text-sm h-28 resize-none transition-colors focus:border-[var(--c-primary)]"
                        style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }} 
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={handleReviewSubmit} 
                          disabled={submitting || !myText.trim()}
                          className="px-8 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2 transition-opacity disabled:opacity-50"
                          style={{ background: 'var(--c-primary)' }}
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Опублікувати'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-3xl text-center mb-6" style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
                    <button onClick={() => openAuthModal?.('login')} className="text-sm font-bold hover:underline" style={{ color: 'var(--c-primary)' }}>
                      Увійдіть, щоб оцінити книгу та залишити відгук
                    </button>
                  </div>
                )}

                {/* Список відгуків */}
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map(r => {
                      const userName   = r.username || r.user_name || r.UserName || 'Читач';
                      const reviewText = r.review_text || r.comment || r.content || 'Оцінка без коментаря';
                      const rating     = r.rating || 0;
                      const isSpoiler  = r.has_spoiler;
                      const isMyReview = currentUser && (r.user_id === currentUser.id || r.UserID === currentUser.id);

                      return (
                        <div key={r.id} className="p-5 rounded-3xl border shadow-sm" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                          <div className="flex justify-between items-center mb-3">
                            <p className="font-bold text-sm" style={{ color: 'var(--c-text)' }}>{userName}</p>
                            <Stars value={rating} size={4} />
                          </div>

                          {editingId === r.id ? (
                            <div className="mt-2">
                              <textarea 
                                value={editText} 
                                onChange={e => setEditText(e.target.value)}
                                className="w-full border p-3 rounded-xl outline-none text-sm h-24 resize-none mb-3"
                                style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 transition-colors">
                                  Скасувати
                                </button>
                                <button onClick={() => handleSaveEdit(r.id)} className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors" style={{ background: 'var(--c-primary)' }}>
                                  Зберегти
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {isSpoiler ? (
                                <details className="group">
                                  <summary className="cursor-pointer text-sm font-bold text-indigo-700 bg-indigo-50 p-3 rounded-xl flex items-center gap-2 outline-none hover:bg-indigo-100 transition-colors">
                                    <Info className="w-4 h-4" /> Цей відгук містить спойлери. Натисніть, щоб прочитати
                                  </summary>
                                  <p className="mt-4 text-stone-600 leading-relaxed">{reviewText}</p>
                                </details>
                              ) : (
                                <p className="text-stone-600 leading-relaxed">{reviewText}</p>
                              )}

                              {isMyReview && (
                                <div className="flex gap-4 mt-4 pt-3 border-t border-stone-100">
                                  <button onClick={() => { setEditingId(r.id); setEditText(reviewText); }} className="text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:text-[var(--c-primary)] transition-colors">Редагувати</button>
                                  <button onClick={() => handleDeleteReview(r.id)} className="text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:text-red-500 transition-colors">Видалити</button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-stone-400 py-6">Відгуків ще немає. Будьте першим!</p>
                )}
              </div>
            </div>
          )}

          {/* Вкладка 2: ПОЛИЦЯ */}
          {tab === 'shelf' && (
            !isLoggedIn ? (
              <div className="text-center py-20 rounded-3xl" style={{ background: 'var(--c-surface)', border: '2px dashed var(--c-border)' }}>
                <Bookmark className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--c-border)' }} />
                <h3 className="font-serif font-bold text-xl mb-2">Ваша читацька полиця</h3>
                <p className="text-sm mb-6" style={{ color: 'var(--c-text-3)' }}>Увійдіть, щоб відстежувати прогрес</p>
                <button onClick={() => openAuthModal?.('login')} className="px-8 py-3 rounded-xl font-bold text-sm text-white" style={{ background: 'var(--c-primary)' }}>Увійти</button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Прогрес читання */}
                  <div className="p-6 md:p-8 rounded-3xl space-y-6" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                    <h4 className="font-serif font-bold text-lg pb-4" style={{ color: 'var(--c-text)', borderBottom: '1px solid var(--c-border-2)' }}>Мій прогрес</h4>
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--c-text-3)' }}>Прочитано сторінок</label>
                        <div className="flex items-center gap-3 mb-4">
                          <input type="number" min="0" max={pageCount || 99999} value={shelf.current_page} onChange={e => handlePageChange(e.target.value)} className="w-24 border rounded-xl px-4 py-2.5 text-sm font-bold outline-none text-center focus:border-[var(--c-primary)] transition-colors" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }} />
                          {pageCount > 0 && <span className="text-sm font-bold" style={{ color: 'var(--c-text-3)' }}>з {pageCount}</span>}
                        </div>
                        {pageCount > 0 && (
                          <div className="space-y-2">
                            <div className="relative w-full h-8 flex items-center">
                              <div className="absolute w-full h-2 rounded-lg overflow-hidden bg-[var(--c-border-2)]">
                                <div className="h-full bg-[var(--c-primary)] transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="absolute w-4 h-4 rounded-full bg-white border-2 border-[var(--c-primary)] shadow-sm pointer-events-none transition-all duration-300 ease-out z-10" style={{ left: `${pct}%`, transform: 'translateX(-50%)' }} />
                              <input type="range" min="0" max={pageCount} value={shelf.current_page} onChange={e => handlePageChange(e.target.value)} className="absolute w-full h-8 opacity-0 cursor-pointer z-20" />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold pt-1" style={{ color: 'var(--c-text-3)' }}>
                              <span>0</span><span style={{ color: 'var(--c-primary)' }}>{pct}%</span><span>{pageCount}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--c-text-3)' }}>Початок читання</label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-3)' }} />
                          <input type="date" value={shelf.start_date} onChange={e => setShelf(s => ({ ...s, start_date: e.target.value }))} className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-[var(--c-primary)] transition-colors" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--c-text-3)' }}>Дата завершення <span className="ml-1 font-normal opacity-60 normal-case">(авто → Прочитано)</span></label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-3)' }} />
                          <input type="date" value={shelf.end_date} onChange={e => setShelf(s => ({ ...s, end_date: e.target.value }))} className="w-full border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:border-[var(--c-primary)] transition-colors" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Щоденник читача */}
                  <div className="md:col-span-2 p-6 md:p-8 rounded-3xl flex flex-col min-h-[320px]" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                    <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: '1px solid var(--c-border-2)' }}>
                      <h3 className="font-serif font-bold text-lg flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
                        <FileText className="w-5 h-5" style={{ color: 'var(--c-primary)' }}/> Щоденник читача
                      </h3>
                      <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--c-text-3)' }}>Тільки для вас</span>
                    </div>
                    <textarea 
                      value={shelf.notes} 
                      onChange={e => setShelf(s => ({ ...s, notes: e.target.value }))} 
                      placeholder="Записуйте думки, цитати, враження..." 
                      className="flex-1 w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed" 
                      style={{ color: 'var(--c-text)' }} 
                    />
                  </div>
                </div>

                {/* Кнопка збереження */}
                <div className="flex justify-end">
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    className="w-full md:w-auto px-10 py-3.5 text-white rounded-xl font-bold text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-all hover:opacity-90 shadow-md hover:-translate-y-0.5" 
                    style={{ background: 'var(--c-primary)' }}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isOnShelf ? 'Зберегти зміни' : 'Додати та зберегти')}
                  </button>
                </div>
              </div>
            )
          )}

          {/* Вкладка 3: СПІЛЬНОТИ */}
          {tab === 'clubs' && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center px-1 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-3)' }}>
                  Активні клуби для цієї книги
                </p>
                <button
                  onClick={() => navigate('/clubs', { state: { openCreate: true, book: { id: id, title: book?.title, author: book?.author || book?.authors?.join(', '), cover_url: book?.cover_url } } })}
                  className="px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest text-white transition-all hover:-translate-y-0.5 flex items-center gap-1.5 shadow-sm"
                  style={{ background: 'var(--c-primary)' }}
                >
                  <Plus className="w-3 h-3" /> Створити свою
                </button>
              </div>

              {clubs.length > 0 ? (
                <div className="space-y-3">
                  {clubs.map(c => {
                    const isMember = c.is_member || (Array.isArray(c.members) && c.members.some(m => m === currentUser?.id || m.id === currentUser?.id || m.user_id === currentUser?.id));
                    return (
                      <div key={c.id} className="p-4 rounded-2xl flex items-center justify-between transition-all hover:border-[var(--c-primary)]" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                        <div>
                          <h4 className="font-bold text-sm" style={{ color: 'var(--c-text)' }}>{c.name}</h4>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-3)' }}>{c.members_count || 1} учасників</p>
                        </div>
                        {isMember ? (
                          <button disabled className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest opacity-60 cursor-not-allowed" style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-2)' }}>Вже в клубі</button>
                        ) : (
                          <button onClick={() => handleJoinClub(c.id)} className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-colors" style={{ background: 'var(--c-primary)' }}>Приєднатись</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 rounded-3xl" style={{ border: '1px dashed var(--c-border)' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--c-text-2)' }}>Поки що немає спільнот</p>
                  <p className="text-xs" style={{ color: 'var(--c-text-3)' }}>Будьте першим, хто створить клуб для цієї книги!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── МОДАЛЬНЕ ВІКНО ВИДАЛЕННЯ (ЗА МЕЖАМИ MAIN!) ─────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-100 transition-all transform scale-100">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-800 mb-2">Видалити книгу?</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Ви впевнені, що хочете видалити книгу з полиці? Вся історія читання та ваші нотатки будуть втрачені назавжди.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors outline-none"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleRemoveFromShelf}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-100 transition-colors outline-none"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}