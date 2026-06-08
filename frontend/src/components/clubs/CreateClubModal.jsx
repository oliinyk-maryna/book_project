import React, { useState, useEffect } from 'react';
import { X, Search, Lock, Globe, Loader2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '../../config';

export default function CreateClubModal({ onClose, onCreated, initialBook = null }) {
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    max_members: 20, 
    is_private: false, 
    work_id: initialBook ? initialBook.id : '' 
  });
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  
  const [selectedBook, setSelectedBook] = useState(initialBook);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bookSearch.length < 3) { setBookResults([]); return; }
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/books?search=${bookSearch}`);
        if (res.ok) setBookResults(await res.json() || []);
      } catch (e) { console.error(e); }
      finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(timeout);
  }, [bookSearch]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.work_id) return toast.error('Назва та книга обов\'язкові!');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/clubs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, max_members: Number(formData.max_members), min_members: 2 })
      });
      if (res.ok) { 
        toast.success("Спільноту створено!");
        onCreated(await res.json()); 
      } else { 
        toast.error(`Помилка: ${await res.text()}`); 
      }
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 flex items-end md:items-center justify-center z-[70] md:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full md:max-w-lg md:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] md:h-auto md:max-h-[90vh] bg-white">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
          <h2 className="text-xl font-serif font-bold text-slate-800">Нова спільнота</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-400"/></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-slate-400">Назва клубу *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Наприклад: Затишне читання" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-800 text-sm"/>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-slate-400">Короткий опис</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Опишіть правила або цілі клубу..." rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 resize-none font-medium text-slate-800 text-sm"/>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between mb-1.5 text-slate-400">
              <span>Обговорювана книга *</span>
              {selectedBook && <button onClick={() => {setSelectedBook(null); setFormData({...formData, work_id: ''})}} className="text-indigo-600 hover:underline text-xs">Змінити</button>}
            </label>
            
            {selectedBook ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/50">
                <div className="w-10 h-14 rounded-md shadow-sm shrink-0 overflow-hidden bg-slate-200">
                  {selectedBook.cover_url ? <img src={selectedBook.cover_url} className="w-full h-full object-cover" alt="" /> : <BookOpen className="w-5 h-5 text-slate-400 m-auto mt-4"/>}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{selectedBook.title}</p>
                  <p className="text-xs text-slate-400 truncate">{selectedBook.author || selectedBook.authors?.join(', ')}</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Введіть мінімум 3 символи для пошуку..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-sm text-slate-800"/>
                
                {bookSearch.length > 2 && (
                  <div className="absolute top-full left-0 w-full mt-2 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 p-2 border border-slate-100 bg-white custom-scrollbar">
                    {isSearching ? (
                      <p className="p-3 text-center text-sm text-slate-400">Шукаємо книгу...</p>
                    ) : bookResults.length > 0 ? bookResults.map(b => (
                      <div key={b.id} onClick={() => {setSelectedBook(b); setFormData({...formData, work_id: b.id}); setBookSearch('');}} className="flex gap-3 p-2 cursor-pointer rounded-lg items-center hover:bg-slate-50 transition-colors">
                        <img src={b.cover_url || '/placeholder.png'} className="w-8 h-11 object-cover rounded shadow-sm bg-slate-100" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{b.title}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{b.author || b.authors?.join(', ')}</p>
                        </div>
                      </div>
                    )) : <p className="p-3 text-center text-sm text-slate-400">Нічого не знайдено</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-slate-400">Макс. учасників</label>
              <input type="number" min="2" max="100" value={formData.max_members} onChange={e => setFormData({...formData, max_members: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 text-sm"/>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5 text-slate-400">Тип доступу</label>
              <div className="flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                <button type="button" onClick={() => setFormData({...formData, is_private: false})} className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-2 rounded-lg transition-all ${!formData.is_private ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><Globe className="w-3 h-3"/> Публічний</button>
                <button type="button" onClick={() => setFormData({...formData, is_private: true})} className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-2 rounded-lg transition-all ${formData.is_private ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}><Lock className="w-3 h-3"/> Приватний</button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm w-1/3 bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">Скасувати</button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting || !formData.name || !formData.work_id} className="py-2.5 rounded-xl font-bold text-sm w-2/3 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Створити'}
          </button>
        </div>
      </div>
    </div>
  );
}