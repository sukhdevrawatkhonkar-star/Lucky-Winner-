
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Wallet as WalletIcon, IndianRupee, ArrowRight, ArrowLeft, CircleDollarSign, Landmark, RefreshCw, Loader2 } from "lucide-react";
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, Transaction } from '@/lib/types';
import { listTransactions } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AgentWalletPage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const fetchTransactions = useCallback(async (user: User) => {
        setLoading(true);
        const fetchedTransactions = await listTransactions(user.uid, 'agent');
        setTransactions(fetchedTransactions);
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                
                // Set up a single real-time listener for the profile.
                // When it updates, we will also re-fetch the transactions to keep data in sync.
                const userDocRef = doc(db, "users", user.uid);
                const unsubscribeSnapshot = onSnapshot(userDocRef, async (doc) => {
                    setLoading(true);
                    if (doc.exists()) {
                        setUserProfile({ uid: user.uid, ...doc.data() } as UserProfile);
                        // When profile updates (e.g., balance change), refetch transactions.
                        const fetchedTransactions = await listTransactions(user.uid, 'agent');
                        setTransactions(fetchedTransactions);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error with profile snapshot:", error);
                    setLoading(false);
                });

                return () => unsubscribeSnapshot();
            } else {
                setCurrentUser(null);
                setUserProfile(null);
                setTransactions([]);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const handleRefresh = () => {
        if(currentUser) {
            // This will re-trigger the snapshot logic and transaction fetch
            fetchTransactions(currentUser);
        }
    }

    const getTransactionTypeDetails = (tx: Transaction) => {
        if (tx.fromId === currentUser?.uid) {
            return {
                variant: 'destructive' as const,
                text: `Sent to ${tx.toEmail}`,
                icon: <ArrowRight className="h-4 w-4 text-red-400" />
            };
        }
        return {
            variant: 'default' as const,
            text: `Received from ${tx.fromEmail}`,
            icon: <ArrowLeft className="h-4 w-4 text-green-400" />
        };
    };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Wallet</h1>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span className="ml-2 hidden sm:inline">Refresh</span>
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Balance
            </CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading && !userProfile ? (
                 <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
                <div className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-6 w-6 mr-2" />
                    {userProfile?.walletBalance !== null ? userProfile?.walletBalance?.toFixed(2) : '0.00'}
                </div>
            )}
            <p className="text-xs text-muted-foreground">
              Cash + Credit
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cash Balance
            </CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading && !userProfile ? (
                <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
                <div className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-6 w-6 mr-2" />
                    {userProfile?.cashBalance !== null ? userProfile?.cashBalance?.toFixed(2) : '0.00'}
                </div>
            )}
            <p className="text-xs text-muted-foreground">
              Available for payout
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Credit (Udhaar)
            </CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading && !userProfile ? (
                <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
                <div className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-6 w-6 mr-2" />
                    {userProfile?.creditBalance !== null ? userProfile?.creditBalance?.toFixed(2) : '0.00'}
                </div>
            )}
            <p className="text-xs text-muted-foreground">
              Credit given to users
            </p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>A record of all your wallet transactions.</CardDescription>
        </CardHeader>
        <CardContent>
           {loading ? (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4">Loading history...</p>
            </div>
           ) : transactions.length === 0 ? (
             <p className="text-muted-foreground text-center">No transactions yet.</p>
           ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((tx) => {
                        const { variant, text, icon } = getTransactionTypeDetails(tx);
                        return (
                             <TableRow key={tx.id}>
                                <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                    {icon}
                                    {text}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={tx.paymentType === 'credit' ? 'secondary' : 'default'} className="capitalize">
                                        {tx.paymentType}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-medium ${variant === 'destructive' ? 'text-red-400' : 'text-green-400'}`}>
                                    {variant === 'destructive' ? '-' : '+'}
                                    <IndianRupee className="inline-block h-3 w-3 mx-1"/>
                                    {Math.abs(tx.amount).toFixed(2)}
                                </TableCell>
                             </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
           )}
        </CardContent>
      </Card>

    </div>
  );
}
