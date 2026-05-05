import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Settings, Target, Users } from 'lucide-react';
import { API_URL } from '../../config';

export default function ClubChat({ club, user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // chat | members | settings
  const ws = useRef(null);
  const bottomRef = useRef(null);

  // WebSocket Підключення[cite: 51]
  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = API_URL.replace(/^http/, 'ws') + `/clubs/${club.id}/ws?token=${token}`;
    
    ws.current = new WebSocket(wsUrl);
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'history') setMessages(data.messages || []);
      else if (data.type === 'chat' || data.message_type === 'system') setMessages(prev => [...prev, data]);
    };

    return () => { if (ws.current) ws.current.close(); };
  }, [club.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !ws.current) return;
    ws.current.send(JSON.stringify({ type: 'chat', content: input, message_type: 'text' }));
    setInput('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] max-w-5xl mx-auto bg-white border-x border-stone-200">
      {/* Хедер чату */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-stone-100 bg-[#FAFAF9]">
        <button onClick={onBack} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-stone-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif font-bold text-lg text-stone-900 truncate">{club.name}</h2>
          <p className="text-xs text-stone-500 font-medium">Читаємо: {club.book_title}</p>
        </div>
        
        {/* Навігація всередині клубу */}
        <div className="flex bg-stone-200/50 p-1 rounded-xl">
          {[{id: 'chat', icon: MessageCircle}, {id: 'members', icon: Users}, {id: 'settings', icon: Settings}].map(t => {
            if (t.id === 'settings' && club.user_role !== 'admin') return null;
            return (
              <button 
                key={t.id} onClick={() => setActiveTab(t.id)}
                className={`p-2 rounded-lg transition-colors ${activeTab === t.id ? 'bg-white shadow-sm text-[#1A361D]' : 'text-stone-500 hover:text-stone-800'}`}
              >
                <t.icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </header>

      {/* Контент чату */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/30">
            {messages.map((msg, i) => {
              const isMe = msg.user_id === user.id;
              if (msg.message_type === 'system') return (
                <div key={i} className="text-center"><span className="bg-stone-100 text-stone-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{msg.content}</span></div>
              );
              return (
                <div key={i} className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                  {!isMe && <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center text-xs font-bold text-stone-500 shrink-0">{msg.username[0].toUpperCase()}</div>}
                  <div>
                    {!isMe && <p className="text-[10px] font-bold text-stone-400 mb-1 ml-1">{msg.username}</p>}
                    <div className={`px-5 py-3 text-sm shadow-sm ${isMe ? 'bg-[#1A361D] text-white rounded-[1.5rem] rounded-tr-sm' : 'bg-white border border-stone-100 text-stone-800 rounded-[1.5rem] rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 bg-white border-t border-stone-100">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <input 
                type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Написати повідомлення..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-full px-6 py-3.5 outline-none focus:border-[#1A361D] focus:ring-4 ring-green-900/10 transition-all text-sm"
              />
              <button onClick={sendMessage} disabled={!input.trim()} className="bg-[#D97757] text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#c26647] disabled:opacity-50 transition-colors shadow-md">
                <Send className="w-5 h-5 -ml-1 mt-0.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Для members та settings можна використовувати прості списки на основі ваших старих компонентів */}
      {activeTab !== 'chat' && <div className="p-6 text-center text-stone-500">Налаштування та учасники...</div>}
    </div>
  );
}

// Потрібно додати імпорт MessageCircle зверху в ClubChat
import { MessageCircle } from 'lucide-react';