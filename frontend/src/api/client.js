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

    // Обробка простроченого токена
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:expired')); // Глобальний івент для показу AuthModal
      return Promise.reject({ message: 'Сесія закінчилась. Увійдіть знову.', status: 401 });
    }

    // Обробка падіння бекенду
    if (response.status >= 500) {
      window.dispatchEvent(new Event('server:down'));
      return Promise.reject({ message: 'Технічні роботи', status: response.status });
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
      window.dispatchEvent(new Event('server:down'));
      return Promise.reject(new Error('Сервер недоступний.'));
    }
    return Promise.reject(err);
  }
};

export default client;