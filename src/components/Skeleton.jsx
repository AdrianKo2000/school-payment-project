import React from 'react';

export default function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 px-6 py-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 bg-slate-100 rounded-xl w-full flex items-center px-6 gap-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6 ml-auto"></div>
        </div>
      ))}
    </div>
  );
}