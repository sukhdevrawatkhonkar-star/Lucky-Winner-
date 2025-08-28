
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { listDepositRequests, processDepositRequest, processBankStatement } from '@/app/actions';
import { DepositRequest } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2, RefreshCw, CheckCircle, XCircle, Upload, FileCheck2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ProcessStatementCard({ onProcessingDone }: { onProcessingDone: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleProcessFile = async () => {
        if (!file) {
            toast({ title: "No file selected", description: "Please select a bank statement CSV file to process.", variant: "destructive" });
            return;
        }

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            const result = await processBankStatement(content);

            if (result.success) {
                toast({
                    title: "Processing Complete",
                    description: result.message,
                });
                onProcessingDone(); // Refresh the main list
            } else {
                toast({
                    title: "Processing Failed",
                    description: result.message,
                    variant: "destructive",
                });
            }
            setFile(null); // Reset file input
            setLoading(false);
        };
        reader.onerror = () => {
             toast({
                title: "File Read Error",
                description: "Could not read the selected file.",
                variant: "destructive",
            });
            setLoading(false);
        }
        reader.readAsText(file);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Process Bank Statement</CardTitle>
                <CardDescription>
                    Upload your bank statement (in CSV format) to automatically approve matching deposit requests.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="statement-file">Bank Statement (CSV)</Label>
                    <Input id="statement-file" type="file" accept=".csv" onChange={handleFileChange} />
                    <p className="text-xs text-muted-foreground">
                        Ensure the CSV has columns for 'Transaction ID' and 'Amount'.
                    </p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleProcessFile} disabled={loading || !file} className="w-full">
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <FileCheck2 className="mr-2 h-4 w-4" />}
                    {loading ? "Processing..." : `Process ${file ? file.name : 'File'}`}
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function AdminDepositsPage() {
    const [requests, setRequests] = useState<DepositRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
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
        setProcessingId(requestId);
        const result = await processDepositRequest(requestId, action);
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
                <h1 className="text-3xl font-bold">Deposit Requests</h1>
                <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
            
            <ProcessStatementCard onProcessingDone={fetchRequests} />

            <Card>
                <CardHeader>
                    <CardTitle>Manual Requests</CardTitle>
                    <CardDescription>Review and process deposit requests from users manually.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : requests.length === 0 ? (
                        <p className="text-muted-foreground text-center">No deposit requests found.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Transaction ID</TableHead>
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
                                        <TableCell className="font-mono">{req.transactionId}</TableCell>
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
                                                                <AlertDialogTitle>Approve Deposit?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will add <span className="font-bold">₹{req.amount.toFixed(2)}</span> to {req.userEmail}'s cash balance. This action cannot be undone. Ensure you have verified the payment.
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
                                                                <AlertDialogTitle>Reject Deposit?</AlertDialogTitle>
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
