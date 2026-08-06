import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
  variant?: 'solid' | 'soft' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const colorMap = {
  primary: { solid: 'bg-primary-500 text-white', soft: 'bg-primary-50 text-primary-700', outline: 'border-primary-300 text-primary-700' },
  secondary: { solid: 'bg-secondary-500 text-white', soft: 'bg-secondary-50 text-secondary-700', outline: 'border-secondary-300 text-secondary-700' },
  accent: { solid: 'bg-accent-500 text-white', soft: 'bg-accent-50 text-accent-700', outline: 'border-accent-300 text-accent-700' },
  success: { solid: 'bg-success-500 text-white', soft: 'bg-success-50 text-success-700', outline: 'border-success-500 text-success-700' },
  warning: { solid: 'bg-warning-500 text-white', soft: 'bg-warning-50 text-warning-700', outline: 'border-warning-500 text-warning-700' },
  error: { solid: 'bg-error-500 text-white', soft: 'bg-error-50 text-error-700', outline: 'border-error-500 text-error-700' },
  neutral: { solid: 'bg-neutral-500 text-white', soft: 'bg-neutral-100 text-neutral-700', outline: 'border-neutral-300 text-neutral-600' },
};

const dotColorMap = {
  primary: 'bg-primary-500',
  secondary: 'bg-secondary-500',
  accent: 'bg-accent-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  neutral: 'bg-neutral-400',
};

export default function Badge({ children, color = 'neutral', variant = 'soft', size = 'sm', dot = false }: BadgeProps) {
  const styles = colorMap[color][variant];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${styles} ${sizeClass}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColorMap[color]}`} />}
      {children}
    </span>
  );
}
