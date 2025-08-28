
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LotteryResult } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Loader2, Megaphone } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { declareResultManually } from '@/app/actions';
import { LOTTERIES } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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

function DeclareResultForm({ onResultDeclared }: { onResultDeclared: () => void }) {
    const [lotteryName, setLotteryName] = useState('');
    const [resultType, setResultType] = useState<'open' | 'close'>('open');
    const [panna, setPanna] = useState('');
    const [ank, setAnk] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (panna.length === 3 && /^\d{3}$/.test(panna)) {
            const calculatedAnk = (panna.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0) % 10).toString();
            setAnk(calculatedAnk);
        } else {
            setAnk('');
        }
    }, [panna]);

    const handleDeclareResult = async () => {
        setLoading(true);
        const result = await declareResultManually(lotteryName, resultType, panna);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
            setLotteryName('');
            setPanna('');
            setResultType('open');
            onResultDeclared();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        setLoading(false);
    };

    const isFormInvalid = !lotteryName || !panna || panna.length !== 3;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone /> Declare Result Manually</CardTitle>
                <CardDescription>
                    Use this form to manually declare results. Manual results will always override automatic results.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Game</Label>
                        <Select value={lotteryName} onValueChange={setLotteryName} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a lottery" />
                            </SelectTrigger>
                            <SelectContent>
                                {LOTTERIES.map(l => <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Result Type</Label>
                        <RadioGroup value={resultType} onValueChange={(v: 'open' | 'close') => setResultType(v)} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="open" id="open" /><Label htmlFor="open">Open</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="close" id="close" /><Label htmlFor="close">Close</Label></div>
                        </RadioGroup>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="panna">Panna (3 digits)</Label>
                            <Input id="panna" type="text" value={panna} onChange={e => setPanna(e.target.value.replace(/[^0-9]/g, ''))} maxLength={3} placeholder="e.g. 123" required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="ank">Ank (Auto-calculated)</Label>
                            <Input id="ank" type="text" value={ank} readOnly placeholder="e.g. 6" />
                        </div>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button type="button" className="w-full" disabled={loading || isFormInvalid}>
                                {loading ? <Loader2 className="animate-spin" /> : 'Declare Result'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to declare this result?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action is irreversible. The result for <span className="font-bold text-primary">{lotteryName}</span> will be declared as <span className="font-bold text-primary">{resultType.toUpperCase()}: {panna}-{ank}</span>. All bets will be processed accordingly.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeclareResult}>Confirm & Declare</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </form>
            </CardContent>
        </Card>
    );
}


function DeclaredResultsList() {
    const [results, setResults] = useState<LotteryResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
        const q = collection(db, 'results');
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const resultsData: LotteryResult[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as DocumentData;
                resultsData.push({
                    lotteryName: doc.id,
                    ...data
                } as LotteryResult);
            });
            resultsData.sort((a, b) => a.lotteryName.localeCompare(b.lotteryName));
            setResults(resultsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching real-time results for admin: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);


    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><ListChecks /> Declared Results</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><ListChecks /> Current Results</CardTitle>
                 <CardDescription>Showing live results from the database.</CardDescription>
            </CardHeader>
            <CardContent className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4'>
                {results.length === 0 ? (
                    <p className="text-muted-foreground col-span-full text-center">No results declared yet.</p>
                ) : (
                    results.map(result => (
                        <div key={result.lotteryName} className="p-4 rounded-lg bg-muted flex flex-col items-center justify-center text-center">
                            <p className='font-bold text-lg'>{result.lotteryName}</p>
                            <Badge variant="secondary" className='text-xl my-2'>
                               {result.status === 'closed' ? result.fullResult : `${result.openPanna}-${result.openAnk}`}
                            </Badge>
                             <Badge variant={result.source === 'manual' ? 'default' : 'outline'} className={cn("capitalize text-xs", result.source === 'manual' ? 'border-primary' : 'border-muted-foreground')}>
                                {result.source || 'Automatic'}
                            </Badge>
                             <p className='text-xs text-muted-foreground mt-1'>
                                {result.status === 'closed' ? 'Result Declared' : 'Open Result'}
                            </p>
                            <p className='text-xs text-muted-foreground'>{new Date(result.drawDate).toLocaleString()}</p>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}


export default function ResultsPage() {

    // Dummy function to satisfy the prop, list will refresh automatically via snapshot
    const handleResultDeclared = () => {};

    return (
        <div className="space-y-6">
        <h1 className="text-3xl font-bold">Manage Results</h1>
        
        <div className='grid xl:grid-cols-2 gap-6'>
            <DeclareResultForm onResultDeclared={handleResultDeclared} />
            <DeclaredResultsList />
        </div>
        </div>
    );
}
