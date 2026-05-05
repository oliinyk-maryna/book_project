import React from 'react';

export default function StatCard({ label, value, icon: Icon, variant = 'default', sub }) {
  const isLight = variant === 'light';
  
  return (
    <div className={`p-6 rounded-[2rem] border transition-all ${
      isLight ? 'bg-stone-50 border-stone-100 hover:shadow-md' : 'bg-white border-stone-200 shadow-sm'
    }`}>
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          isLight ? 'bg-white text-stone-600 shadow-sm' : 'bg-emerald-50 text-[#1A361D]'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-stone-400">{label}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-4xl font-serif font-black ${isLight ? 'text-stone-900' : 'text-[#1A361D]'}`}>
          {value}
        </p>
        {sub && <span className="text-sm font-bold text-stone-400">{sub}</span>}
      </div>
    </div>
  );
}