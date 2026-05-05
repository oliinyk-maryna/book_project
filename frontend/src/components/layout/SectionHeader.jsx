import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function SectionHeader({ title, icon: Icon, iconColor = "text-stone-900", onMore }) {
  return (
    <div className="flex items-center justify-between mb-5 px-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
        <h2 className="text-xl font-serif font-bold text-stone-900">{title}</h2>
      </div>
      {onMore && (
        <button 
          onClick={onMore}
          className="text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1 text-sm font-medium"
        >
          Більше <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}