
import React from 'react';
import { AgentSidebar } from './_components/sidebar';
import { AuthProvider } from '@/components/AuthProvider';

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
       <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <AgentSidebar />
        <div className="flex flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
