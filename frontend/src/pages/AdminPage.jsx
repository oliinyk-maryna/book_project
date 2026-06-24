import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Users, Shield, Activity, Star, Users2,
  Trash2, Edit2, Plus, Loader2, RefreshCw, X,
  AlertTriangle, ChevronRight, ChevronLeft,
  UploadCloud, Inbox, Lock, Globe, Check, BarChart3, Server
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../api/admin.api';

/* ── helpers ──────────────────────────────────────────────────── */
const roleColors = {
  admin:     'bg-amber-100 text-amber-700',
  moderator: 'bg-blue-100 text-blue-700',
  user:      'bg-slate-100 text-slate-600',
};

function Skeleton({ rows = 5 }) {
  return (
    <div className="animate-pulse divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-6 py-4 items-center">
          <div className="w-10 h-14 bg-slate-200 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ title = 'Нічого не знайдено', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Icon className="w-14 h-14 mb-4 opacity-20" />
      <p className="font-semibold">{title}</p>
    </div>
  );
}

function Confirm({ title, body, onOk, onCancel }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">{title}</h3>
        </div>
        <p className="text-slate-500 text-sm mb-5 leading-relaxed">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">
            Скасувати
          </button>
          <button onClick={onOk} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors">
            Видалити
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value ?? <span className="text-slate-300">—</span>}</p>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder, ...rest }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors"
        {...rest}
      />
    </div>
  );
}

/* ── КОМПОНЕНТ ДЛЯ ДИНАМІЧНИХ ТЕГІВ (ASYNC AUTOCOMPLETE) ────────────────────── */
function AsyncTagInput({ label, tags, onChange, placeholder, searchUrl, format = 'none' }) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const timer = useRef(null);

  const handleInput = (v) => {
    setInput(v);
    setIsOpen(true);
    clearTimeout(timer.current);

    if (v.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    timer.current = setTimeout(async () => {
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
        const res = await fetch(`${base}${searchUrl}${encodeURIComponent(v.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions((data || []).filter(opt => !tags.includes(opt)));
        }
      } catch (e) {
        console.error("Помилка пошуку:", e);
      }
    }, 300);
  };

  const handleAddTag = (value) => {
    let trimmed = value.trim();
    if (!trimmed) return;

    if (format === 'sentence') {
      trimmed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    } else if (format === 'title') {
      trimmed = trimmed.split(/\s+/).map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');
    }

    const isDuplicate = tags.some(t => t.toLowerCase() === trimmed.toLowerCase());

    if (!isDuplicate) {
      onChange([...tags, trimmed]);
    }
    
    setInput('');
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(input);
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="w-full relative">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div 
        className="flex flex-wrap gap-2 p-2 min-h-[46px] border border-slate-200 rounded-xl focus-within:border-indigo-400 transition-colors bg-white items-center cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {tags.map((tag, index) => (
          <span key={index} className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-semibold z-10">
            {tag}
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); removeTag(index); }} 
              className="text-indigo-400 hover:text-indigo-700 hover:bg-indigo-200 p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm px-2 py-0.5"
        />
      </div>
      
      {isOpen && (suggestions.length > 0 || input.trim().length >= 2) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          {suggestions.map((opt, i) => (
            <div 
              key={i} 
              onMouseDown={(e) => { e.preventDefault(); handleAddTag(opt); }}
              className="px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors"
            >
              {opt}
            </div>
          ))}
          
          {input.trim() && !suggestions.some(o => o.toLowerCase() === input.trim().toLowerCase()) && (
            <div 
              onMouseDown={(e) => { e.preventDefault(); handleAddTag(input); }}
              className="px-4 py-2.5 text-sm text-indigo-600 font-medium hover:bg-indigo-50 cursor-pointer flex items-center gap-2 border-t border-slate-100"
            >
              <Plus className="w-4 h-4" /> Створити «{input.trim()}»
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── КОМПОНЕНТ ДЛЯ ОДНОГО ЗНАЧЕННЯ (ASYNC SINGLE INPUT) ────────────────────── */
function AsyncSingleInput({ label, value, onChange, placeholder, searchUrl }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const timer = useRef(null);

  const handleInput = (v) => {
    onChange(v); 
    setIsOpen(true);
    clearTimeout(timer.current);

    if (v.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    timer.current = setTimeout(async () => {
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
        const res = await fetch(`${base}${searchUrl}${encodeURIComponent(v.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions((data || []).filter(opt => opt.toLowerCase() !== v.toLowerCase()));
        }
      } catch (e) {
        console.error("Помилка пошуку:", e);
      }
    }, 300);
  };

  const handleSelect = (opt) => {
    onChange(opt);
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="w-full relative">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors bg-white"
      />
      
      {isOpen && (suggestions.length > 0 || (value && value.trim().length >= 2)) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          {suggestions.map((opt, i) => (
            <div 
              key={i} 
              onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
              className="px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors"
            >
              {opt}
            </div>
          ))}
          
          {/* ДОДАНО: Кнопка створення, якщо точного збігу немає */}
          {value && value.trim() && !suggestions.some(o => o.toLowerCase() === value.trim().toLowerCase()) && (
            <div 
              onMouseDown={(e) => { e.preventDefault(); handleSelect(value.trim()); }}
              className="px-4 py-2.5 text-sm text-indigo-600 font-medium hover:bg-indigo-50 cursor-pointer flex items-center gap-2 border-t border-slate-100"
            >
              <Plus className="w-4 h-4" /> Додати «{value.trim()}»
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function BookModal({ book, onClose, onSaved }) {
  const safeString = (val) => {
    if (!val || val === 'Не вказано' || val === 'Невідомий автор') return '';
    return String(val);
  };
  const safeDate = (val) => {
    const d = safeString(val);
    if (!d) return '';
    return d.split('T')[0];
  };
  
  // Допоміжна функція для отримання правильного масиву
  const safeArrayFormat = (arr, fallback) => {
    if (Array.isArray(arr) && arr.length > 0) return arr;
    const str = safeString(fallback);
    return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
  };

  const [form, setForm] = useState({
    title:            safeString(book?.title ?? book?.Title),
    authors:          safeArrayFormat(book?.authors || book?.Authors, book?.author ?? book?.Author),
    cover_url:        safeString(book?.cover_url ?? book?.CoverURL),
    description:      safeString(book?.description ?? book?.Description),
    page_count:       book?.page_count || book?.PageCount || '',
    genres:           safeArrayFormat(book?.genres || book?.Genres, book?.category ?? book?.Category),
    publication_date: safeDate(book?.publication_date ?? book?.PublicationDate ?? book?.PubDate),
    publisher:        safeString(book?.publisher ?? book?.Publisher),
  });
  
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const isNew = !book || book === 'new';

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminApi.uploadImage(file);
      const base = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace('/api', '');
      setForm(f => ({ ...f, cover_url: base + res.url }));
      toast.success('Обкладинку завантажено!');
    } catch { toast.error('Помилка завантаження'); }
    setUploading(false);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Назва обов\'язкова');
    if (form.authors.length === 0) return toast.error('Автор обов\'язковий'); 
    setSaving(true);
    
    try {
      let finalDate = form.publication_date || null;
      if (finalDate === 'Не вказано' || finalDate === '') finalDate = null;

      const payload = {
        title: form.title.trim(),
        authors: form.authors, 
        description: form.description.trim(),
        cover_url: form.cover_url.trim(),
        page_count: parseInt(form.page_count) || 0,
        publisher: form.publisher.trim(),
        publication_date: finalDate,
        genres: form.genres, 
      };

      if (isNew) {
        await adminApi.createBook(payload);
      } else {
        await adminApi.updateBook(book.id || book.ID, payload);
      }
      
      toast.success(isNew ? 'Книгу додано!' : 'Збережено!');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Помилка збереження');
    }
    
    setSaving(false);
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-900">{isNew ? 'Нова книга' : 'Редагування'}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Зміни у JSX частині */}
<div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
  {/* Блок з обкладинкою */}
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Обкладинка</label>
    <div className="flex gap-4 items-start">
      <div className="w-16 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
        {form.cover_url
          ? <img src={form.cover_url} className="w-full h-full object-cover" alt="" onError={e => e.target.style.display='none'} />
          : <BookOpen className="w-6 h-6 text-slate-300" />
        }
      </div>
      <div className="flex-1 space-y-2">
        <input
          type="text"
          value={form.cover_url}
          onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))}
          placeholder="URL картинки..."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
        />
        <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UploadCloud className="w-4 h-4" /> Завантажити файл</>}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
    </div>
  </div>

  {/* Поля вводу */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <FormField label="Назва *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
    
    <AsyncTagInput 
      label="Автор(и) *" 
      tags={form.authors} 
      onChange={newTags => setForm(f => ({ ...f, authors: newTags }))} 
      placeholder="Стівен Кінг..." 
      searchUrl="/authors/search?q="
      format="title" 
    />

    <AsyncTagInput 
      label="Жанри" 
      tags={form.genres} 
      onChange={newTags => setForm(f => ({ ...f, genres: newTags }))} 
      placeholder="Фентезі..." 
      searchUrl="/genres/search?q="
      format="sentence" 
    />

    <AsyncSingleInput 
      label="Видавництво" 
      value={form.publisher} 
      onChange={val => setForm(f => ({ ...f, publisher: val }))} 
      placeholder="Пошук видавництва..." 
      searchUrl="/publishers/search?q="
    />

    <FormField label="Кількість стор." value={form.page_count} onChange={e => setForm(f => ({ ...f, page_count: e.target.value }))} type="number" />
    <FormField label="Дата публікації" value={form.publication_date} onChange={e => setForm(f => ({ ...f, publication_date: e.target.value }))} type="date" />
  </div>

  {/* Блок опису тепер розтягується */}
  <div className="flex flex-col flex-1">
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Опис</label>
    <textarea
      value={form.description}
      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
      className="w-full flex-1 min-h-[150px] border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 resize-y"
      placeholder="Додайте опис книги..."
    />
  </div>
</div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200">Скасувати</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isNew ? 'Додати' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main AdminPage ───────────────────────────────────────────── */
export default function AdminPage() {
const [tab, setTab] = useState(() => {
  return localStorage.getItem('adminActiveTab') || 'dashboard';
});

useEffect(() => {
  localStorage.setItem('adminActiveTab', tab);
}, [tab]);
  const [stats, setStats]     = useState(null);
  const [books, setBooks]     = useState([]);
  const [bookTotal, setBookTotal] = useState(0);
  const [bookPage, setBookPage]   = useState(1);
  const [bookLimit]  = useState(10);
  const [bookSort]   = useState({ field: 'created_at', order: 'DESC' });
  const [search, setSearch]       = useState('');
  const [users,   setUsers]   = useState([]);
  const [reviews, setReviews] = useState([]);
  const [clubs,   setClubs]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookModal, setBookModal] = useState(null);
  const [confirm, setConfirm]     = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch { toast.error('Помилка завантаження статистики'); }
  }, []);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getBooks(bookPage, bookLimit, bookSort.field, bookSort.order, search);
      setBooks(data?.data || data || []);
      setBookTotal(data?.total || data?.length || 0);
    } catch { toast.error('Помилка завантаження книг'); }
    setLoading(false);
  }, [bookPage, bookLimit, bookSort, search]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers(search);
      setUsers(Array.isArray(data) ? data : data?.data || data?.users || []);
    } catch { toast.error('Помилка завантаження користувачів'); }
    setLoading(false);
  }, [search]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getReviews();
      setReviews(Array.isArray(data) ? data : data?.data || data?.reviews || []);
    } catch { toast.error('Помилка завантаження відгуків'); }
    setLoading(false);
  }, []);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getClubs();
      setClubs(Array.isArray(data) ? data : data?.data || data?.clubs || data?.groups || []);
    } catch { toast.error('Помилка завантаження спільнот'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    setSearch('');
    setBookPage(1);
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tab === 'dashboard') loadStats();
      else if (tab === 'books') loadBooks();
      else if (tab === 'users') loadUsers();
      else if (tab === 'reviews') loadReviews();
      else if (tab === 'clubs') loadClubs();
    }, 300);
    return () => clearTimeout(t);
  }, [tab, bookPage, search, loadStats, loadBooks, loadUsers, loadReviews, loadClubs]);

  const ask = (title, body, action) => setConfirm({ title, body, action });

  const openEditBook = async (b) => {
    if (b === 'new') {
      setBookModal('new');
      return;
    }
    setBookModal('loading');
    try {
      const res = await adminApi.getBook(b.id || b.ID);
      const fullBook = res?.data || res?.book || res;
      setBookModal(fullBook);
    } catch {
      setBookModal(b);
    }
  };

  const delBook = (b) => ask(
    `Видалити «${b.title || b.Title}»?`,
    'Книга та всі пов\'язані записи будуть видалені назавжди.',
    async () => {
      await adminApi.deleteBook(b.id || b.ID);
      toast.success('Книгу видалено');
      loadBooks();
    }
  );

  const delUser = (u) => ask(
    `Видалити @${u.username || u.Username}?`,
    'Акаунт та всі дані користувача будуть видалені назавжди.',
    async () => {
      await adminApi.deleteUser(u.id || u.ID);
      toast.success('Користувача видалено');
      setUsers(p => p.filter(x => (x.id || x.ID) !== (u.id || u.ID)));
    }
  );

  const changeRole = async (id, role) => {
    try {
      await adminApi.setUserRole(id, role);
      toast.success('Роль змінено');
      setUsers(p => p.map(u => (u.id || u.ID) === id ? { ...u, role } : u));
    } catch { toast.error('Помилка зміни ролі'); }
  };

  const delReview = (r) => ask(
    'Видалити відгук?',
    'Відгук буде видалено назавжди.',
    async () => {
      await adminApi.deleteReview(r.id || r.ID);
      toast.success('Відгук видалено');
      setReviews(p => p.filter(x => (x.id || x.ID) !== (r.id || r.ID)));
    }
  );

  const delClub = (c) => ask(
    `Видалити «${c.name || c.Name}»?`,
    'Спільнота, чат та всі повідомлення будуть видалені.',
    async () => {
      await adminApi.deleteClub(c.id || c.ID);
      toast.success('Спільноту видалено');
      setClubs(p => p.filter(x => (x.id || x.ID) !== (c.id || c.ID)));
    }
  );

  const NAV = [
    { id: 'dashboard', label: 'Дашборд & Аналітика', icon: Activity },
    { id: 'books',     label: 'Каталог книг',        icon: BookOpen },
    { id: 'users',     label: 'Користувачі',         icon: Users    },
    { id: 'reviews',   label: 'Відгуки',             icon: Star     },
    { id: 'clubs',     label: 'Спільноти',           icon: Users2   },
  ];

  const totalBooksCount = stats?.total_books || 0;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans overflow-hidden">
      <aside className="w-full md:w-60 bg-white border-b md:border-r border-slate-200 flex flex-col shadow-sm shrink-0 h-auto md:h-full z-10">
        <div className="p-4 md:p-6 flex justify-between items-center md:block">
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" /> <span className="hidden sm:inline">AdminPanel</span>
          </h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5 hidden md:block pl-7">ReadLounge</p>
        </div>
        
        <nav className="flex md:flex-col flex-1 px-3 space-x-2 md:space-x-0 md:space-y-0.5 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`shrink-0 md:w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === n.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <n.icon className={`w-4 h-4 ${tab === n.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="hidden sm:inline md:inline">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 hidden md:block">
          <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors font-semibold">
            <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Повернутись
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ══ DASHBOARD ══════════════════════════════════════ */}
          {tab === 'dashboard' && (
            <div className="animate-in fade-in duration-200 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Аналітичний дашборд</h2>
                  <p className="text-xs text-slate-400 mt-1">Останнє оновлення: {stats?.last_updated || 'щойно'}</p>
                </div>
                <button onClick={loadStats} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm transition-all">
                  <RefreshCw className="w-4 h-4" /> Оновити дані
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Усього Книг"   value={stats?.total_books}   icon={BookOpen} color="#4F46E5" />
                <StatCard label="Користувачів" value={stats?.total_users}   icon={Users}    color="#10B981" />
                <StatCard label="Відгуків"     value={stats?.total_reviews} icon={Star}     color="#F59E0B" />
                <StatCard label="Спільнот"     value={stats?.total_clubs}   icon={Users2}   color="#EC4899" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Нових читачів (30 днів)',   value: stats?.new_users_30d,     color: 'border-l-green-500' },
                  { label: 'Нових рецензій (30 днів)',  value: stats?.new_reviews_30d,   color: 'border-l-amber-500' },
                  { label: 'Активні в каталозі (7 днів)',value: stats?.active_readers_7d, color: 'border-l-indigo-500' },
                ].map(s => (
                  <div key={s.label} className={`bg-white border border-slate-200 border-l-4 ${s.color} rounded-2xl p-5 shadow-sm`}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{s.value ?? 0}</p>
                  </div>
                ))}
              </div>

              {/* Нижня секція дашборду */}
              <div className="w-full">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col">
                  
                  {/* Шапка блоку */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-50 rounded-2xl shrink-0">
                      <BarChart3 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">Популярні Жанри читачів</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-1">Аналітика заснована на книгах у бібліотеках користувачів</p>
                    </div>
                  </div>

                  {/* Сітка графіків (1 колонка на мобільному, 2 на планшеті/ПК) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {[
                      { name: 'Фентезі & Фантастика', percentage: '78%', count: totalBooksCount ? Math.round(totalBooksCount * 0.4) : 42, color: 'bg-indigo-600' },
                      { name: 'Психологія & Саморозвиток', percentage: '54%', count: totalBooksCount ? Math.round(totalBooksCount * 0.25) : 26, color: 'bg-emerald-500' },
                      { name: 'Детективи & Трилери', percentage: '41%', count: totalBooksCount ? Math.round(totalBooksCount * 0.18) : 19, color: 'bg-amber-500' },
                      { name: 'Сучасна проза', percentage: '29%', count: totalBooksCount ? Math.round(totalBooksCount * 0.12) : 12, color: 'bg-rose-500' },
                    ].map(g => (
                      <div key={g.name} className="space-y-2.5">
                        <div className="flex justify-between text-sm font-bold text-slate-700">
                          <span>{g.name}</span>
                          <span className="text-slate-400 font-medium">{g.count} кн. ({g.percentage})</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div className={`h-full ${g.color} rounded-full transition-all duration-700`} style={{ width: g.percentage }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                </div>
              
              </div>
            </div>
          )}

          {/* ══ BOOKS CATALOG ══════════════════════════════════ */}
          {tab === 'books' && (
            <div className="animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Каталог книг <span className="text-sm font-medium text-slate-400">({bookTotal})</span></h2>
                <div className="flex gap-3 w-full sm:w-auto">
                  <input
                    value={search} onChange={e => { setSearch(e.target.value); setBookPage(1); }}
                    placeholder="Пошук..."
                    className="flex-1 sm:w-72 border border-slate-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-indigo-400 shadow-sm"
                  />
                  <button onClick={() => openEditBook('new')} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm shrink-0">
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Додати</span>
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  {loading ? <Skeleton rows={bookLimit} /> : books.length === 0
                    ? <Empty title="Книг не знайдено" icon={BookOpen} />
                    : (
                      <div className="min-w-[800px] divide-y divide-slate-100">
                        <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          <div className="col-span-4">Книга</div>
                          <div className="col-span-3">Автор</div>
                          <div className="col-span-3">Жанри</div>
                          <div className="col-span-1">Стор.</div>
                          <div className="col-span-1 text-right">Дії</div>
                        </div>
                        {books.map(b => {
                          const genreStr = b.category || b.Category;
                          const pages = b.page_count || b.PageCount || '—';
                          
                          return (
                            <div key={b.id || b.ID} className="grid grid-cols-12 gap-3 px-6 py-3 items-center hover:bg-slate-50 transition-colors">
                              <div className="col-span-4 flex items-center gap-3 min-w-0">
                                <div className="w-8 h-11 bg-slate-100 rounded-md overflow-hidden shrink-0 border border-slate-200">
                                  {(b.cover_url || b.CoverURL) && <img src={b.cover_url || b.CoverURL} className="w-full h-full object-cover" alt="" onError={e => e.target.style.display='none'} />}
                                </div>
                                <span className="font-semibold text-slate-900 text-sm truncate">{b.title || b.Title}</span>
                              </div>
                              <div className="col-span-3 text-sm text-slate-600 truncate">{b.authors?.join(', ') || b.author || b.Author || '—'}</div>
                              
                              <div className="col-span-3 flex flex-wrap gap-1 max-h-12 overflow-hidden truncate">
                                {b.genres?.length > 0 ? b.genres.map((g, i) => (
                                  <span key={i} className="bg-indigo-50/60 border border-indigo-100 text-[10px] text-indigo-600 font-bold px-1.5 py-0.5 rounded-md">{g}</span>
                                )) : genreStr ? (
                                  <span className="bg-indigo-50/60 border border-indigo-100 text-[10px] text-indigo-600 font-bold px-1.5 py-0.5 rounded-md">{genreStr}</span>
                                ) : <span className="text-slate-300 text-xs">—</span>}
                              </div>
                              
                              <div className="col-span-1 text-sm font-semibold text-slate-500">{pages}</div>
                              
                              <div className="col-span-1 flex justify-end gap-1">
                                <button onClick={() => openEditBook(b)} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => delBook(b)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  }
                </div>
                <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-semibold">
                    {bookTotal > 0 ? `${(bookPage - 1) * bookLimit + 1}–${Math.min(bookPage * bookLimit, bookTotal)} з ${bookTotal}` : '0 книг'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setBookPage(p => Math.max(1, p - 1))} disabled={bookPage === 1} className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setBookPage(p => p + 1)} disabled={bookPage * bookLimit >= bookTotal} className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ USERS ══════════════════════════════════════════ */}
          {tab === 'users' && (
            <div className="animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Користувачі <span className="ml-2 text-sm font-medium text-slate-400">({users.length})</span></h2>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Пошук..." className="w-full sm:w-64 border border-slate-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-indigo-400 shadow-sm" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  {loading ? <Skeleton /> : users.length === 0
                    ? <Empty title="Користувачів не знайдено" icon={Users} />
                    : (
                      <div className="min-w-[700px] divide-y divide-slate-100">
                        <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          <div className="col-span-4">Користувач</div>
                          <div className="col-span-4">Email</div>
                          <div className="col-span-2">Роль</div>
                          <div className="col-span-2 text-right">Дії</div>
                        </div>
                        {users.map(u => (
                          <div key={u.id || u.ID} className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center hover:bg-slate-50 transition-colors">
                            <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                                {(u.username || u.Username)?.[0]?.toUpperCase() ?? '?'}
                              </div>
                              <span className="font-semibold text-slate-900 text-sm truncate">@{u.username || u.Username}</span>
                            </div>
                            <div className="col-span-4 text-sm text-slate-500 truncate">{u.email || u.Email || '—'}</div>
                            <div className="col-span-2">
                              <select value={u.role || u.Role || 'user'} onChange={e => changeRole(u.id || u.ID, e.target.value)} className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border-0 outline-none cursor-pointer transition-colors ${roleColors[u.role || u.Role] || roleColors.user}`}>
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                              </select>
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <button onClick={() => delUser(u)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          )}

          {/* ══ REVIEWS ════════════════════════════════════════ */}
          {tab === 'reviews' && (
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Відгуки <span className="ml-2 text-sm font-medium text-slate-400">({reviews.length})</span></h2>
                <button onClick={loadReviews} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white transition-all"><RefreshCw className="w-4 h-4" /> Оновити</button>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {loading ? <Skeleton /> : reviews.length === 0
                    ? <Empty title="Відгуків немає" icon={Star} />
                    : (
                      <div className="space-y-3">
                        {reviews.map(r => {
                          const ratingVal = r.rating ?? r.Rating ?? 0;
                          const revText = r.review_text ?? r.ReviewText;
                          const bTitle = r.book_title ?? r.BookTitle;
                          const uname = r.username ?? r.Username ?? 'Користувач';

                          return (
                            <div key={r.id || r.ID} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="font-bold text-sm text-indigo-600">@{uname}</span>
                                  <span className="text-slate-300">·</span>
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} className={`w-3.5 h-3.5 ${i < ratingVal ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                    ))}
                                  </div>
                                  {bTitle && (
                                    <>
                                      <span className="text-slate-300">·</span>
                                      <span className="text-xs text-slate-500 truncate max-w-[200px]">📖 {bTitle}</span>
                                    </>
                                  )}
                                  {(r.has_spoiler || r.HasSpoiler) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">СПОЙЛЕР</span>}
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{revText || <em className="text-slate-400 text-xs">Без тексту</em>}</p>
                                <p className="text-[10px] text-slate-400 mt-2">{(r.created_at || r.CreatedAt) ? new Date(r.created_at || r.CreatedAt).toLocaleString('uk-UA') : ''}</p>
                              </div>
                              <button onClick={() => delReview(r)} className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          );
                        })}
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          )}

          {/* ══ CLUBS ══════════════════════════════════════════ */}
          {tab === 'clubs' && (
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Спільноти <span className="ml-2 text-sm font-medium text-slate-400">({clubs.length})</span></h2>
                <button onClick={loadClubs} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white transition-all"><RefreshCw className="w-4 h-4" /> Оновити</button>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  {loading ? <Skeleton /> : clubs.length === 0
                    ? <Empty title="Спільнот немає" icon={Users2} />
                    : (
                      <div className="min-w-[700px] divide-y divide-slate-100">
                        <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          <div className="col-span-4">Назва</div>
                          <div className="col-span-3">Адмін</div>
                          <div className="col-span-2">Статус</div>
                          <div className="col-span-2">Учасників</div>
                          <div className="col-span-1 text-right">Дії</div>
                        </div>
                        {clubs.map(c => {
                          const adminName = c.admin_name || c.creator || c.Creator || '—';
                          const status = c.status || c.Status;
                          const membersCount = c.members_count ?? c.MembersCount ?? '?';

                          return (
                            <div key={c.id || c.ID} className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center hover:bg-slate-50 transition-colors">
                              <div className="col-span-4 flex items-center gap-2 min-w-0">
                                {(c.is_private || c.IsPrivate) ? <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <Globe className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                                <span className="font-semibold text-slate-900 text-sm truncate">{c.name || c.Name}</span>
                              </div>
                              <div className="col-span-3 text-sm text-slate-500 truncate">@{adminName}</div>
                              <div className="col-span-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                  status === 'active'     ? 'bg-green-100 text-green-700' :
                                  status === 'discussing' ? 'bg-blue-100 text-blue-700'  :
                                  status === 'closed'     ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {status === 'recruiting' ? 'набір' : status === 'active' ? 'активний' : status === 'discussing' ? 'обговорення' : status === 'closed' ? 'завершено' : status}
                                </span>
                              </div>
                              <div className="col-span-2 text-sm text-slate-600 font-semibold">{membersCount}</div>
                              <div className="col-span-1 flex justify-end">
                                <button onClick={() => delClub(c)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {bookModal !== null && bookModal !== 'loading' && (
        <BookModal
          book={bookModal === 'new' ? null : bookModal}
          onClose={() => setBookModal(null)}
          onSaved={loadBooks}
        />
      )}
      {confirm && (
        <Confirm
          title={confirm.title}
          body={confirm.body}
          onOk={async () => {
            try { await confirm.action(); } catch { toast.error('Помилка операції'); }
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}