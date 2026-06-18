import React, { useState, useEffect, useRef } from 'react';
import { User, Image as ImageIcon, FileText, Save, Loader2, Check, ArrowLeft, Shield, UploadCloud } from 'lucide-react';
import { API_URL } from '../config';
import { authApi } from '../api/auth.api';

export default function SettingsPage({ fetchUserProfile, handleNavigate }) {
  const [user, setUser] = useState({ username: '', bio: '', avatar_url: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Додаємо стан для процесу завантаження картинки
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUser({
            username: data.username || '',
            bio: data.bio || '',
            avatar_url: data.avatar_url || ''
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Функція для обробки вибору файлу
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      // Викликаємо наш новий метод з api
      const res = await authApi.uploadAvatar(file);
      
      // Оновлюємо стан новим URL, який повернув сервер
      setUser(prev => ({ ...prev, avatar_url: res.avatar_url }));
      
      // Якщо в App.jsx є загальний стан користувача, можемо одразу його оновити
      if (fetchUserProfile) fetchUserProfile(); 
      
    } catch (error) {
      console.error(error);
      alert(error.message || 'Помилка при завантаженні зображення');
    } finally {
      setIsUploadingImage(false);
      // Очищаємо input, щоб можна було завантажити той самий файл повторно
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/profile/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(user)
      });
      if (res.ok) {
        setSaved(true);
        if (fetchUserProfile) fetchUserProfile(); 
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Помилка при збереженні. Можливо, такий нікнейм вже існує.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="min-h-[60vh] flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-[#2C5234]" /></div>;

  return (
    <main className="max-w-3xl mx-auto px-4 mt-6 md:mt-8 pb-28 md:pb-12 animate-in fade-in">
      
      <button onClick={() => handleNavigate('profile')} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-medium transition-colors mb-6 md:mb-8 w-fit bg-stone-100 md:bg-transparent px-4 py-2 md:p-0 rounded-full md:rounded-none group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Назад до профілю
      </button>

      <div className="bg-white rounded-[2rem] border border-stone-200 overflow-hidden shadow-sm">
        
        {/* Шапка налаштувань */}
        <div className="bg-stone-50 px-6 py-8 md:px-10 border-b border-stone-200">
          <div className="w-12 h-12 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <Shield className="w-6 h-6 text-stone-700" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">Налаштування</h1>
          <p className="text-stone-500 mt-1 font-medium text-sm md:text-base">Керуйте своєю публічною інформацією та профілем.</p>
        </div>

        <div className="p-6 md:p-10 space-y-8">
          
          {/* Блок Аватара */}
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center p-5 bg-stone-50 rounded-3xl border border-stone-100">
            {/* Сама картинка */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border border-stone-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-stone-300" />
              )}
              
              {/* Оверлей завантаження (якщо файл вантажиться зараз) */}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2C5234]" />
                </div>
              )}
            </div>

            {/* Кнопка завантаження */}
            <div className="flex-1 w-full space-y-3">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2C5234]" /> Фото профілю
              </label>
              
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isUploadingImage}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-stone-500" /> : <UploadCloud className="w-4 h-4 text-[#2C5234]" />}
                  {isUploadingImage ? 'Завантажуємо...' : 'Обрати файл'}
                </button>
                
                {/* Прихований інпут для файлу */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              
              <p className="text-xs text-stone-400 font-medium pl-1">Рекомендовано: квадратне фото, до 5MB.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Нікнейм */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4 text-[#2C5234]" /> Нікнейм
              </label>
              <input type="text" value={user.username} onChange={e => setUser({ ...user, username: e.target.value })}
                placeholder="Ваш нікнейм"
                className="w-full bg-stone-50 focus:bg-white px-4 py-3.5 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#2C5234] focus:border-[#2C5234] outline-none transition-all shadow-sm font-medium text-stone-900" />
            </div>

            {/* Про себе */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2C5234]" /> Про себе
              </label>
              <textarea value={user.bio} onChange={e => setUser({ ...user, bio: e.target.value })}
                placeholder="Розкажіть трохи про ваші книжкові смаки, улюблені жанри чи авторів..." rows={5}
                className="w-full bg-stone-50 focus:bg-white px-4 py-4 rounded-xl border border-stone-200 focus:ring-1 focus:ring-[#2C5234] focus:border-[#2C5234] outline-none transition-all resize-none shadow-sm text-stone-900" />
            </div>
          </div>

          <hr className="border-stone-100 my-8" />

          {/* Нижня панель з кнопкою */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto flex justify-center sm:justify-start">
              {saved && (
                <span className="text-green-600 bg-green-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 border border-green-100">
                  <Check className="w-4 h-4" /> Успішно збережено
                </span>
              )}
            </div>
            
            <button onClick={handleSave} disabled={isSaving || !user.username.trim()}
              className="w-full sm:w-auto bg-[#2C5234] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#1f3a25] transition-all disabled:bg-stone-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm active:scale-95">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Зберігаємо...' : 'Зберегти зміни'}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}