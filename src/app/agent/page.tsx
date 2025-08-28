
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, Loader2, IndianRupee, Trophy, RefreshCw } from "lucide-react";
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getDashboardStats } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AgentStats {
    totalUsers: number;
    totalCommission: number;
}

export default function AgentDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && userDoc.data().role === 'agent') {
                setProfile({ uid: user.uid, ...userDoc.data() } as UserProfile);
                setCurrentUser(user);
            } else {
                router.push('/login'); 
                 setLoading(false);
            }
        } else {
             router.push('/login');
             setLoading(false);
        }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchAgentData = useCallback(async () => {
    // Safety Check: Do not run if there is no current user.
    if (!currentUser) return;

    setLoading(true);
    const agentStats = await getDashboardStats(currentUser.uid);
    setStats({
        totalUsers: agentStats.totalUsers,
        totalCommission: agentStats.totalCommission,
    });
    
    // Also refresh profile data
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        setProfile({ uid: currentUser.uid, ...userDoc.data() } as UserProfile);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    // Fetch data only after the currentUser has been confirmed.
    if(currentUser) {
        fetchAgentData();
    }
  }, [currentUser, fetchAgentData]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Agent Dashboard</h1>
        <Button variant="outline" size="sm" onClick={fetchAgentData} disabled={loading || !currentUser}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          <span className="ml-2 hidden sm:inline">Refresh</span>
        </Button>
      </div>
       {loading && !stats ? (
           <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           </div>
        ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              My Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Total users under your agency
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wallet Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
                <IndianRupee className="h-5 w-5 mr-1"/> 
                {profile?.walletBalance?.toFixed(2) ?? '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Your total available balance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Commission Earned
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
                <IndianRupee className="h-5 w-5 mr-1"/> 
                {stats?.totalCommission.toFixed(2) ?? '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total commission from user bets
            </p>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}

    