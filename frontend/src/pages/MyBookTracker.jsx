import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Square, BookOpen, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { booksApi } from '../api/books.api';
import { userApi } from '../api/user.api';

export default function MyBookTracker() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  useEffect(() => {
    booksApi.getOne(id).then(data => {
      setBook(data);
      if (data.current_page) setStartPage(data.current_page.toString());
    }).catch(() => navigate(-1));
  }, [id, navigate]);

  useEffect(() => {
    let interval = null;
    if (isActive) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    else clearInterval(interval);
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinishSession = async () => {
    setIsActive(false);
    const start = Number(startPage) || 0;
    const end = Number(endPage) || 0;
    
    if (end <= start) return alert("Введіть коректну кінцеву сторінку.");

    setIsSaving(true);
    try {
      await userApi.addSession(id, { duration_seconds: seconds, pages_read: end - start, start_page: start, end_page: end });
      await userApi.updateProgress(id, { current_page: end, status: 'reading' });
      setSessionSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!book) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#1A361D]" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 hover:text-[#1A361D] mb-8 font-medium transition-colors">
        <ArrowLeft className="w-5 h-5" /> Назад до книги
      </button>

      <div className="bg-white rounded-[3rem] shadow-xl border border-stone-100 p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#1A361D]/5 to-transparent" />
        
        <h1 className="text-3xl font-serif font-black text-stone-900 mb-2 relative z-10">{book.title}</h1>
        <p className="text-stone-500 font-medium mb-12 relative z-10">{book.authors?.join(', ') || book.author}</p>

        {sessionSaved ? (
          <div className="py-8 animate-in zoom-in-95">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 rotate-3">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-serif font-bold text-stone-900 mb-3">Сесію збережено!</h2>
            <p className="text-stone-500 mb-8 font-medium">Ви читали {Math.round(seconds / 60)} хвилин і здолали {Number(endPage) - Number(startPage)} сторінок.</p>
            <button onClick={() => navigate('/library')} className="bg-[#1A361D] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#2C5234] shadow-lg">
              Повернутися на полицю
            </button>
          </div>
        ) : (
          <>
            {/* Анімований таймер */}
            <div className="mb-12 relative flex justify-center items-center">
              <div className={`absolute w-48 h-48 rounded-full border-2 border-[#1A361D] opacity-20 ${isActive ? 'animate-ping' : 'hidden'}`} />
              <div className="text-6xl md:text-7xl font-mono font-bold text-[#1A361D] tracking-tighter relative z-10 bg-white px-6 py-4 rounded-3xl shadow-sm border border-stone-100">
                {formatTime(seconds)}
              </div>
            </div>

            <div className="flex justify-center gap-4 mb-12">
              <button onClick={() => setIsActive(!isActive)} className={`w-20 h-20 rounded-[2rem] flex items-center justify-center text-white shadow-xl transition-all hover:scale-105 ${isActive ? 'bg-[#D97757]' : 'bg-[#1A361D]'}`}>
                {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
              </button>
            </div>

            <div className="bg-stone-50 rounded-[2rem] p-6 mb-8 flex flex-col md:flex-row items-center gap-4 border border-stone-100">
              <div className="flex-1 w-full text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block ml-2">Почав з сторінки</label>
                <div className="relative">
                  <BookOpen className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input type="number" value={startPage} onChange={e => setStartPage(e.target.value)} className="w-full bg-white pl-12 pr-4 py-4 rounded-2xl border border-stone-200 outline-none focus:border-[#1A361D] focus:ring-4 ring-green-900/10 transition-all font-bold" />
                </div>
              </div>
              <div className="flex-1 w-full text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2 block ml-2">Зупинився на</label>
                <div className="relative">
                  <BookOpen className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input type="number" value={endPage} onChange={e => setEndPage(e.target.value)} className="w-full bg-white pl-12 pr-4 py-4 rounded-2xl border border-stone-200 outline-none focus:border-[#1A361D] focus:ring-4 ring-green-900/10 transition-all font-bold" />
                </div>
              </div>
            </div>

            <button onClick={handleFinishSession} disabled={isSaving || seconds === 0} className="w-full bg-stone-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-stone-800 disabled:opacity-30 transition-all shadow-lg">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5 fill-current" />}
              Завершити сесію
            </button>
          </>
        )}
      </div>
    </div>
  );
}