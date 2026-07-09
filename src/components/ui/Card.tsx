import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', id, ...props }) => {
  return (
    <div
      id={id}
      className={`bg-[#07070a] rounded-xl border border-white/[0.08] p-4 transition-all duration-300 hover:border-emerald-500/35 hover:shadow-[0_0_15px_rgba(16,185,129,0.05)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className = '', id, ...props }) => {
  return (
    <div
      id={id}
      className={`flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3 mb-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardBody: React.FC<CardProps> = ({ children, className = '', id, ...props }) => {
  return (
    <div
      id={id}
      className={`space-y-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardProps> = ({ children, className = '', id, ...props }) => {
  return (
    <div
      id={id}
      className={`flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 mt-3 text-xs text-zinc-500 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
