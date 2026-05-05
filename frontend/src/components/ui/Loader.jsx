import React from 'react';
import { BookOpen } from 'lucide-react';

export default function Loader({ fullPage = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 border-4 border-[#1A361D]/20 rounded-full animate-ping" />
        <div className="w-16 h-16 bg-[#1A361D] rounded-full flex items-center justify-center animate-bounce shadow-xl">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
      </div>
      <p className="text-stone-500 font-bold tracking-widest uppercase text-[10px] animate-pulse">Завантаження...</p>
    </div>
  );

  if (fullPage) {
    return <div className="min-h-[70vh] flex items-center justify-center">{content}</div>;
  }
  return <div className="py-12 flex justify-center">{content}</div>;
}