import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Check, User } from 'lucide-react';
import { userApi } from '../api/user.api';
import { Button, Loader } from '../components/ui';

export default function SettingsPage({ handleNavigate }) {
  const [user, setUser] = useState({ username: '', bio: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Завантаження поточних налаштувань[cite: 67]
    userApi.getProfile().then(data => {
      setUser(data.profile);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await userApi.updateSettings(user); // Збереження змін через API[cite: 67]
    setSaving(false);
  };

  if (loading) return <Loader fullPage />;

  return (
    <div className="max-w-xl mx-auto px-6 pt-12 pb-24 animate-in slide-in-from-left-4 duration-500">
      <header className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => handleNavigate('back')}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-stone-900" />
        </button>
        <h1 className="text-3xl font-serif font-bold text-stone-900">Налаштування</h1>
      </header>

      <div className="space-y-8 bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-stone-400 ml-1 flex items-center gap-2">
            <User className="w-3 h-3" /> Ім'я користувача
          </label>
          <input 
            value={user.username} 
            onChange={e => setUser({...user, username: e.target.value})}
            className="w-full px-5 py-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-[#2C5234] focus:ring-4 ring-emerald-500/10 transition-all font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-stone-400 ml-1 flex items-center gap-2">
            <FileText className="w-3 h-3" /> Про себе
          </label>
          <textarea 
            value={user.bio} 
            onChange={e => setUser({...user, bio: e.target.value})}
            placeholder="Розкажіть про свої книжкові вподобання..."
            className="w-full px-5 py-4 rounded-2xl bg-stone-50 border border-stone-100 outline-none focus:border-[#2C5234] focus:ring-4 ring-emerald-500/10 transition-all font-medium resize-none h-40"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSave} 
            isLoading={saving} 
            icon={Check}
            className="bg-stone-900 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-stone-200"
          >
            Зберегти зміни
          </Button>
        </div>
      </div>
    </div>
  );
}