import client from './client';

export const authApi = {
  login: (credentials) => client('/login', { body: credentials }),
  register: (userData) => client('/register', { body: userData }),
  getMe: () => client('/profile'),
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