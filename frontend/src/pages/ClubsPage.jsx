import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { 
  Users, Plus, Send, Loader2, ArrowLeft, Info, BookOpen, 
  Clock, Hash, X, Lock, Globe, Trash2, 
  Edit3, UserMinus, Check, AlertCircle, AlertTriangle, Crown, 
  MoreVertical, Pencil, UserPlus, EyeOff, MessageCircle, Search 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '../config';
import { clubsApi } from '../api/clubs.api';
import CreateClubModal from '../components/clubs/CreateClubModal'; 
import { userApi } from '../api/user.api';

const STATUS_LABELS = {
  recruiting: { label: 'Набір', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  active:     { label: 'Читаємо', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  discussing: { label: 'Обговорення', color: 'bg-orange-50 text-orange-700 border border-orange-200' },
  closed:     { label: 'Закрито', color: 'bg-gray-100 text-gray-600 border border-gray-300' },
};

const calculateProgress = (current, total) => { 
  if (!total || total === 0) return 0; 
  return Math.min(100, Math.round((current / total) * 100)); 
};

const getDaysLeft = (dateString) => { 
  if (!dateString) return null; 
  const diff = new Date(dateString) - new Date(); 
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24)); 
  return days > 0 ? days : 0; 
};

/* ─── ConfirmModal ──────────────────────────────────────────────── */
function ConfirmModal({ title, body, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm mb-6">{body}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Скасувати</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 shadow-sm">Підтвердити</button>
        </div>
      </div>
    </div>
  );
}

/* ─── ClubCard ──────────────────────────────────────────────────── */
function ClubCard({ club, onEnter }) {
  const st = STATUS_LABELS[club.status] || STATUS_LABELS.recruiting;
  return (
    <div className="rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col h-full border border-slate-100 relative bg-white" onClick={() => onEnter(club)}>
      <div className="relative h-28 overflow-hidden flex items-end px-4 pb-3 bg-slate-900">
        {club.book_cover ? (
          <img src={club.book_cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35 blur-[2px] scale-105 group-hover:scale-110 transition-transform duration-500" />
        ) : <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-800 opacity-50" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
        <div className="relative z-10 flex items-center gap-1.5 text-white w-full ml-[70px]">
          {club.is_private && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          <h3 className="font-serif font-bold text-base md:text-lg leading-tight line-clamp-1 group-hover:text-amber-100 transition-colors">{club.name}</h3>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 relative">
        <div className="flex gap-3.5 mb-4">
          <div className="w-14 h-20 -mt-10 rounded-xl shadow-lg shrink-0 overflow-hidden relative z-20 bg-slate-100 border-2 border-white transition-transform group-hover:scale-105 duration-300">
            {club.book_cover ? <img src={club.book_cover} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400"><BookOpen className="w-5 h-5"/></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 truncate">{club.book_title || 'Книга не вибрана'}</p>
            <p className="text-xs font-medium text-slate-400 mt-0.5 truncate">Автор: {club.book_author || 'Не вказано'}</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 line-clamp-2 mb-4 flex-1 leading-relaxed">{club.description || 'Клуб без опису.'}</p>
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${st.color}`}>{st.label}</span>
          <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
            <Users className="w-3.5 h-3.5 text-slate-400" /> <span>{club.members_count || 1} / {club.max_members || '∞'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MemberRow ─────────────────────────────────────────────────── */
function MemberRow({ member, isOwner, currentUserId, onKick, totalPages }) {
  const isMe = member.user_id === currentUserId;
  const progress = totalPages ? Math.min(100, ((member.current_page || 0) / totalPages) * 100) : 0;

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-2xl hover:bg-slate-100 transition-colors">
      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0 bg-indigo-600">
        {member.avatar_url ? <img src={member.avatar_url} className="w-full h-full object-cover" alt="" /> : member.username?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold truncate text-slate-800">{member.username}</p>
          {['owner', 'admin'].includes(member.role) && <Crown className="w-3.5 h-3.5 shrink-0 text-amber-500" />}
          {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-indigo-100 text-indigo-700">Ви</span>}
        </div>
        {totalPages > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-500 bg-indigo-600" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] font-bold text-slate-500">{member.current_page || 0} / {totalPages}</span>
          </div>
        )}
      </div>
      {isOwner && !isMe && (
        <button onClick={() => onKick(member.user_id)} className="text-xs px-2 py-1 rounded-lg font-bold transition-colors hover:bg-red-100 text-red-500">Вигнати</button>
      )}
    </div>
  );
}

/* ─/* ─── MessageBubble ─────────────────────────────────────────────── */
function MessageBubble({ msg, isMe, showAvatar, onEdit, onDelete }) {
  const isSpoiler = msg.message_type === 'spoiler';
  const isSystem = msg.message_type === 'system' || msg.type === 'system';
  const isDeleted = msg.is_deleted;
  const [revealed, setRevealed] = useState(false);

  if (isSystem) return (
    <div className="text-center my-2">
      <span className="text-[11px] px-3 py-1.5 rounded-full bg-slate-200/50 text-slate-500 border border-slate-200">{msg.content}</span>
    </div>
  );

  if (isDeleted) return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} my-1`}>
      {!isMe && <div className="w-7 shrink-0" />}
      <div className="text-xs text-slate-400 italic py-1 px-2">Повідомлення видалено</div>
    </div>
  );

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
      
      {/* Аватар показуємо ТІЛЬКИ для чужих повідомлень (або відступ, щоб вирівняти текст) */}
      {!isMe && (
        showAvatar ? (
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shrink-0 mb-1 bg-indigo-600 shadow-sm">
            {msg.author_avatar ? <img src={msg.author_avatar} className="w-full h-full object-cover" alt="" /> : msg.author_name?.[0]?.toUpperCase() || msg.username?.[0]?.toUpperCase() || '?'}
          </div>
        ) : (
          <div className="w-7 shrink-0" />
        )
      )}

      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        
        {/* Ім'я автора (збільшений шрифт, показуємо тільки для чужих повідомлень) */}
        {showAvatar && !isMe && (
          <p className="text-xs font-bold mb-1 pl-1 text-slate-500 tracking-wide">
            {msg.author_name || msg.username || 'Анонім'}
          </p>
        )}
        
        <div className="flex items-end gap-1.5 w-full justify-end group">
          
          {/* Відкриті кнопки дій (Редагування / Видалення) для власних повідомлень при наведенні */}
          {isMe && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-200 self-center mr-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
              <button 
                onClick={() => onEdit(msg)} 
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-indigo-600 transition-colors" 
                title="Редагувати"
              >
                <Edit3 className="w-3.5 h-3.5"/>
              </button>
              <button 
                onClick={() => onDelete(msg.id || msg.message_id)} 
                className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-500 transition-colors" 
                title="Видалити"
              >
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
          )}

          <div className={`px-4 py-2.5 text-sm rounded-xl shadow-sm relative leading-relaxed ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
            {isSpoiler && !revealed ? (
              <button onClick={() => setRevealed(true)} className="flex items-center gap-1.5 text-xs font-medium opacity-80"><EyeOff className="w-3.5 h-3.5" /> Спойлер — натисни</button>
            ) : <span className="whitespace-pre-wrap break-words">{msg.content}</span>}
          </div>
        </div>
        
        <p className={`text-[9px] mt-1 px-1 text-slate-400 flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : ''}
          {msg.is_edited && <span className="font-semibold italic opacity-80">(ред.)</span>}
        </p>
      </div>
    </div>
  );
}

/* ─── ClubChat ──────────────────────────────────────────────────── */
function ClubChat({ club, currentUser, onBack, onUpdate }) {
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [isSpoiler, setIsSpoiler]         = useState(false);
  const [activeTab, setActiveTab]         = useState('chat');
  const [members, setMembers]             = useState([]);
  const [userSearch, setUserSearch]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviteStatus, setInviteStatus]   = useState({});
  const [editingMsg, setEditingMsg]       = useState(null); 
  const [showInfo, setShowInfo]           = useState(window.innerWidth >= 1024);
  const [discussionDate, setDiscussionDate] = useState(club?.discussion_date || '');
  const [confirm, setConfirm]             = useState(null);

  const ws = useRef(null);
  const bottom = useRef(null);
  const token = localStorage.getItem('token');

  // Надійна перевірка прав адміністратора
  const isClubAdmin = club?.user_role === 'admin' || club?.user_role === 'moderator' || club?.user_role === 'owner' || club?.creator_id === currentUser?.id;

  const fetchMembers = useCallback(() => {
    if (!club?.id) return;
    clubsApi.getMembers(club.id).then(data => setMembers(data)).catch(() => {});
  }, [club?.id]);

  /* ── WebSocket ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!club?.id) return;
    fetchMembers();
    
    const wsUrl = API_URL.replace(/^http/, 'ws') + `/clubs/${club.id}/ws?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'history') setMessages(data.messages || []);
          else if (data.type === 'chat' || data.message_type === 'system') setMessages(prev => [...prev, data]);
          else if (data.type === 'delete') {
              const targetId = data.message_id || data.id;
              setMessages(prev => prev.map(m => (m.id === targetId || m.message_id === targetId) ? { ...m, is_deleted: true, content: '' } : m));
          }
          else if (data.type === 'edit') {
              const targetId = data.message_id || data.id;
              setMessages(prev => prev.map(m => (m.id === targetId || m.message_id === targetId) ? { ...m, content: data.content, is_edited: true } : m));
          }
        } catch {}
    };
    return () => { if (ws.current) ws.current.close(); };
  }, [club?.id, token, fetchMembers]);

  useEffect(() => { if (activeTab === 'chat') bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeTab]);

  /* ── User search for invite ─────────────────────────────────── */
  useEffect(() => {
    if (userSearch.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await userApi.searchUsers(userSearch);
        const memberIds = members.map(m => m.user_id);
        setSearchResults((res || []).filter(u => !memberIds.includes(u.id)));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [userSearch, members]);

  /* ── Actions ────────────────────────────────────────────────── */
  const sendMessage = useCallback(() => {
    if (!input.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({ type: 'chat', content: input, message_type: isSpoiler ? 'spoiler' : 'text' }));
    setInput('');
    setIsSpoiler(false);
  }, [input, isSpoiler]);

  const submitEdit = async () => {
    if (!editInput.trim() || !editingMsg || !club?.id) return;
    const msgId = editingMsg.id || editingMsg.message_id;
    try {
      await clubsApi.editMessage(club.id, msgId, editInput);
      setEditingMsg(null);
    } catch { toast.error('Помилка редагування'); }
  };

  const deleteMessage = async (msgId) => {
    if (!club?.id) return;
    try { await clubsApi.deleteMessage(club.id, msgId); } catch { toast.error('Помилка видалення'); }
  };

  const handleUpdateDate = async (newDate) => {
    try {
      const res = await fetch(`${API_URL}/clubs/${club.id}/discussion-date`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: newDate })
      });
      if (res.ok) {
        toast.success("Дату оновлено!");
        setDiscussionDate(newDate);
        if (onUpdate) onUpdate();
      } else toast.error("Помилка збереження дати");
    } catch { toast.error("Помилка"); }
  };

  const handleLeaveOrDeleteClub = async () => {
    try {
      const endpoint = isClubAdmin ? `${API_URL}/clubs/${club.id}` : `${API_URL}/clubs/${club.id}/leave`;
      const res = await fetch(endpoint, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        toast.success(isClubAdmin ? "Клуб видалено" : "Ви вийшли з клубу");
        onBack();
        if (onUpdate) onUpdate();
      }
    } catch { toast.error("Помилка"); }
  };

  const handleKickMember = async (userId) => {
    if (!club?.id) return;
    try {
      await clubsApi.kickMember(club.id, userId);
      setMembers(m => m.filter(x => x.user_id !== userId));
      toast.success('Учасника видалено');
    } catch { toast.error('Помилка'); }
  };

  const handleInvite = async (uid) => {
    if (!club?.id) return;
    setInviteStatus(s => ({ ...s, [uid]: 'loading' }));
    try {
      await clubsApi.invite(club.id, uid);
      setInviteStatus(s => ({ ...s, [uid]: 'done' }));
      toast.success('Запрошення надіслано!');
    } catch {
      setInviteStatus(s => ({ ...s, [uid]: 'error' }));
      toast.error('Помилка');
    }
  };

  const daysLeft = getDaysLeft(discussionDate);
  const [editInput, setEditInput] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex flex-col md:relative md:h-[82vh] md:min-h-[620px] md:flex-row md:rounded-3xl md:overflow-hidden md:border md:shadow-xl bg-slate-50 border-slate-200">
      {confirm && <ConfirmModal title={confirm.title} body={confirm.body} onConfirm={() => { confirm.action(); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
      
      {/* ── ЛІВА ПАНЕЛЬ (Чат або Учасники) ── */}
      <div className={`flex-1 flex flex-col h-full bg-slate-100 transition-all ${showInfo && 'hidden lg:flex'}`}>
        <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-slate-200 z-10 shadow-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-5 h-5"/></button>
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 overflow-hidden">
              {club?.book_cover ? <img src={club.book_cover} className="w-full h-full object-cover" alt=""/> : <Hash className="w-5 h-5 text-indigo-200"/>}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-800 truncate">{club?.name}</h2>
              <p className="text-[11px] text-indigo-600 font-semibold uppercase">{members.length} учасників</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={() => setActiveTab('chat')} className={`p-2 rounded-xl ${activeTab === 'chat' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}><MessageCircle className="w-5 h-5"/></button>
            <button onClick={() => setActiveTab('members')} className={`p-2 rounded-xl ${activeTab === 'members' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}><Users className="w-5 h-5"/></button>
            <button onClick={() => setShowInfo(!showInfo)} className={`p-2 rounded-xl ${showInfo ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Info className="w-5 h-5"/></button>
          </div>
        </div>

        {/* Зміст вкладки */}
        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-50">
              {messages.map((msg, i) => {
                const isMe = msg.sender_id === currentUser?.id || msg.user_id === currentUser?.id;
                const prevSame = i > 0 && (messages[i - 1].sender_id || messages[i - 1].user_id) === (msg.sender_id || msg.user_id) && messages[i - 1].message_type !== 'system';
                return (
                  <MessageBubble key={msg.id || msg.message_id || i} msg={msg} isMe={isMe} showAvatar={!prevSame} onEdit={(m) => { setEditingMsg(m); setEditInput(m.content); }} onDelete={deleteMessage} />
                );
              })}
              <div ref={bottom} />
            </div>

            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              {editingMsg ? (
                <div className="flex flex-col gap-2 p-2 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-bold text-indigo-700 px-1">
                    <span>Редагування повідомлення</span>
                    <button onClick={() => setEditingMsg(null)} className="hover:bg-indigo-100 p-1 rounded-md"><X className="w-3.5 h-3.5"/></button>
                  </div>
                  <div className="flex gap-2 items-end">
                    <textarea value={editInput} onChange={e => setEditInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); submitEdit();}}} rows={1} className="flex-1 min-h-[40px] max-h-[100px] border border-indigo-200 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm outline-none bg-white font-medium resize-none custom-scrollbar" />
                    <button onClick={submitEdit} disabled={!editInput.trim()} className="w-10 h-10 flex items-center justify-center p-0 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 shrink-0"><Check className="w-5 h-5"/></button>
                  </div>
                </div>
              ) : (
                <>
                  {isSpoiler && (
                    <div className="flex items-center gap-2 mb-2 px-2 text-xs font-semibold text-amber-600">
                      <EyeOff className="w-4 h-4" /> Режим спойлера увімкнено
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <button onClick={() => setIsSpoiler(!isSpoiler)} className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSpoiler ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><EyeOff className="w-5 h-5" /></button>
                    <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Напишіть повідомлення..." rows={1} className="flex-1 min-h-[40px] max-h-[100px] border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none resize-none font-medium custom-scrollbar" />
                    <button onClick={sendMessage} disabled={!input.trim()} className="w-10 h-10 flex items-center justify-center p-0 bg-indigo-600 text-white rounded-xl disabled:opacity-40 shrink-0 hover:bg-indigo-700"><Send className="w-5 h-5 ml-0.5" /></button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-6">
            {isClubAdmin && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-800 mb-3">Запросити учасника</p>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Пошук за ніком..." className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map(u => (
                      <div key={u.id} className="flex items-center gap-3 py-1 px-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover rounded-full" alt="" /> : u.username?.[0]?.toUpperCase()}</div>
                        <span className="flex-1 text-sm font-semibold text-slate-800">{u.username}</span>
                        <button onClick={() => handleInvite(u.id)} disabled={!!inviteStatus[u.id]} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                          {inviteStatus[u.id] === 'done' ? <><Check className="w-3.5 h-3.5" />Надіслано</> : <><UserPlus className="w-3.5 h-3.5" />Запросити</>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div>
              <p className="text-xs font-bold mb-3 text-slate-500 uppercase tracking-wider">Учасники ({members.length})</p>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {members.map(m => (
                  <MemberRow key={m.user_id} member={m} isOwner={isClubAdmin} currentUserId={currentUser?.id} onKick={() => setConfirm({title:"Вилучити учасника?", body:`Вилучити ${m.username}?`, action: () => handleKickMember(m.user_id)})} totalPages={club?.total_pages || club?.TotalPages} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ПРАВА ПАНЕЛЬ (Інформація) ── */}
      {showInfo && (
        <div className="w-full lg:w-[320px] shrink-0 h-full flex flex-col absolute lg:relative inset-0 z-20 bg-white border-l border-slate-200 animate-in slide-in-from-right-5 lg:slide-in-from-right-0">
          <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100 lg:h-[65px] bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm"><Info className="w-4 h-4 text-indigo-600"/> Інформація про клуб</div>
            <button onClick={() => setShowInfo(false)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 lg:hidden text-slate-500"><X className="w-4 h-4"/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
            <div className="flex flex-col items-center text-center pb-5 border-b border-slate-100">
              <div className="w-24 h-36 rounded-xl shadow-md overflow-hidden mb-3 border border-slate-100 bg-slate-50 flex items-center justify-center">
                {club?.book_cover ? <img src={club.book_cover} className="w-full h-full object-cover" alt=""/> : <BookOpen className="w-8 h-8 text-slate-300"/>}
              </div>
              <h4 className="font-serif font-bold text-slate-800 text-base leading-snug">{club?.book_title || 'Без книги'}</h4>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-xs text-slate-700"><Clock className="w-3.5 h-3.5 text-indigo-600"/> Фінал обговорення</span>
                {!isClubAdmin && <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">{discussionDate ? new Date(discussionDate).toLocaleDateString() : 'Не задано'}</span>}
              </div>
              {isClubAdmin && <input type="date" value={discussionDate ? discussionDate.split('T')[0] : ''} onChange={(e) => handleUpdateDate(e.target.value)} className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl text-slate-700 outline-none bg-white cursor-pointer"/>}
              {daysLeft !== null && (
                <div className="pt-2 border-t border-slate-200/60">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Залишилось:</p>
                  <p className="text-xl font-black text-amber-600">{daysLeft} <span className="text-xs text-slate-400 font-sans font-semibold">днів</span></p>
                </div>
              )}
            </div>

            {isClubAdmin && club?.invite_code && (
              <div className="p-4 bg-slate-900 rounded-xl shadow-sm text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Код доступу до клубу</p>
                <p className="text-xl font-black text-amber-400 tracking-widest">{club.invite_code}</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button onClick={() => setConfirm({title: isClubAdmin?"Видалити клуб?":"Покинути клуб?", body: isClubAdmin?"Клуб буде видалено повністю.":"Ви вийдете з клубу.", action: handleLeaveOrDeleteClub})} className="w-full py-2.5 bg-red-50 text-red-600 hover:bg-red-100/80 border border-red-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {isClubAdmin ? "Видалити клуб" : "Покинути клуб"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Головний компонент ClubsPage ──────────────────────────────── */
export default function ClubsPage({ currentUser, isLoggedIn }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeClubId = searchParams.get('club');
  
  const [clubs, setClubs] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefilledBook, setPrefilledBook] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const res = await fetch(`${API_URL}/clubs`, { headers });
      if (res.ok) {
        const data = await res.json() || [];
        setClubs(data.filter(club => club.user_role && club.user_role !== ''));
      }
      
      if (isLoggedIn && clubsApi.getMyInvites) {
        try {
          const invitesData = await clubsApi.getMyInvites();
          setInvites(Array.isArray(invitesData) ? invitesData : []);
        } catch(e) { console.warn("Invites err", e); }
      }
      
    } catch (e) { 
      toast.error("Не вдалося завантажити дані");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchClubs(); }, [isLoggedIn]);

  useEffect(() => {
    if (location.state?.openCreate && location.state?.book) {
      setPrefilledBook(location.state.book);
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim() || !isLoggedIn) {
      if (!isLoggedIn) toast.error("Будь ласка, авторизуйтесь в системі");
      return;
    }
    
    setIsJoining(true);
    try {
      const res = await fetch(`${API_URL}/join/${inviteCode.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (res.ok) {
        toast.success('Ви приєдналися до спільноти!');
        setInviteCode('');
        fetchClubs(); 
      } else {
        toast.error('Недійсний код або ви вже є учасником цього клубу');
      }
    } catch (e) { toast.error("Помилка зв'язку з сервером"); } 
    finally { setIsJoining(false); }
  };

  const handleInviteAction = async (inviteId, action) => {
    try {
      if (action === 'accept') {
        await clubsApi.acceptInvite(inviteId);
        toast.success('Ви приєдналися до спільноти!');
      } else {
        await clubsApi.rejectInvite(inviteId);
        toast.success('Запрошення відхилено');
      }
      fetchClubs();
    } catch { toast.error("Помилка"); }
  };

  // БЕЗПЕЧНА ПЕРЕВІРКА АКТИВНОГО КЛУБУ (перетворюємо все на string для точного порівняння)
  const activeClub = clubs.find(c => String(c.id) === String(activeClubId));

  // Якщо в URL є ID, але клуби ще вантажаться — показуємо лоадер
  if (activeClubId && loading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  }

  // Якщо клуб знайдено — відкриваємо чат
  if (activeClub) {
    return <ClubChat club={activeClub} onBack={() => setSearchParams({})} currentUser={currentUser} onUpdate={fetchClubs} />;
  }

  // Інакше — головна сторінка клубів
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Мої спільноти
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Обговорюйте улюблені сюжети, стежте за прогресом однодумців та читайте разом.
          </p>
        </div>
        
        <button
          onClick={() => { setPrefilledBook(null); setIsModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all hover:-translate-y-0.5 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" /> Створити спільноту
        </button>
      </div>

      {invites.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl mb-6">
          <h3 className="font-bold text-indigo-900 mb-3 text-sm uppercase tracking-wider">Нові запрошення ({invites.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {invites.map(inv => (
              <div key={inv.id} className="p-3 bg-white rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800">{inv.club_name || 'Клуб'}</p>
                  <p className="text-xs text-slate-500">Від: {inv.invited_by_username || inv.InvitedBy || 'Невідомо'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleInviteAction(inv.id, 'accept')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">Прийняти</button>
                  <button onClick={() => handleInviteAction(inv.id, 'reject')} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600">Відхилити</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <Hash className="w-4 h-4 text-indigo-600" /> Маєте код доступу?
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Введіть унікальний ключ закритих клубів, наданий адміністратором, для швидкого входу.
            </p>
            <form onSubmit={handleJoinByCode} className="space-y-3">
              <input
                type="text"
                placeholder="НАПРИКЛАД: B79X2"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 focus:border-indigo-500 rounded-xl outline-none font-black tracking-widest uppercase text-slate-800 placeholder:font-sans placeholder:tracking-normal placeholder:font-medium text-sm text-center"
              />
              <button
                type="submit"
                disabled={isJoining || !inviteCode.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all duration-200"
              >
                {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Приєднатись'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Завантаження ваших клубів...</p>
            </div>
          ) : clubs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-6">
              <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-sm"><BookOpen className="w-6 h-6" /></div>
              <h3 className="font-bold text-base text-slate-800">У вас поки немає активних клубів</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Знайдіть потрібну книгу в каталозі та увійдіть в діючу спільноту або зберіть власну групу читачів прямо зараз!
              </p>
              <button onClick={() => { setPrefilledBook(null); setIsModalOpen(true); }} className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors">
                Організувати перший клуб
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {clubs.map((club) => (
                <ClubCard key={club.id} club={club} onEnter={(selected) => setSearchParams({ club: selected.id })} />
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && <CreateClubModal onClose={() => { setIsModalOpen(false); setPrefilledBook(null); }} initialBook={prefilledBook} onCreated={() => { setIsModalOpen(false); setPrefilledBook(null); fetchClubs(); }} />}
    </div>
  );
}