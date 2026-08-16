import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';
import React from 'react';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

export function Button({ variant = 'default', size = 'default', className, children, ...props }: ButtonProps) {
  let baseClasses = 'flex-row items-center justify-center rounded-md ';
  let textClasses = 'font-medium ';

  switch (variant) {
    case 'default':
      baseClasses += 'bg-slate-900 ';
      textClasses += 'text-slate-50 ';
      break;
    case 'destructive':
      baseClasses += 'bg-red-500 ';
      textClasses += 'text-slate-50 ';
      break;
    case 'outline':
      baseClasses += 'border border-slate-200 bg-white ';
      textClasses += 'text-slate-900 ';
      break;
    case 'secondary':
      baseClasses += 'bg-slate-100 ';
      textClasses += 'text-slate-900 ';
      break;
    case 'ghost':
      baseClasses += 'bg-transparent ';
      textClasses += 'text-slate-900 ';
      break;
    case 'link':
      baseClasses += 'bg-transparent ';
      textClasses += 'text-slate-900 underline ';
      break;
  }

  switch (size) {
    case 'default':
      baseClasses += 'h-10 px-4 py-2 ';
      textClasses += 'text-sm ';
      break;
    case 'sm':
      baseClasses += 'h-9 px-3 rounded-md ';
      textClasses += 'text-xs ';
      break;
    case 'lg':
      baseClasses += 'h-11 px-8 rounded-md ';
      textClasses += 'text-base ';
      break;
    case 'icon':
      baseClasses += 'h-10 w-10 ';
      break;
  }

  return (
    <TouchableOpacity className={`${baseClasses} ${className || ''}`} {...props}>
      <Text className={textClasses}>{children}</Text>
    </TouchableOpacity>
  );
}
