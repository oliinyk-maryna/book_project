import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { authApi } from '../../api/auth.api';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = true }) {
  const [isLogin, setIsLogin] = useState(initialMode);
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Оновлюємо стан модалки при її відкритті
  useEffect(() => {
    setIsLogin(initialMode);
    setError('');
    setFormData({ email: '', password: '', username: '' });
    
    // Блокуємо скрол сторінки, коли модалка відкрита
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Логіка входу
        const data = await authApi.login({ email: formData.email, password: formData.password });
        localStorage.setItem('token', data.token); // Зберігаємо токен
        
        // Одразу отримуємо профіль користувача
        const profileData = await authApi.getMe();
        onSuccess(profileData.profile || profileData); 
        onClose();
      } else {
        // Логіка реєстрації
        await authApi.register({ username: formData.username, email: formData.email, password: formData.password });
        
        // Автоматично логінимо після успішної реєстрації
        const data = await authApi.login({ email: formData.email, password: formData.password });
        localStorage.setItem('token', data.token);
        
        const profileData = await authApi.getMe();
        onSuccess(profileData.profile || profileData);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Щось пішло не так. Перевірте дані.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Затемнення фону */}
      <div 
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Вікно модалки */}
      <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-end p-4 absolute top-0 right-0 z-10">
          <button onClick={onClose} className="p-2 bg-stone-100/50 hover:bg-stone-100 rounded-full transition-colors text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 md:p-10 pt-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-black text-stone-900 mb-2">
              {isLogin ? 'З поверненням' : 'Створити акаунт'}
            </h2>
            <p className="text-stone-500 font-medium">
              {isLogin ? 'Увійдіть, щоб продовжити читання.' : 'Приєднуйтесь до книжкової спільноти.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="Ваш нікнейм" 
                  required 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#1A361D] focus:ring-4 ring-green-900/10 transition-all font-medium"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input 
                type="email" 
                placeholder="Електронна пошта" 
                required 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#1A361D] focus:ring-4 ring-green-900/10 transition-all font-medium"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input 
                type="password" 
                placeholder="Пароль" 
                required 
                minLength={6}
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-[#1A361D] focus:ring-4 ring-green-900/10 transition-all font-medium"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#1A361D] text-white py-4 rounded-2xl font-bold hover:bg-[#2C5234] transition-colors flex items-center justify-center gap-2 mt-4 shadow-lg shadow-green-900/20 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Увійти' : 'Зареєструватися')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-stone-500 font-medium">
              {isLogin ? 'Ще немає акаунту?' : 'Вже є акаунт?'}
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }} 
                className="ml-2 text-[#D97757] font-bold hover:underline"
              >
                {isLogin ? 'Створити' : 'Увійти'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}