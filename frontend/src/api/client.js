import { API_URL } from '../config';

const client = async (endpoint, { body, method, ...customConfig } = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const config = {
    method: method || (body ? 'POST' : 'GET'),
    ...customConfig,
    headers: { ...headers, ...customConfig.headers },
  };
  if (body) config.body = JSON.stringify(body);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (response.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:expired'));
      return Promise.reject({ message: 'Unauthorized', status: 401 });
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    if (response.ok) {
      const text = await response.text();
      try { return text ? JSON.parse(text) : null; } catch { return null; }
    }

    const errorText = await response.text();
    return Promise.reject(new Error(errorText || `HTTP ${response.status}`));
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return Promise.reject(new Error('Сервер недоступний. Перевірте підключення.'));
    }
    return Promise.reject(err);
  }
};

export default client;