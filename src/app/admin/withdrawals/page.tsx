
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listWithdrawalRequests, processWithdrawalRequest } from '@/app/actions';
import { WithdrawalRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
} from "@/components/ui/alert-dialog";

export default function WithdrawalsPage() {
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
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
        const result = await processWithdrawalRequest(requestId, action);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            fetchRequests();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
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
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>Review and process user withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>UPI ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto my-10" /></TableCell></TableRow>
              ) : requests.length === 0 ? (
                 <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No pending requests found.</TableCell></TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{new Date(req.requestedAt).toLocaleString()}</TableCell>
                    <TableCell>
                        <div className="font-medium">{req.userName}</div>
                        <div className="text-xs text-muted-foreground">{req.userEmail}</div>
                    </TableCell>
                    <TableCell className="font-mono">{req.userUpiId}</TableCell>
                     <TableCell>
                       <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                        <IndianRupee className="inline h-4 w-4 mr-1" />
                        {req.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {req.status === 'pending' && (
                          <>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">Approve</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will approve the withdrawal of ₹{req.amount.toFixed(2)} for {req.userName}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleProcessRequest(req.id, 'approve')}>Approve</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                 <Button variant="destructive" size="sm">Reject</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will reject the withdrawal request from {req.userName}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleProcessRequest(req.id, 'reject')} className="bg-destructive hover:bg-destructive/90">Reject</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
