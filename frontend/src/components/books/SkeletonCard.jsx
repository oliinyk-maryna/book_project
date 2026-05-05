import React from 'react';

export default function SkeletonCard() {
  return (
    <div className="w-full animate-pulse">
      <div className="aspect-[2/3] w-full bg-stone-200 rounded-xl mb-3" />
      <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-stone-100 rounded w-1/2" />
    </div>
  );
}