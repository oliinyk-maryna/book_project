import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  isLoading = false, 
  disabled = false, 
  className = '', 
  type = 'button',
  icon: Icon
}) {
  const baseStyles = "relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-[#2C5234] text-white hover:bg-[#1f3a25] shadow-sm",
    secondary: "bg-stone-100 text-stone-900 hover:bg-stone-200",
    outline: "border-2 border-stone-200 text-stone-600 hover:border-[#2C5234] hover:text-[#2C5234]",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "text-stone-500 hover:bg-stone-100"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          {children}
        </>
      )}
    </button>
  );
}