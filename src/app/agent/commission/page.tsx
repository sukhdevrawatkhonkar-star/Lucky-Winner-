
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listTransactions } from '@/app/actions';
import { Transaction } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IndianRupee, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AgentCommissionPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [agent, setAgent] = useState<User | null>(null);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentAgent) => {
            setAgent(currentAgent);
        });
        return () => unsubscribe();
    }, []);

    const fetchTransactions = useCallback(async () => {
        if (!agent) return;
        setLoading(true);
        // Fetch all transactions and filter for commissions on the client-side.
        // A more optimized approach would be a dedicated server action if performance becomes an issue.
        const allTransactions = await listTransactions(agent.uid, 'agent');
        const commissionTransactions = allTransactions.filter(tx => tx.type === 'commission');
        setTransactions(commissionTransactions);
        setLoading(false);
    }, [agent]);

    useEffect(() => {
        if (agent) {
            fetchTransactions();
        }
    }, [agent, fetchTransactions]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Trophy className="h-8 w-8 text-primary" />
                    Commission History
                </h1>
                <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading || !agent}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>My Commission Ledger</CardTitle>
                    <CardDescription>A record of all commissions you have earned from your users' bets.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <p className="text-muted-foreground text-center">No commission records found yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount (Coins)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                                        <TableCell>Commission Received</TableCell>
                                        <TableCell className="text-right font-medium text-green-400">
                                            +<IndianRupee className="inline-block h-3 w-3 mx-1"/>
                                            {tx.amount.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
