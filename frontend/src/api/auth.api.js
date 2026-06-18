import client from './client';

export const authApi = {
  login: (credentials) => client('/login', { body: credentials }),
  register: (userData) => client('/register', { body: userData }),
    getMe: () => client('/profile'),
  
    uploadAvatar: async (file) => {
    const fd = new FormData();
    // Назва 'avatar' має збігатися з ключем у utils.SaveUploadedFile
    fd.append('avatar', file); 
    
    const token = localStorage.getItem('token');
    const res = await fetch(
      (import.meta.env.VITE_API_URL || 'http://localhost:8080/api') + '/me/avatar',
      { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` }, 
        body: fd 
      }
    );
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'Помилка завантаження аватара');
    }
    return res.json();
  }
};

export const forgotPassword = async (email) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

export const resetPassword = async (token, password) => {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
};

// У кінці auth.api.js додайте:
export const { login, register, getMe, uploadAvatar, forgotPassword, resetPassword } = authApi;