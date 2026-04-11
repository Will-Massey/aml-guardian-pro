import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskBadge({ level, showLabel = true, size = 'md' }: RiskBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  const colorClasses = {
    LOW: 'bg-green-100 text-green-800 border-green-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    HIGH: 'bg-red-100 text-red-800 border-red-200',
  };

  const dotColors = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-red-500',
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${colorClasses[level]} ${sizeClasses[size]}`}>
      <span className={`w-2 h-2 rounded-full ${dotColors[level]} mr-1.5`}></span>
      {showLabel && level}
    </span>
  );
}
