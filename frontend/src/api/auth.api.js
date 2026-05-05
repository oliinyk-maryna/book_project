import client from './client';

export const authApi = {
  login: (credentials) => client('/login', { body: credentials }),
  register: (userData) => client('/register', { body: userData }),
  getMe: () => client('/profile'),
};