import client from './client';

// 1. Створюємо безпечну змінну API_URL
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

if (API_URL.endsWith('/')) {
  API_URL = API_URL.slice(0, -1);
}
if (!API_URL.endsWith('/api')) {
  API_URL += '/api';
}

export const adminApi = {
  // ── Статистика ───────────────────────────────────────────────
  getStats: () => client('/admin/stats'),

  // ── Книги (з пагінацією та пошуком) ─────────────────────────
  getBooks: (page = 1, limit = 10, sort = 'created_at', order = 'DESC', q = '') =>
    client(`/admin/books?page=${page}&limit=${limit}&sort=${sort}&order=${order}&q=${encodeURIComponent(q)}`),

  getBook: (id) => client(`/admin/books/${id}`), 
  
  createBook: (data) => client('/admin/books', { body: data }),
  updateBook: (id, data) => client(`/admin/books/${id}`, { method: 'PUT', body: data }),
  deleteBook: (id) => client(`/admin/books/${id}`, { method: 'DELETE' }),

  // ── Користувачі ──────────────────────────────────────────────
  getUsers: (q = '') =>
    client(`/admin/users${q ? '?q=' + encodeURIComponent(q) : ''}`),
  setUserRole: (id, role) =>
    client(`/admin/users/${id}/role`, { method: 'PUT', body: { role } }),
  deleteUser: (id) =>
    client(`/admin/users/${id}`, { method: 'DELETE' }),

  // ── Відгуки ──────────────────────────────────────────────────
  getReviews: () => client('/admin/reviews'),
  deleteReview: (id) => client(`/admin/reviews/${id}`, { method: 'DELETE' }),

  // ── Клуби ────────────────────────────────────────────────────
  getClubs: () => client('/admin/clubs'),
  deleteClub: (id) => client(`/admin/clubs/${id}`, { method: 'DELETE' }),

  // ── Завантаження зображення ───────────────────────────────────
  uploadImage: async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    
    const token = localStorage.getItem('token');
    
    // 2. Використовуємо наш безпечний API_URL
    const res = await fetch(`${API_URL}/admin/upload`, { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` }, 
        body: fd 
    });
    
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Помилка завантаження'); 
    }
    return res.json();
  },
};