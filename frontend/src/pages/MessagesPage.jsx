import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { userApi } from '../api/user.api';
import Loader from '../components/ui/Loader';

export default function MessagesPage({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConvId = searchParams.get('conv');

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  // Завантаження списку чатів
  const fetchConversations = async () => {
    try {
      const data = await userApi.getConversations();
      setConversations(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
  }, []);

  // Завантаження повідомлень активного чату (Polling)
  useEffect(() => {
    if (!activeConvId) return;
    
    const fetchMessages = async () => {
      try {
        const data = await userApi.getConversationMsgs(activeConvId);
        setMessages((data || []).reverse()); // З БД приходять від нових до старих, розвертаємо
      } catch (e) { console.error(e); }
    };

    fetchMessages();
    const iv = setInterval(fetchMessages, 3000); // Polling кожні 3с
    return () => clearInterval(iv);
  }, [activeConvId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConvId) return;
    const tempMsg = input;
    setInput('');
    try {
      await userApi.sendDM(activeConvId, tempMsg);
      // Одразу оновлюємо і чат, і список зліва
      const data = await userApi.getConversationMsgs(activeConvId);
      setMessages((data || []).reverse());
      fetchConversations(); 
    } catch (e) { console.error(e); }
  };

  const activeConvData = conversations.find(c => c.id === activeConvId);

  if (loading) return <Loader fullPage />;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white border-t border-stone-200">
      
      {/* Ліва панель: Список чатів */}
      <div className={`w-full md:w-80 border-r border-stone-200 flex flex-col ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-stone-100 bg-stone-50/50">
          <h2 className="font-bold text-lg text-stone-900">Повідомлення</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <p className="text-center text-stone-400 p-6 text-sm">У вас ще немає діалогів.</p>
          ) : (
            conversations.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSearchParams({ conv: c.id })}
                className={`w-full text-left p-4 flex items-center gap-4 transition-colors border-b border-stone-50 ${activeConvId === c.id ? 'bg-stone-100' : 'hover:bg-stone-50'}`}
              >
                <div className="w-12 h-12 bg-stone-200 rounded-full shrink-0 flex items-center justify-center font-bold text-stone-500 overflow-hidden">
                  {c.other_user?.avatar_url ? <img src={c.other_user.avatar_url} className="w-full h-full object-cover" /> : c.other_user?.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-stone-900 truncate">{c.other_user?.username}</p>
                    {c.unread_count > 0 && <span className="w-2.5 h-2.5 bg-[#D97757] rounded-full shrink-0"></span>}
                  </div>
                  <p className="text-xs text-stone-500 truncate">{c.last_message || '...'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Права панель: Активний чат */}
      <div className={`flex-1 flex flex-col bg-[#FAFAF9] ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p>Оберіть чат для початку спілкування</p>
          </div>
        ) : (
          <>
            <header className="h-16 border-b border-stone-200 bg-white flex items-center px-4 gap-4 shrink-0">
              <button onClick={() => setSearchParams({})} className="md:hidden p-2 text-stone-500 hover:bg-stone-100 rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="font-bold text-stone-900">{activeConvData?.other_user?.username}</div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => {
                const isMe = m.sender_id === user.id;
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-5 py-3 text-sm shadow-sm ${isMe ? 'bg-[#1A361D] text-white rounded-[1.5rem] rounded-tr-sm' : 'bg-white border border-stone-100 text-stone-800 rounded-[1.5rem] rounded-tl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="p-4 bg-white border-t border-stone-200 shrink-0">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <input 
                  type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Написати повідомлення..."
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-full px-6 py-3.5 outline-none focus:border-[#1A361D] focus:ring-4 ring-green-900/10 transition-all text-sm"
                />
                <button onClick={handleSend} disabled={!input.trim()} className="bg-[#D97757] text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#c26647] disabled:opacity-50 transition-colors shadow-md">
                  <Send className="w-5 h-5 -ml-1 mt-0.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}