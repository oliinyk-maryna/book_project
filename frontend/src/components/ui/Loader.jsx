import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loader({ fullPage = false, size = "md" }) {
  const sizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  const containerClasses = fullPage 
    ? "fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex items-center justify-center"
    : "flex items-center justify-center py-10 w-full";

  return (
    <div className={containerClasses}>
      <Loader2 className={`${sizes[size]} animate-spin text-[#2C5234]`} />
    </div>
  );
}