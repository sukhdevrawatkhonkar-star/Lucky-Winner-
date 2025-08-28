
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listWithdrawalRequests, processWithdrawalRequest } from '@/app/actions';
import { WithdrawalRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function AdminWithdrawalsPage() {
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const fetchedRequests = await listWithdrawalRequests();
        setRequests(fetchedRequests);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject') => {
        setProcessingId(requestId);
        const result = await processWithdrawalRequest(requestId, action);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            fetchRequests(); // Refresh the list
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        setProcessingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Withdrawal Requests</h1>
                <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Pending & Processed Requests</CardTitle>
                    <CardDescription>Review and process withdrawal requests from users.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : requests.length === 0 ? (
                        <p className="text-muted-foreground text-center">No withdrawal requests found.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>UPI ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell>{new Date(req.requestedAt).toLocaleString()}</TableCell>
                                        <TableCell>{req.userEmail}</TableCell>
                                        <TableCell className="font-mono">{req.userUpiId || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge
                                                className="capitalize"
                                                variant={req.status === 'pending' ? 'default' : req.status === 'approved' ? 'secondary' : 'destructive'}
                                            >
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <IndianRupee className="inline-block h-3 w-3 mr-1"/>
                                            {req.amount.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {req.status === 'pending' ? (
                                                <>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                disabled={processingId === req.id}
                                                            >
                                                                {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                                                Approve
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Approve Withdrawal?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will deduct <span className="font-bold">₹{req.amount.toFixed(2)}</span> from {req.userEmail}'s cash balance. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleProcessRequest(req.id, 'approve')}>Confirm</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                disabled={processingId === req.id}
                                                            >
                                                                {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                                                Reject
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Reject Withdrawal?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will mark the request as rejected. The user's balance will not be affected. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleProcessRequest(req.id, 'reject')} className={cn(buttonVariants({ variant: "destructive" }))}>Confirm</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Processed on {new Date(req.processedAt!).toLocaleDateString()}</span>
                                            )}
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
