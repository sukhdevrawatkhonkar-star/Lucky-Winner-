
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listBets } from '@/app/actions';
import { Bet } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminBetsPage() {
    const [bets, setBets] = useState<Bet[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBets = useCallback(async () => {
        setLoading(true);
        const fetchedBets = await listBets(); // Fetches all bets for admin
        setBets(fetchedBets);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchBets();
    }, [fetchBets]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Game Bets</h1>
                <Button variant="outline" size="sm" onClick={fetchBets} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Placed Bets</CardTitle>
                    <CardDescription>A real-time list of all bets placed by users across all games.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : bets.length === 0 ? (
                        <p className="text-muted-foreground text-center">No bets have been placed yet.</p>
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
