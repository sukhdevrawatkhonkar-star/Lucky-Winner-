
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listBets } from '@/app/actions';
import { Bet } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2 } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AgentBetsPage() {
    const [bets, setBets] = useState<Bet[]>([]);
    const [loading, setLoading] = useState(true);
    const [agent, setAgent] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentAgent) => {
            if (currentAgent) {
                setAgent(currentAgent);
            } else {
                setAgent(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        async function fetchBets() {
            if (!agent) return;
            setLoading(true);
            const fetchedBets = await listBets(undefined, agent.uid); // Pass agentId
            setBets(fetchedBets);
            setLoading(false);
        }
        if (agent) {
            fetchBets();
        }
    }, [agent]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">My User Bets</h1>
            <Card>
                <CardHeader>
                    <CardTitle>All Bets from My Users</CardTitle>
                    <CardDescription>A real-time list of all bets placed by users registered under you.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : bets.length === 0 ? (
                        <p className="text-muted-foreground text-center">Your users have not placed any bets yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Game</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Numbers</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount (Coins)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bets.map((bet) => (
                                    <TableRow key={bet.id}>
                                        <TableCell>{new Date(bet.createdAt).toLocaleString()}</TableCell>
                                        <TableCell>{bet.userEmail}</TableCell>
                                        <TableCell>{bet.lotteryName}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize">{bet.betType.replace(/_/g, ' ')}</Badge>
                                        </TableCell>
                                        <TableCell className="font-mono">{bet.numbers}</TableCell>
                                        <TableCell>
                                            <Badge className="capitalize" variant={bet.status === 'placed' ? 'default' : bet.status === 'won' ? 'secondary' : 'destructive'}>
                                                {bet.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            <IndianRupee className="inline-block h-3 w-3 mr-1"/>
                                            {bet.amount.toFixed(2)}
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
