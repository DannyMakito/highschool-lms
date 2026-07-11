import { TextInput, TextInputProps } from 'react-native';
import React from 'react';

export function Input({ className, ...props }: TextInputProps) {
  return (
    <TextInput
      className={`flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-500 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-400 ${className || ''}`}
      placeholderTextColor="#64748b"
      {...props}
    />
  );
}
