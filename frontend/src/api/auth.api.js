import client from './client';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Якщо URL закінчується на слеш (наприклад .app/), прибираємо його
if (API_URL.endsWith('/')) {
  API_URL = API_URL.slice(0, -1);
}
// Якщо в базовому URL немає /api, автоматично додаємо
if (!API_URL.endsWith('/api')) {
  API_URL += '/api';
}

export const authApi = {
  login: (credentials) => client('/login', { body: credentials }),
  register: (userData) => client('/register', { body: userData }),
  getMe: () => client('/profile'),
  
  uploadAvatar: async (file) => {
    const fd = new FormData();
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

// Експортуємо функції окремо для зручності імпорту в компонентах
export const { 
  login, 
  register, 
  getMe, 
  uploadAvatar, 
  forgotPassword, 
  resetPassword 
} = authApi;