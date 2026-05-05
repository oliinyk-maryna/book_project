import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, BookOpen, Users, UserPlus, Calendar, X } from 'lucide-react';
import { userApi } from '../../api/user.api';

const NOTIF_ICONS = {
  club_invite:    { icon: Users,    bg: 'bg-blue-100 text-blue-600' },
  club_status:    { icon: Users,    bg: 'bg-emerald-100 text-emerald-600' },
  milestone:      { icon: Calendar, bg: 'bg-amber-100 text-amber-600' },
  friend_request: { icon: UserPlus, bg: 'bg-purple-100 text-purple-600' },
  review_like:    { icon: BookOpen, bg: 'bg-[#D97757]/20 text-[#D97757]' },
  default:        { icon: Bell,     bg: 'bg-stone-100 text-stone-600' },
};

function timeAgo(ts) {
  const s = (Date.now() - new Date(ts)) / 1000;
  if (s < 60) return 'щойно';
  if (s < 3600) return `${Math.floor(s / 60)} хв тому`;
  if (s < 86400) return `${Math.floor(s / 3600)} год тому`;
  return `${Math.floor(s / 86400)} дн тому`;
}

export default function NotificationPanel({ isLoggedIn }) {
  const [summary, setSummary] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = async () => {
    if (!isLoggedIn) return;
    try {
      const data = await userApi.getNotifications();
      setSummary(data);
    } catch (e) { /* silent fail for background polling */ }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000); // Polling кожні 30с[cite: 25]
    return () => clearInterval(iv);
  }, [isLoggedIn]);

  const markAllRead = async () => {
    await userApi.markAllRead();
    setSummary(prev => prev ? { ...prev, unread_count: 0, notifications: prev.notifications.map(n => ({ ...n, is_read: true })) } : prev);
  };

  const markRead = async (id) => {
    await userApi.markRead(id);
    setSummary(prev => prev ? { ...prev, unread_count: Math.max(0, prev.unread_count - 1), notifications: prev.notifications.map(n => n.id === id ? { ...n, is_read: true } : n) } : prev);
  };

  const handleFriendAction = async (action, requestId, notifId, e) => {
    e.stopPropagation();
    try {
      if (action === 'accept') await userApi.acceptFriendRequest(requestId);
      else await userApi.declineFriendRequest(requestId);
      markRead(notifId);
    } catch (err) { console.error(err); }
  };

  if (!isLoggedIn) return null;
  const unread = summary?.unread_count ?? 0;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900 rounded-full transition-colors">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#D97757] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#FAFAF9]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl shadow-stone-200/50 border border-stone-100 z-50 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-50 bg-stone-50/50">
            <h3 className="font-bold text-stone-900 text-sm">Сповіщення</h3>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-[#1A361D] font-bold hover:underline flex items-center gap-1">
                  <Check className="w-3 h-3" /> Прочитано
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-stone-50">
            {!summary?.notifications?.length ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                <p className="text-stone-400 text-sm font-medium">Немає нових сповіщень</p>
              </div>
            ) : (
              summary.notifications.map(n => {
                const cfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.default;
                const Icon = cfg.icon;
                
                return (
                  <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-stone-50 transition-colors ${!n.is_read ? 'bg-emerald-50/30' : ''}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.title && <p className="text-sm font-bold text-stone-900 leading-tight mb-1">{n.title}</p>}
                      <p className="text-xs text-stone-600 leading-relaxed">{n.body}</p>
                      
                      {n.type === 'friend_request' && !n.is_read && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={(e) => handleFriendAction('accept', n.reference_id, n.id, e)} className="bg-[#1A361D] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#2C5234] transition-colors">
                            Прийняти
                          </button>
                          <button onClick={(e) => handleFriendAction('decline', n.reference_id, n.id, e)} className="bg-stone-100 text-stone-600 text-xs font-bold px-4 py-2 rounded-xl hover:bg-stone-200 transition-colors">
                            Відхилити
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-2">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 bg-[#D97757] rounded-full shrink-0 mt-2" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}