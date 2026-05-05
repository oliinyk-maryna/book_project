import client from './client';

export const booksApi = {
  // Каталог з повними фільтрами
  getAll: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search)    q.set('search', params.search);
    if (params.sort)      q.set('sort', params.sort);
    if (params.yearFrom)  q.set('year_from', params.yearFrom);
    if (params.yearTo)    q.set('year_to', params.yearTo);
    if (params.limit)     q.set('limit', params.limit);
    if (params.offset)    q.set('offset', params.offset);
    if (params.author)    q.set('author', params.author);
    if (params.ratingMin) q.set('rating_min', params.ratingMin);
    if (params.pageMin)   q.set('page_min', params.pageMin);
    if (params.pageMax)   q.set('page_max', params.pageMax);
    (params.genres     || []).forEach(g => q.append('genres', g));
    (params.languages  || []).forEach(l => q.append('languages', l));
    (params.publishers || []).forEach(p => q.append('publishers', p));
    const qs = q.toString();
    return client(`/books${qs ? '?' + qs : ''}`);
  },

  getOne:        (id)  => client(`/books/${id}`),
  search:        (q)   => client(`/books/search?q=${encodeURIComponent(q)}`),
  getFilters:    ()    => client('/filters'),
  searchAuthors: (q)   => client(`/authors/search?q=${encodeURIComponent(q)}`),

  // Головна
  getNewest:  (limit = 12) => client(`/newest?limit=${limit}`),
  getTrending:(limit = 12) => client(`/trending?limit=${limit}`),
  getTopYear: (year, limit = 10) => client(`/top-year?year=${year || new Date().getFullYear()}&limit=${limit}`),
  getAwards:  ()           => client('/awards'),

  // Відгуки
  getReviews: (bookId)       => client(`/books/${bookId}/reviews`),
  addReview:  (bookId, data) => client(`/books/${bookId}/reviews`, { body: data }),
  likeReview: (reviewId, emoji = '❤️') => client(`/reviews/${reviewId}/like`, { body: { emoji } }),

  // Обговорення
  getDiscussions:   (bookId)         => client(`/books/${bookId}/discussions`),
  createDiscussion: (bookId, data)   => client(`/books/${bookId}/discussions`, { body: data }),
  getDiscussion:    (threadId)       => client(`/discussions/${threadId}`),
  addReply:         (threadId, data) => client(`/discussions/${threadId}/replies`, { body: data }),

  // Цитати до книги
  getBookQuotes: (bookId) => client(`/books/${bookId}/quotes`),

  // Клуби книги
  getBookClubs: (bookId) => client(`/books/${bookId}/clubs`),

  // Сесії читання
  addSession: (bookId, data) => client(`/me/books/${bookId}/sessions`, { body: data }),
};