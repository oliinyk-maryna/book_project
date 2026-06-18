// src/config.js
// У dev — Vite підставить VITE_API_URL з .env.local або .env
// Якщо змінна не задана — fallback на localhost для локальної розробки
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const getImageUrl = (path) => {
  if (!path) return '';
  // Якщо це вже повне посилання (наприклад, з Google), повертаємо як є
  if (path.startsWith('http')) return path;
  
  // Відрізаємо '/api' з кінця вашого API_URL, щоб отримати чистий домен бекенда
  const baseUrl = API_URL.replace(/\/api$/, '');
  
  // Додаємо слеш, якщо його немає
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${formattedPath}`;
};