
import { useEffect, useRef, useState, useCallback } from 'react';
import { clubsApi } from '../api/clubs.api';
import { API_URL } from '../config';

export const useChat = (clubId) => {
  const [messages, setMessages]   = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const ws = useRef(null);
  const typingTimer = useRef(null);

  const addMessage = useCallback((msg) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id || m.id === msg.message_id)) return prev;
      return [...prev, {
        id: msg.id || msg.message_id || Date.now().toString(),
        user_id: msg.user_id,
        username: msg.username,
        content: msg.content,
        type: msg.message_type || msg.type || 'text',
        page_ref: msg.page_ref,
        created_at: msg.timestamp || msg.created_at || new Date().toISOString(),
      }];
    });
  }, []);

  useEffect(() => {
    if (!clubId) return;
    // Завантажуємо REST-повідомлення
    clubsApi.getMessages(clubId).then(data => {
      if (Array.isArray(data)) setMessages(data);
    }).catch(() => {});

    const token = localStorage.getItem('token');
    if (!token) return;

    const wsBase = API_URL.replace(/^http/, 'ws');
    const wsUrl  = `${wsBase}/clubs/${clubId}/ws?token=${token}`;

    const connect = () => {
      if (ws.current?.readyState === WebSocket.OPEN) return;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen  = () => setIsConnected(true);
      ws.current.onclose = () => { setIsConnected(false); setTimeout(connect, 3000); };
      ws.current.onerror = () => ws.current?.close();

      ws.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'history' && msg.messages) {
            setMessages(msg.messages);
          } else if (msg.type === 'chat') {
            addMessage(msg);
          } else if (msg.type === 'typing') {
            const uid = msg.user_id;
            if (msg.is_typing) {
              setTypingUsers(p => p.some(u => u.user_id === uid) ? p : [...p, { user_id: uid, username: msg.username }]);
            } else {
              setTypingUsers(p => p.filter(u => u.user_id !== uid));
            }
          } else if (msg.type === 'system') {
            addMessage({ ...msg, id: Date.now().toString(), type: 'system' });
          }
        } catch {}
      };
    };

    connect();
    return () => { ws.current?.close(); clearTimeout(typingTimer.current); };
  }, [clubId, addMessage]);

  const sendMessage = useCallback((content, msgType = 'text', pageRef = null) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return false;
    ws.current.send(JSON.stringify({
      type: 'chat',
      content,
      message_type: msgType,
      page_ref: pageRef,
    }));
    return true;
  }, []);

  const sendTyping = useCallback((isTyping) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
    }
    clearTimeout(typingTimer.current);
    if (isTyping) {
      typingTimer.current = setTimeout(() => sendTyping(false), 2000);
    }
  }, []);

  const loadMore = useCallback(async (beforeId) => {
    const older = await clubsApi.getMessages(clubId, beforeId);
    if (Array.isArray(older)) {
      setMessages(prev => [...older, ...prev]);
    }
    return older?.length || 0;
  }, [clubId]);

  return { messages, isConnected, typingUsers, sendMessage, sendTyping, loadMore };
};