import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  searchPlaceholder?: string;
}

export function PageLayout({ children, title, searchPlaceholder }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} searchPlaceholder={searchPlaceholder} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
