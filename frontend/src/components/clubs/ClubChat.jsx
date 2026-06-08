import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Send, Users, LogOut, Search, UserPlus,
  Hash, EyeOff, X, MoreVertical, Pencil, Trash2, Check, Crown,
} from 'lucide-react';
import { API_URL } from '../../config';
import { clubsApi } from '../../api/clubs.api';
import { userApi } from '../../api/user.api';
import toast from 'react-hot-toast';

/* ─── MemberRow ─────────────────────────────────────────────────── */
function MemberRow({ member, isOwner, currentUserId, clubId, onKick, totalPages }) {
  const isMe = member.user_id === currentUserId;
  // Вираховуємо відсоток прочитаного
  const progress = totalPages ? Math.min(100, ((member.current_page || 0) / totalPages) * 100) : 0;

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-2xl hover:bg-[#E4D8C8]/30 transition-colors">
      <div
        className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: 'var(--c-primary)' }}
      >
        {member.avatar_url
          ? <img src={member.avatar_url} className="w-full h-full object-cover" alt="" />
          : member.username?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--c-text)' }}>{member.username}</p>
          {member.role === 'owner' && <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--c-accent)' }} />}
          {isMe && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
              style={{ background: 'var(--c-primary-muted)', color: 'var(--c-primary)' }}>Ви</span>
          )}
        </div>
        
        {/* Блок прогресу учасника */}
        {totalPages > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-black/10 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--c-primary)' }} />
            </div>
            <span className="text-[10px] font-bold" style={{ color: 'var(--c-text-3)' }}>
              {member.current_page || 0} / {totalPages}
            </span>
          </div>
        )}

      </div>
      {isOwner && !isMe && (
        <button onClick={() => onKick(member.user_id)}
          className="text-xs px-2 py-1 rounded-lg font-bold transition-colors hover:bg-red-100 text-red-500">
          Вигнати
        </button>
      )}
    </div>
  );
}

/* ─── MessageBubble ─────────────────────────────────────────────── */
function MessageBubble({ msg, isMe, showAvatar, onEdit, onDelete }) {
  const isSpoiler  = msg.message_type === 'spoiler';
  const isSystem   = msg.message_type === 'system';
  const isDeleted  = msg.is_deleted;
  const isEdited   = msg.is_edited;
  const [revealed, setRevealed]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  if (isSystem) return (
    <div className="text-center my-2">
      <span className="text-[11px] px-3 py-1 rounded-full"
        style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)' }}>{msg.content}</span>
    </div>
  );

 /* deleted placeholder */
  if (isDeleted) return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} my-1`}>
      <div className="w-6" />
      <div className="max-w-[72%]">
        <div className="px-3 py-2 text-[11px] italic rounded-2xl flex items-center gap-1.5"
          style={{ background: 'var(--c-surface-2)', color: 'var(--c-text-3)', border: '1px solid var(--c-border)' }}>
          🚫 Це повідомлення було видалено
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
      {showAvatar && !isMe ? (
        <div
          className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold text-white shrink-0 mb-1"
          style={{ background: 'var(--c-primary)' }}
        >
          {msg.author_avatar
            ? <img src={msg.author_avatar} className="w-full h-full object-cover" alt="" />
            : msg.author_name?.[0]?.toUpperCase() || msg.username?.[0]?.toUpperCase()}
        </div>
      ) : <div className="w-6" />}

      <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {showAvatar && !isMe && (
          <p className="text-[10px] font-semibold mb-0.5 px-1" style={{ color: 'var(--c-text-3)' }}>
            {msg.author_name || msg.username}
          </p>
        )}

        <div className="flex items-end gap-1">
          {/* Context menu trigger – only for own messages */}
          {isMe && (
            <div className="relative shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="p-1 rounded-full hover:bg-[#E4D8C8]/60"
                style={{ color: 'var(--c-text-3)' }}
              >
                <MoreVertical className="w-3 h-3" />
              </button>
              {menuOpen && (
                <div
                  className="absolute bottom-full right-0 mb-1 w-36 rounded-xl shadow-xl overflow-hidden z-50 border"
                  style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
                >
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(msg); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-[#E4D8C8]/40 transition-colors"
                    style={{ color: 'var(--c-text)' }}
                  >
                    <Pencil className="w-3 h-3" /> Редагувати
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(msg.id || msg.message_id); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Видалити
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={`px-3.5 py-2.5 text-sm leading-relaxed ${isMe ? 'bubble-mine' : 'bubble-theirs'}`}>
            {isSpoiler && !revealed ? (
              <button onClick={() => setRevealed(true)} className="flex items-center gap-1.5 text-xs font-medium opacity-70">
                <EyeOff className="w-3.5 h-3.5" /> Спойлер — натисни, щоб побачити
              </button>
            ) : (
              <span>{msg.content}</span>
            )}
          </div>
        </div>

        <p className="text-[9px] mt-0.5 px-1 flex items-center gap-1" style={{ color: 'var(--c-text-3)' }}>
          {msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
            : ''}
          {isEdited && <span className="italic">(ред.)</span>}
        </p>
      </div>
    </div>
  );
}

/* ─── EditBar ────────────────────────────────────────────────────── */
function EditBar({ msg, onSubmit, onCancel }) {
  const [value, setValue] = useState(msg.content || '');

  const submit = () => {
    if (!value.trim()) return;
    onSubmit(msg.id || msg.message_id, value.trim());
  };

  return (
    <div className="shrink-0 px-3 py-2 flex flex-col gap-1.5"
      style={{ background: 'var(--c-surface-2)', borderTop: '1px solid var(--c-border)' }}>
      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--c-accent)' }}>
        <Pencil className="w-3 h-3" /> Редагування повідомлення
        <button onClick={onCancel} className="ml-auto"><X className="w-3 h-3" style={{ color: 'var(--c-text-3)' }} /></button>
      </div>
      <div className="flex gap-2 items-center">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) submit(); if (e.key === 'Escape') onCancel(); }}
          autoFocus
          className="flex-1 px-4 py-2 rounded-2xl text-sm outline-none"
          style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
        />
        <button onClick={submit} disabled={!value.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-40"
          style={{ background: 'var(--c-primary)' }}>
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── ClubChat ───────────────────────────────────────────────────── */
export default function ClubChat({ club, user, onBack }) {
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [isSpoiler, setIsSpoiler]         = useState(false);
  const [activeTab, setActiveTab]         = useState('chat');
  const [members, setMembers]             = useState([]);
  const [userSearch, setUserSearch]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviteStatus, setInviteStatus]   = useState({});
  const [editingMsg, setEditingMsg]       = useState(null); // { id, content }
  const ws     = useRef(null);
  const bottom = useRef(null);
  const isOwner = club.owner_id === user?.id ||
    members.find(m => m.user_id === user?.id)?.role === 'owner';

  /* ── WebSocket ──────────────────────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = API_URL.replace(/^http/, 'ws') + `/clubs/${club.id}/ws?token=${token}`;
    ws.current  = new WebSocket(wsUrl);

    ws.current.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);

        if (data.type === 'history') {
          setMessages(data.messages || []);
          return;
        }

        if (data.type === 'chat' || data.message_type === 'system') {
          setMessages(prev => [...prev, data]);
          return;
        }

        if (data.type === 'edit') {
          const msgId = data.message_id || data.id;
          setMessages(prev => prev.map(m =>
            (m.id?.toString() === msgId || m.message_id === msgId)
              ? { ...m, content: data.content, is_edited: true }
              : m
          ));
          return;
        }

        if (data.type === 'delete') {
          const msgId = data.message_id || data.id;
          setMessages(prev => prev.map(m =>
            (m.id?.toString() === msgId || m.message_id === msgId)
              ? { ...m, is_deleted: true, content: '' }
              : m
          ));
          return;
        }
      } catch { /* ignore parse errors */ }
    };

    ws.current.onerror = () => toast.error('WebSocket помилка');
    return () => ws.current?.close();
  }, [club.id]);

  useEffect(() => {
    if (activeTab === 'chat') bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  useEffect(() => {
    if (activeTab === 'members') {
      clubsApi.getMembers(club.id).then(setMembers).catch(() => {});
    }
  }, [activeTab, club.id]);

  /* ── User search for invite ─────────────────────────────────── */
  useEffect(() => {
    if (userSearch.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await userApi.searchUsers(userSearch);
        const memberIds = members.map(m => m.user_id);
        setSearchResults((res || []).filter(u => !memberIds.includes(u.id)));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [userSearch, members]);

  /* ── Actions ────────────────────────────────────────────────── */
  const sendMessage = useCallback(() => {
    if (!input.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    ws.current.send(JSON.stringify({
      type: 'chat',
      content: input,
      message_type: isSpoiler ? 'spoiler' : 'text',
    }));
    setInput('');
    setIsSpoiler(false);
  }, [input, isSpoiler]);

const submitEdit = useCallback(async (msgId, newContent) => {
    try {
      await clubsApi.editMessage(club.id, msgId, newContent);
      setEditingMsg(null);
    } catch (e) {
      toast.error('Помилка редагування');
    }
  }, [club.id]);

  const deleteMessage = useCallback(async (msgId) => {
    try {
      await clubsApi.deleteMessage(club.id, msgId);
    } catch (e) {
      toast.error('Помилка видалення');
    }
  }, [club.id]);

  const handleLeave = async () => {
    if (!window.confirm('Покинути спільноту?')) return;
    await clubsApi.leave(club.id);
    onBack();
  };

  const handleKick = async (userId) => {
    try {
      await clubsApi.kickMember(club.id, userId);
      setMembers(m => m.filter(x => x.user_id !== userId));
      toast.success('Учасника видалено');
    } catch { toast.error('Помилка'); }
  };

  const handleInvite = async (uid) => {
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

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div
      className="flex flex-col h-[calc(100dvh-60px-56px)] md:h-[calc(100dvh-60px)]"
      style={{ background: 'var(--c-bg)' }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)' }}
      >
        <button onClick={onBack}
          className="p-2 rounded-xl transition-colors hover:bg-[#E4D8C8]/60"
          style={{ color: 'var(--c-text-2)' }}>
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </button>

        <div
          className="w-9 h-9 rounded-xl overflow-hidden shrink-0"
          style={{ background: 'var(--c-surface-2)' }}
        >
          {club.book_cover
            ? <img src={club.book_cover} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full flex items-center justify-center">
                <Hash className="w-4 h-4" style={{ color: 'var(--c-text-3)' }} />
              </div>}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--c-text)' }}>{club.name}</p>
          <p className="text-[10px]" style={{ color: 'var(--c-text-3)' }}>
            {members.length > 0 ? `${members.length} учасників` : 'Спільнота'}
          </p>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setActiveTab('chat')}
            className="p-2 rounded-xl transition-colors"
            style={activeTab === 'chat'
              ? { background: 'var(--c-primary-muted)', color: 'var(--c-primary)' }
              : { color: 'var(--c-text-3)' }}>
            <Hash className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab('members')}
            className="p-2 rounded-xl transition-colors"
            style={activeTab === 'members'
              ? { background: 'var(--c-primary-muted)', color: 'var(--c-primary)' }
              : { color: 'var(--c-text-3)' }}>
            <Users className="w-4 h-4" />
          </button>
          <button onClick={handleLeave} className="p-2 rounded-xl transition-colors text-red-400 hover:bg-red-50">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Chat tab ─────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-1">
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id || msg.user_id === user?.id;
              const prevSame = i > 0
                && (messages[i - 1].sender_id || messages[i - 1].user_id) === (msg.sender_id || msg.user_id)
                && messages[i - 1].message_type !== 'system';
              return (
                <MessageBubble
                  key={msg.id || msg.message_id || i}
                  msg={msg}
                  isMe={isMe}
                  showAvatar={!prevSame}
                  onEdit={setEditingMsg}
                  onDelete={deleteMessage}
                />
              );
            })}
            <div ref={bottom} />
          </div>

          {/* Edit bar – shown instead of normal input while editing */}
          {editingMsg ? (
            <EditBar
              msg={editingMsg}
              onSubmit={submitEdit}
              onCancel={() => setEditingMsg(null)}
            />
          ) : (
            <div
              className="shrink-0 px-3 py-3"
              style={{ background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)' }}
            >
              {isSpoiler && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <EyeOff className="w-3.5 h-3.5" style={{ color: 'var(--c-accent)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--c-accent)' }}>Режим спойлера</span>
                  <button onClick={() => setIsSpoiler(false)} className="ml-auto">
                    <X className="w-3 h-3" style={{ color: 'var(--c-text-3)' }} />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setIsSpoiler(s => !s)}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
                  style={isSpoiler
                    ? { background: 'var(--c-accent)', color: '#fff' }
                    : { background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text-3)' }}
                >
                  <EyeOff className="w-4 h-4" />
                </button>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Повідомлення..."
                  className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none transition-all"
                  style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white transition-all disabled:opacity-40"
                  style={{ background: 'var(--c-primary)' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Members tab ───────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">

          {/* Invite search (owners only) */}
          {isOwner && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--c-text-2)' }}>Запросити учасника</p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--c-text-3)' }} />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Пошук за ніком..."
                  className="w-full pl-8 pr-4 py-2 rounded-2xl text-xs outline-none"
                  style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                />
              </div>
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center gap-2 py-2 px-1">
                  <div
                    className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: 'var(--c-primary)' }}
                  >
                    {u.avatar_url
                      ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                      : u.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--c-text)' }}>{u.username}</span>
                  <button
                    onClick={() => handleInvite(u.id)}
                    disabled={!!inviteStatus[u.id]}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold text-white disabled:opacity-50"
                    style={{ background: 'var(--c-primary)' }}
                  >
                    {inviteStatus[u.id] === 'done'
                      ? <><Check className="w-3 h-3" />Надіслано</>
                      : <><UserPlus className="w-3 h-3" />Запросити</>}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Members list */}
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--c-text-2)' }}>Учасники ({members.length})</p>
            {members.map(m => (
              <MemberRow
                key={m.user_id}
                member={m}
                isOwner={isOwner}
                currentUserId={user?.id}
                clubId={club.id}
                onKick={handleKick}
                totalPages={club.total_pages || club.TotalPages} /* ДОДАЙТЕ ЦЕЙ РЯДОК */
              />
            ))}
            
          </div>
        </div>
      )}
    </div>
  );
}