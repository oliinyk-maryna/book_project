import { useState } from 'react';
import { Lock, Mail, User, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { API_URL } from '../config';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ username: '', email: '', phone: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Валідація пароля: мін 8 символів, хоча б одна цифра
  const validatePassword = (pass) => {
    const regex = /^(?=.*[0-9])(?=.{8,})/;
    return regex.test(pass);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePassword(formData.password)) {
      setError('Пароль має бути від 8 символів та містити хоча б одну цифру.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const msg = await response.text();
        setError(msg || 'Помилка реєстрації');
      }
    } catch (err) {
      setError('Сервер не відповідає');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-3xl shadow-xl border border-stone-100">
      <h2 className="text-2xl font-serif font-bold text-center mb-6">Створення аккаунту</h2>
      
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex gap-2"><AlertCircle className="w-4 h-4"/> {error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-xl text-sm">✅ Успішно! Тепер увійдіть.</div>}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="relative">
          <User className="absolute left-3 top-3 w-5 h-5 text-stone-400" />
          <input type="text" placeholder="Нікнейм" required className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#2C5234]" 
            onChange={e => setFormData({...formData, username: e.target.value})} />
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-3 w-5 h-5 text-stone-400" />
          <input type="tel" placeholder="+380..." required className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#2C5234]" 
            onChange={e => setFormData({...formData, phone: e.target.value})} />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-3 w-5 h-5 text-stone-400" />
          <input type="email" placeholder="Email" required className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#2C5234]" 
            onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-3 w-5 h-5 text-stone-400" />
          <input type={showPass ? "text" : "password"} placeholder="Пароль" required className="w-full pl-10 pr-12 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#2C5234]" 
            onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-stone-400">
            {showPass ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
          </button>
        </div>
        <button className="w-full bg-[#2C5234] text-white py-3 rounded-xl font-bold hover:bg-[#1f3a25] transition-all shadow-lg shadow-green-900/20">
          Зареєструватися
        </button>
      </form>
    </div>
  );
}