import client from './client';

// Виносимо базовий URL в окрему змінну для зручності
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const authApi = {
  // ── Стандартна авторизація ──────────────────────────────────────────
  login: (credentials) => client('/login', { body: credentials }),
  register: (userData) => client('/register', { body: userData }),
  getMe: () => client('/profile'),
  
  // ── Завантаження аватара ────────────────────────────────────────────
  uploadAvatar: async (file) => {
    const fd = new FormData();
    // Назва 'avatar' має збігатися з ключем у utils.SaveUploadedFile
    fd.append('avatar', file); 
    
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/me/avatar`, { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` }, 
        body: fd 
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Помилка завантаження аватара');
    }
    return res.json();
  },

  // ── Відновлення пароля ──────────────────────────────────────────────
  forgotPassword: async (email) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  resetPassword: async (token, password) => {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};