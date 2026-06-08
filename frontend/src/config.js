// src/config.js
// У dev — Vite підставить VITE_API_URL з .env.local або .env
// Якщо змінна не задана — fallback на localhost для локальної розробки
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
