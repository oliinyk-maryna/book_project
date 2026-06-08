import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Circle, BookOpen, Users, UserPlus, Info, MailPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { API_URL } from '../../config';

export default function NotificationPanel({ isLoggedIn }) {
  const [isOpen, setIsOpen]           = useState(false);
  const [notifications, setNotifs]    = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef  = useRef(null);
  const navigate  = useNavigate();

  /* ── Fetch ────────────────────────────────────────────────── */
  const fetchNotifications = async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetch(`${API_URL}/me/notifications`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifs(Array.isArray(data?.notifications) ? data.notifications : []);
        setUnreadCount(data?.unread_count ?? 0);
      }
    } catch (e) {
      console.error('Помилка завантаження сповіщень', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000); 
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  /* ── Close on outside click ─────────────────────────────────── */
  useEffect(() => {
    const h = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── Mark all read ──────────────────────────────────────────── */
  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/me/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Усі сповіщення прочитано');
    } catch (e) {
      console.error(e);
    }
  };

  /* ── Click on a notification ────────────────────────────────── */
  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        await fetch(`${API_URL}/me/notifications/${n.id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
        setUnreadCount(c => Math.max(0, c - 1));
      } catch (e) {
        console.error(e);
      }
    }

    setIsOpen(false);

    if (n.link) {
      navigate(n.link);
    } else if (n.type === 'INVITE_CLUB' || n.type === 'club_invite') {
      navigate('/clubs');
    } else if (n.type === 'JOIN_CLUB' && n.entity_id) {
      navigate(`/clubs`);
    } else if ((n.type === 'follow' || n.type === 'new_follower') && n.actor_id) {
      navigate(`/users/${n.actor_id}`);
    }
  };

/* ── Дія із запрошенням (Прийняти/Відхилити) ────────────────── */
  const handleInviteAction = async (e, notificationId, inviteId, action) => {
    e.stopPropagation(); // Запобігаємо переходу по лінку сповіщення

    try {
      const endpoint = action === 'accept' ? 'accept' : 'reject';
     
      // 1. Надсилаємо запит на прийняття/відхилення клубу
      const res = await fetch(`${API_URL}/invites/${inviteId}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (res.ok) {
        toast.success(action === 'accept' ? 'Ви приєдналися до клубу!' : 'Запрошення відхилено');
        window.dispatchEvent(new Event('app:refresh'));
        
        // 2. Оскільки дію виконано, автоматично маркуємо сповіщення як прочитане
        await fetch(`${API_URL}/me/notifications/${notificationId}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        // 3. Оновлюємо стан локально, щоб кнопки зникли миттєво без перезавантаження
        setNotifs(prev => prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, status: action === 'accept' ? 'accepted' : 'rejected' }
            : n
        ));
        
        // Зменшуємо лічильник нечитаних дзвіночка
        setUnreadCount(c => Math.max(0, c - 1));
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Не вдалося опрацювати запрошення');
      }
    } catch (err) {
      toast.error("Помилка з'єднання");
    }
  };

  /* ── Icon per type ──────────────────────────────────────────── */
  const getIcon = (type) => {
    switch (type) {
      case 'new_follower':
      case 'follow':
        return <UserPlus className="w-5 h-5 text-emerald-500" />;
      case 'INVITE_CLUB':
      case 'club_invite':
        return <MailPlus className="w-5 h-5 text-indigo-500" />;
      case 'JOIN_CLUB':
        return <Users className="w-5 h-5 text-amber-500" />;
      case 'club_reminder':
        return <Users className="w-5 h-5 text-amber-500" />;
      case 'book_update':
        return <BookOpen className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-stone-400" />;
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-stone-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-stone-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50/50">
            <h3 className="font-serif font-bold text-lg text-stone-900">Сповіщення</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-bold text-[#2C5234] hover:underline flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Прочитати все
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-stone-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">У вас немає нових сповіщень</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
                    !n.is_read ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="shrink-0 mt-1">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-bold text-stone-900' : 'font-medium text-stone-700'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-snug">{n.body}</p>
                    <p className="text-[10px] text-stone-400 mt-1 font-medium tracking-wide">
                      {new Date(n.created_at).toLocaleDateString('uk-UA', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    
                    {/* КНОПКИ ДЛЯ ЗАПРОШЕННЯ В КЛУБ */}
                    {/* КНОПКИ ДЛЯ ЗАПРОШЕННЯ В КЛУБ */}
                    {(n.type === 'INVITE_CLUB' || n.type === 'club_invite') && (
                      <div className="mt-2.5">
                        {/* СУВОРА ПЕРЕВІРКА: текст показуємо ТІЛЬКИ якщо статус конкретно прийнято або відхилено */}
                        {n.status === 'accepted' || n.status === 'rejected' ? (
                          <p className="text-xs font-semibold text-stone-400 italic bg-stone-50 px-2.5 py-1 rounded-lg inline-block border border-stone-100">
                            {n.status === 'accepted' ? '✓ Запрошення прийнято' : '✕ Запрошення відхилено'}
                          </p>
                        ) : (
                          // У всіх інших випадках (pending, порожній рядок, помилка пошуку) показуємо кнопки
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleInviteAction(e, n.id, n.entity_id, 'accept')}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              Прийняти
                            </button>
                            <button
                              onClick={(e) => handleInviteAction(e, n.id, n.entity_id, 'reject')}
                              className="px-3 py-1.5 bg-stone-200 text-stone-700 text-xs font-medium rounded-lg hover:bg-stone-300 transition-colors"
                            >
                              Відхилити
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {!n.is_read && <Circle className="w-2.5 h-2.5 fill-[#2C5234] text-[#2C5234] shrink-0 mt-2" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}