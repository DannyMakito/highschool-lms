import { View, ViewProps } from 'react-native';
import React from 'react';

interface ProgressProps extends ViewProps {
  value?: number;
}

export function Progress({ value = 0, className, ...props }: ProgressProps) {
  return (
    <View
      className={`relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className || ''}`}
      {...props}
    >
      <View
        className="h-full flex-1 bg-slate-900 transition-all dark:bg-slate-50"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </View>
  );
}
