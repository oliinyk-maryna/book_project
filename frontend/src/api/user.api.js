import client from './client';

export const userApi = {
  // Профіль
  getProfile:    ()     => client('/profile'),
  updateProfile: (data) => client('/profile/update', { method: 'PUT', body: data }),

  // Бібліотека
  getBooks:    ()         => client('/me/books'),
  addBook:     (data)     => client('/me/books', { body: data }),
  updateBook:  (id, data) => client(`/me/books/${id}`, { method: 'POST', body: data }),
  updateProgress: (id, data) => client(`/me/books/${id}/progress`, { method: 'PATCH', body: data }),
  removeBook:  (id)       => client(`/me/books/${id}`, { method: 'DELETE' }),
  addSession:  (id, data) => client(`/me/books/${id}/sessions`, { body: data }),

  // Статистика
  getStats:    ()         => client('/me/stats'),
  getCalendar: (year)     => client(`/me/calendar?year=${year || new Date().getFullYear()}`),
  getStreak:   ()         => client('/me/streak'),
  setGoal:     (data)     => client('/me/goals', { body: data }),
  getGoal:     ()         => client('/me/goals'),

  // Кастомні полиці
  getShelves:      ()                    => client('/me/shelves'),
  createShelf:     (data)               => client('/me/shelves', { body: data }),
  deleteShelf:     (id)                 => client(`/me/shelves/${id}`, { method: 'DELETE' }),
  addToShelf:      (shelfId, workId)    => client(`/me/shelves/${shelfId}/books`, { body: { work_id: workId } }),
  removeFromShelf: (shelfId, bookId)    => client(`/me/shelves/${shelfId}/books/${bookId}`, { method: 'DELETE' }),

  // Цитати
  getMyQuotes:  ()     => client('/me/quotes'),
  addQuote:     (data) => client('/me/quotes', { body: data }),
  deleteQuote:  (id)   => client(`/me/quotes/${id}`, { method: 'DELETE' }),

  // Рекомендації (OpenAI)
  getRecommendations: (data) => client('/me/recommendations', { body: data || {} }),
  getPersonalized:    ()     => client('/me/recommendations/personalized'),

  // Сповіщення
  getNotifications: () => client('/me/notifications'),
  markAllRead:      () => client('/me/notifications/read-all', { method: 'POST' }),
  markRead:         (id) => client(`/me/notifications/${id}/read`, { method: 'PATCH' }),

  // Стрічка активності
  getFeed:             ()   => client('/me/feed'),
  getFriendRequests:   ()   => client('/me/friend-requests'),
  acceptFriendRequest: (id) => client(`/me/friend-requests/${id}/accept`, { method: 'POST' }),
  declineFriendRequest:(id) => client(`/me/friend-requests/${id}/decline`, { method: 'POST' }),

  // DM
  getConversations:    ()            => client('/me/conversations'),
  getConversationMsgs: (id)          => client(`/me/conversations/${id}`),
  sendDM:              (id, content) => client(`/me/conversations/${id}`, { body: { content } }),
  startConversation:   (uid, content)=> client(`/me/conversations/start/${uid}`, { body: { content } }),

  // Соціальне
  searchUsers:       (q)  => client(`/users/search?q=${encodeURIComponent(q)}`),
  getUser:           (id) => client(`/users/${id}/profile`),
  follow:            (id) => client(`/users/${id}/follow`, { method: 'POST' }),
  unfollow:          (id) => client(`/users/${id}/follow`, { method: 'DELETE' }),
  sendFriendRequest: (id) => client(`/users/${id}/friend-request`, { method: 'POST' }),
};