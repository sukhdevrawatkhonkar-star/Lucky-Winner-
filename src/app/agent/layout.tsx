
'use client';

import { AgentSidebar } from "./_components/sidebar";
import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data().role === 'agent') {
            setAuthStatus('authenticated');
          } else {
            await signOut(auth);
            setAuthStatus('unauthenticated');
            router.push('/login');
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          await signOut(auth);
          setAuthStatus('unauthenticated');
          router.push('/login');
        }
      } else {
        setAuthStatus('unauthenticated');
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (authStatus === 'loading') {
    return null; // Let loading.tsx handle it
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }
  
  if (authStatus === 'authenticated') {
    if (isMobile) {
      return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button size="icon" variant="outline" className="sm:hidden">
                    <PanelLeft className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs p-0">
                  <SheetHeader>
                      <SheetTitle className="sr-only">Agent Menu</SheetTitle>
                  </SheetHeader>
                  <AgentSidebar />
                </SheetContent>
              </Sheet>
              <h1 className="flex-1 text-xl font-semibold whitespace-nowrap">Agent Panel</h1>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-8 sm:p-6">{children}</main>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen w-full">
        <div className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
              <AgentSidebar />
          </div>
        </div>
        <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-8 sm:p-6">{children}</main>
      </div>
    );
  }

  return null;
}
