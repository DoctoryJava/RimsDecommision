import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-neutral-200/80 ${hover ? 'transition-all duration-200 hover:shadow-lg hover:shadow-neutral-200/50 hover:border-neutral-300' : ''} ${className}`}>
      {children}
    </div>
  );
}
