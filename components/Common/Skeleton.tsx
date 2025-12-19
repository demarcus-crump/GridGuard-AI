import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle' | 'chart';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'text',
  width,
  height 
}) => {
  const baseStyles = "animate-pulse bg-gradient-to-r from-[var(--bg-tertiary)] via-[var(--bg-hover)] to-[var(--bg-tertiary)] bg-[length:200%_100%]";
  
  const variantStyles = {
    text: "h-4 rounded",
    rect: "rounded-md",
    circle: "rounded-full",
    chart: "rounded-lg h-full min-h-[150px]"
  };

  const animations = "animate-[skeleton-loading_1.5s_infinite]";

  return (
    <div 
      className={`${baseStyles} ${animations} ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};