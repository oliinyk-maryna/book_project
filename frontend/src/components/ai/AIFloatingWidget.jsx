import React, { useState } from 'react';
import { Wand2, X, Send, Loader2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../api/user.api';

export default function AIFloatingWidget({ isLoggedIn, openAuth }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!isLoggedIn) return openAuth('login');
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await userApi.getRecommendations({ query });
      setResults(data.books || []);
      setReason(data.reason || '');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-stone-900 text-white w-80 sm:w-96 rounded-3xl shadow-2xl p-6 mb-4 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center gap-2"><Wand2 className="w-4 h-4 text-amber-400"/> AI-Асистент</h3>
            <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white"><X className="w-5 h-5"/></button>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input 
              value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Що б ви хотіли почитати?..."
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400"
            />
            <button onClick={handleSearch} disabled={loading || !query} className="bg-amber-400 text-stone-900 px-3 rounded-xl hover:bg-amber-500 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2">
            {reason && <p className="text-xs text-stone-400 italic mb-4">{reason}</p>}
            {results.map(book => (
              <div key={book.id} onClick={() => { setIsOpen(false); navigate(`/book/${book.id}`); }} className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-colors">
                <div className="w-10 h-14 bg-stone-800 rounded shrink-0 overflow-hidden">
                  {book.cover_url ? <img src={book.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="w-4 h-4 m-auto mt-5 text-stone-500"/>}
                </div>
                <div>
                  <p className="text-sm font-bold line-clamp-1">{book.title}</p>
                  <p className="text-xs text-stone-400 truncate">{book.authors?.join(', ') || book.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="bg-[#1A361D] text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform">
        {isOpen ? <X className="w-6 h-6" /> : <Wand2 className="w-6 h-6 text-amber-400" />}
      </button>
    </div>
  );
}