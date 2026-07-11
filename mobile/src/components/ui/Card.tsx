import { View, ViewProps, Text, TextProps } from 'react-native';
import React from 'react';

export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={`rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 ${className || ''}`}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ViewProps) {
  return <View className={`flex flex-col space-y-1.5 p-6 ${className || ''}`} {...props} />;
}

export function CardTitle({ className, ...props }: TextProps) {
  return (
    <Text
      className={`text-2xl font-semibold leading-none tracking-tight ${className || ''}`}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: TextProps) {
  return <Text className={`text-sm text-slate-500 dark:text-slate-400 ${className || ''}`} {...props} />;
}

export function CardContent({ className, ...props }: ViewProps) {
  return <View className={`p-6 pt-0 ${className || ''}`} {...props} />;
}

export function CardFooter({ className, ...props }: ViewProps) {
  return <View className={`flex flex-row items-center p-6 pt-0 ${className || ''}`} {...props} />;
}
