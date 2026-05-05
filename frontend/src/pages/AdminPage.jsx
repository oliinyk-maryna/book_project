import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, BookPlus, MessageSquare, Loader2, ShieldAlert } from 'lucide-react';
import { adminApi } from '../api/admin.api';
import StatCard from '../components/ui/StatCard';
import Loader from '../components/ui/Loader';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getUsers()
    ])
    .then(([statsData, usersData]) => {
      setStats(statsData || { users_count: 0, books_count: 0, reviews_count: 0 });
      setUsers(usersData || []);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleChangeRole = async (userId, currentRole) => {
    if (!window.confirm('Ви впевнені, що хочете змінити права цього користувача?')) return;
    setActionLoading(userId);
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await adminApi.setUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e) {
      alert('Помилка зміни ролі');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Loader fullPage />;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <header className="flex items-center gap-5 mb-12">
        <div className="w-16 h-16 bg-[#1A361D] rounded-[1.5rem] flex items-center justify-center text-white shadow-lg">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-black text-stone-900">Адміністратор</h1>
          <p className="text-stone-500 font-medium">Керування платформою Libro.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard icon={Users} label="Спільнота" value={stats?.users_count} sub="юзерів" />
        <StatCard icon={BookPlus} label="Бібліотека" value={stats?.books_count} sub="книг" variant="light" />
        <StatCard icon={MessageSquare} label="Активність" value={stats?.reviews_count} sub="відгуків" variant="light" />
      </div>

      <section className="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-stone-50 flex justify-between items-center bg-stone-50/50">
          <h2 className="text-xl font-bold text-stone-900">Користувачі</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">ID / Нікнейм</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Email</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Статус</th>
                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-600">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-stone-900">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-stone-500 text-sm font-medium">{u.email}</td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                      u.role === 'admin' ? 'bg-[#1A361D] text-white' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {u.role === 'admin' && <ShieldAlert className="w-3 h-3" />}
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleChangeRole(u.id, u.role)}
                      disabled={actionLoading === u.id}
                      className="text-xs font-bold text-[#D97757] hover:underline disabled:opacity-50"
                    >
                      {actionLoading === u.id ? 'Зачекайте...' : (u.role === 'admin' ? 'Забрати права' : 'Надати адміна')}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="4" className="text-center py-8 text-stone-400 font-medium">Немає користувачів</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}