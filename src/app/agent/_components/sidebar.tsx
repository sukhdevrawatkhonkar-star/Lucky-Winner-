
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Home, Users, Wallet, LogOut, Ticket, Trophy } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const links = [
  { name: 'Dashboard', href: '/agent', icon: Home },
  { name: 'My Users', href: '/agent/users', icon: Users },
  { name: 'My Wallet', href: '/agent/wallet', icon: Wallet },
  { name: 'User Bets', href: '/agent/bets', icon: Ticket },
  { name: 'Commissions', href: '/agent/commission', icon: Trophy },
];


function LogoutButton() {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().role === 'agent') {
                    setUserEmail(user.email);
                } else {
                    // Not an agent, sign out and redirect
                    await signOut(auth);
                    router.push('/login');
                }
            } else {
                 router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/login');
    };
    
    if (!userEmail) {
        return null;
    }

    return (
        <div className="flex flex-col space-y-2">
            <div className="text-center text-sm p-2 bg-gray-700/50 rounded-md">
                <p className="font-medium truncate">{userEmail}</p>
                <p className="text-xs text-muted-foreground">Agent</p>
            </div>
             <Button variant="destructive" className="w-full justify-center" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
            </Button>
        </div>
    )
}

export function AgentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col h-full">
      <div className="flex items-center mb-8 p-2">
        <h2 className="text-2xl font-bold">Agent Panel</h2>
      </div>
      <nav className="flex flex-col space-y-2 flex-grow px-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Button
              key={link.name}
              asChild
              variant={isActive ? 'secondary' : 'ghost'}
              className="justify-start"
            >
              <Link href={link.href}>
                <link.icon className="mr-2 h-4 w-4" />
                {link.name}
              </Link>
            </Button>
          );
        })}
      </nav>
        <div className="mt-auto p-2">
            <LogoutButton />
        </div>
    </aside>
  );
}
