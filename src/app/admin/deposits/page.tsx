
'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listDepositRequests, processDepositRequest, processBankStatement } from '@/app/actions';
import { DepositRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2, RefreshCw, Upload } from 'lucide-react';
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

function BankStatementUploader({ onUploadSuccess }: { onUploadSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({ title: 'No file selected', description: 'Please select a CSV file to upload.', variant: 'destructive' });
            return;
        }

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvContent = event.target?.result as string;
            if (csvContent) {
                const result = await processBankStatement(csvContent);
                 toast({
                    title: result.success ? 'Processing Complete' : 'Processing Failed',
                    description: result.message,
                    variant: result.success ? 'default' : 'destructive',
                });
                if(result.success) {
                    onUploadSuccess();
                }
            }
             setLoading(false);
             setFile(null);
        };
        reader.readAsText(file);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Process Bank Statement</CardTitle>
                <CardDescription>Upload a bank statement CSV to automatically approve pending deposit requests.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                 <div className="grid w-full max-w-sm items-center gap-1.5">
                    <label htmlFor="csv-upload" className="sr-only">Upload CSV</label>
                    <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                </div>
                <Button onClick={handleUpload} disabled={loading || !file}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 h-4 w-4" />}
                    Process
                </Button>
            </CardContent>
        </Card>
    )
}


export default function DepositsPage() {
    const [requests, setRequests] = useState<DepositRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const fetchedRequests = await listDepositRequests();
        setRequests(fetchedRequests);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject') => {
        const result = await processDepositRequest(requestId, action);
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
            <h1 className="text-3xl font-bold">Deposit Requests</h1>
            <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
        </div>
        
        <BankStatementUploader onUploadSuccess={fetchRequests} />

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>Review and process pending deposit requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto my-10" /></TableCell></TableRow>
              ) : requests.length === 0 ? (
                 <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No pending requests found.</TableCell></TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{new Date(req.requestedAt).toLocaleString()}</TableCell>
                    <TableCell>
                        <div className="font-medium">{req.userName}</div>
                        <div className="text-xs text-muted-foreground">{req.userEmail}</div>
                    </TableCell>
                    <TableCell className="font-mono">{req.transactionId}</TableCell>
                    <TableCell>{req.agentId ? 'Yes' : 'No'}</TableCell>
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
                                    This will approve the deposit of ₹{req.amount.toFixed(2)} for {req.userName}. This action cannot be undone.
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
                                    This will reject the deposit request from {req.userName}. This action cannot be undone.
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
