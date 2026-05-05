import React from 'react';
import { Shield, Users, Book, BarChart2, UserPlus, MoreHorizontal } from 'lucide-react';
import { useAdminDashboard } from '../hooks/useAdmin';
import StatCard from '../components/ui/StatCard';
import Loader from '../components/ui/Loader';

export default function AdminPage() {
  const { stats, users, loading, changeRole } = useAdminDashboard();

  if (loading) return <Loader />;

  return (
    <main className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-stone-100 rounded-2xl">
            <Shield className="w-8 h-8 text-[#2C5234]" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-stone-900">Панель керування</h1>
            <p className="text-stone-500 text-sm">Моніторинг та управління системою</p>
          </div>
        </div>
      </header>

      {/* Grid зі статистикою */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <StatCard icon={Users} label="Спільнота" value={stats.users_count} sub="активних користувачів" colorClass="bg-blue-50 text-blue-600" />
        <StatCard icon={Book} label="Бібліотека" value={stats.books_count} sub="оцифрованих видань" colorClass="bg-amber-50 text-amber-600" />
        <StatCard icon={BarChart2} label="Активність" value={stats.reviews_count} sub="написаних рецензій" colorClass="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Секція користувачів */}
      <section className="bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-bold text-stone-800">Менеджмент прав</h2>
          <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">{users.length} записів</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Користувач</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Статус</th>
                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-stone-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-stone-900">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => changeRole(u.id, 'admin')}
                      className="inline-flex items-center gap-2 text-xs font-bold text-[#2C5234] hover:bg-stone-100 px-4 py-2 rounded-xl transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Надати права адміна
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}