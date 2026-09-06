'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { DocumentProvider } from '@/context/DocumentContext';
import { ToastProvider } from '@/context/ToastContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <DocumentProvider>
          {children}
        </DocumentProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
