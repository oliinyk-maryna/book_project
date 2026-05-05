import client from './client';

export const adminApi = {
  getStats:     ()           => client('/admin/stats'),
  getUsers:     (q = '')     => client(`/admin/users${q ? '?q=' + encodeURIComponent(q) : ''}`),
  setUserRole:  (id, role)   => client(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),

  // Книги
  createBook:   (data)       => client('/admin/books', { body: data }),
  updateBook:   (id, data)   => client(`/admin/books/${id}`, { method: 'PUT', body: data }),
  deleteBook:   (id)         => client(`/admin/books/${id}`, { method: 'DELETE' }),

  // Модерація
  deleteReview: (id)         => client(`/admin/reviews/${id}`, { method: 'DELETE' }),
  deleteThread: (id)         => client(`/admin/threads/${id}`, { method: 'DELETE' }),

  // Довідники
  getGenres:    ()           => client('/filters'),
};