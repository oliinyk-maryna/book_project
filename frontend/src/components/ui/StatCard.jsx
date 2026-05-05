import React from 'react';

export default function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  sub, 
  variant = 'light', // 'light', 'dark', or 'color'
  colorClass = 'bg-stone-100 text-stone-600'
}) {
  const variants = {
    light: "bg-white border-stone-200 text-stone-900",
    dark: "bg-stone-900 border-stone-800 text-white",
  };

  return (
    <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${variants[variant] || variants.light}`}>
      <div className={`p-3 rounded-2xl w-fit ${variant === 'dark' ? 'bg-stone-800 text-white' : colorClass}`}>
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      
      <div className="mt-5">
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${variant === 'dark' ? 'text-stone-500' : 'text-stone-400'}`}>
          {label}
        </p>
        <p className="text-3xl font-bold font-serif leading-none">
          {value}
        </p>
        {sub && (
          <p className={`text-xs mt-2 font-medium ${variant === 'dark' ? 'text-stone-400' : 'text-stone-500'}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}