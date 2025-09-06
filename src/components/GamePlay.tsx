
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IndianRupee, Wallet, Loader2, ArrowLeft, Lock, Star } from 'lucide-react';
import { UserProfile, BetType, Lottery, BetTime } from '@/lib/types';
import { listLotteryGames, placeBet } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { auth } from '@/lib/firebase';


interface GamePlayProps {
    gameName: string;
    user: {
        uid: string;
        profile: UserProfile;
    };
}

// Helper to get current time in "HH:MM" format in 24-hour IST
const getCurrentISTTime = () => {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};


function BetForm({
    gameName,
    betType,
    userId,
    onBetPlaced,
    disabled,
    disabledMessage,
}: {
    gameName: string;
    betType: BetType;
    userId: string;
    onBetPlaced: () => void;
    disabled: boolean;
    disabledMessage: string;
}) {
    const [numbers, setNumbers] = useState('');
    const [openPanna, setOpenPanna] = useState('');
    const [closeAnk, setCloseAnk] = useState('');
    const [closePanna, setClosePanna] = useState('');
    const [amount, setAmount] = useState('');
    const [betTime, setBetTime] = useState<BetTime>('open');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const getRules = () => {
        switch (betType) {
            case 'single_ank': return { maxLength: 1, placeholder: 'e.g., 7', label: 'Single Ank (0-9)' };
            case 'jodi': return { maxLength: 2, placeholder: 'e.g., 42', label: 'Jodi (00-99)' };
            case 'single_panna': return { maxLength: 3, placeholder: 'e.g., 123', label: 'Single Panna' };
            case 'double_panna': return { maxLength: 3, placeholder: 'e.g., 112', label: 'Double Panna' };
            case 'triple_panna': return { maxLength: 3, placeholder: 'e.g., 555', label: 'Triple Panna' };
            case 'starline': return { maxLength: 1, placeholder: 'e.g., 5', label: 'Single Ank (0-9)' };
            case 'half_sangam': return { maxLength: 4, placeholder: '', label: 'Half Sangam' };
            case 'full_sangam': return { maxLength: 6, placeholder: '', label: 'Full Sangam' };
            default: return { maxLength: 10, placeholder: 'Enter numbers', label: 'Numbers' };
        }
    };

    const { maxLength, placeholder, label } = getRules();
    const showBetTimeSelector = betType.includes('ank') || betType.includes('panna');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (disabled) return;

        const betAmount = parseInt(amount, 10);
        if (isNaN(betAmount) || betAmount <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid amount to bet.', variant: 'destructive' });
            return;
        }

        let finalNumbers = numbers;
        if (betType === 'half_sangam') {
            finalNumbers = `${openPanna}${closeAnk}`;
        } else if (betType === 'full_sangam') {
            finalNumbers = `${openPanna}${closePanna}`;
        }

        if (!finalNumbers || finalNumbers.length !== maxLength) {
             toast({ title: 'Invalid Numbers', description: `Please enter valid numbers for this bet type (expected ${maxLength} digits).`, variant: 'destructive' });
            return;
        }

        setLoading(true);

        const currentUser = auth.currentUser;
        if (!currentUser) {
            toast({ title: 'Authentication Error', description: 'You are not logged in. Please log in again.', variant: 'destructive' });
            setLoading(false);
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            const result = await placeBet({
                authToken: token,
                lotteryName: gameName,
                betType: betType,
                numbers: finalNumbers,
                amount: betAmount,
                betTime: showBetTimeSelector ? betTime : undefined
            });

            if (result.success) {
                toast({ title: 'Success!', description: result.message });
                setNumbers('');
                setAmount('');
                setOpenPanna('');
                setCloseAnk('');
                setClosePanna('');
                onBetPlaced();
            } else {
                toast({ title: 'Bet Failed', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'An Error Occurred', description: error.message || 'Could not place bet.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    if (disabled) {
        return (
            <Alert variant="destructive" className="text-center">
                <Lock className="h-4 w-4" />
                <AlertTitle>Betting Closed</AlertTitle>
                <AlertDescription>{disabledMessage}</AlertDescription>
            </Alert>
        )
    }

    if (betType === 'half_sangam' || betType === 'full_sangam') {
        return (
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor={`open-panna-${betType}`}>Open Panna</Label>
                        <Input
                            id={`open-panna-${betType}`}
                            type="text"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            value={openPanna}
                            onChange={(e) => {
                               const val = e.target.value.replace(/[^0-9]/g, '');
                               if(val.length <= 3) setOpenPanna(val);
                            }}
                            placeholder="3 digits"
                            maxLength={3}
                            required
                            disabled={loading}
                        />
                    </div>
                    {betType === 'half_sangam' ? (
                        <div className="space-y-2">
                            <Label htmlFor="close-ank">Close Ank</Label>
                            <Input
                                id="close-ank"
                                type="text"
                                pattern="[0-9]*"
                                inputMode="numeric"
                                value={closeAnk}
                                onChange={(e) => {
                                   const val = e.target.value.replace(/[^0-9]/g, '');
                                   if(val.length <= 1) setCloseAnk(val);
                                }}
                                placeholder="1 digit"
                                maxLength={1}
                                required
                                disabled={loading}
                            />
                        </div>
                    ) : (
                         <div className="space-y-2">
                            <Label htmlFor="close-panna">Close Panna</Label>
                            <Input
                                id="close-panna"
                                type="text"
                                pattern="[0-9]*"
                                inputMode="numeric"
                                value={closePanna}
                                onChange={(e) => {
                                   const val = e.target.value.replace(/[^0-9]/g, '');
                                   if(val.length <= 3) setClosePanna(val);
                                }}
                                placeholder="3 digits"
                                maxLength={3}
                                required
                                disabled={loading}
                            />
                        </div>
                    )}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`amount-${betType}`}>Amount (Coins)</Label>
                    <Input
                        id={`amount-${betType}`}
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g., 10"
                        min="1"
                        required
                        disabled={loading}
                    />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Submit Bet'}
                </Button>
            </form>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             {showBetTimeSelector && (
                <div className="space-y-2">
                    <Label>Bet for</Label>
                    <RadioGroup
                        defaultValue="open"
                        className="flex gap-4"
                        value={betTime}
                        onValueChange={(value: 'open' | 'close') => setBetTime(value)}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="open" id={`open-${betType}`} />
                            <Label htmlFor={`open-${betType}`}>Open</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="close" id={`close-${betType}`} />
                            <Label htmlFor={`close-${betType}`}>Close</Label>
                        </div>
                    </RadioGroup>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor={`numbers-${betType}`}>{label}</Label>
                <Input
                    id={`numbers-${betType}`}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={numbers}
                    onChange={(e) => {
                       const val = e.target.value.replace(/[^0-9]/g, '');
                       if(val.length <= maxLength) setNumbers(val);
                    }}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    required
                    disabled={loading}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor={`amount-${betType}`}>Amount (Coins)</Label>
                <Input
                    id={`amount-${betType}`}
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 100"
                    min="1"
                    required
                    disabled={loading}
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Submit Bet'}
            </Button>
        </form>
    );
}

export function GamePlay({ gameName, user }: GamePlayProps) {
    const router = useRouter();
    const [gameDetails, setGameDetails] = useState<Lottery | null>(null);
    const [marketOpen, setMarketOpen] = useState({ isOpen: false, message: 'Loading market status...' });
    const [marketClose, setMarketClose] = useState({ isOpen: false, message: '' });

    useEffect(() => {
        async function fetchGamesAndSetDetails() {
            const games = await listLotteryGames();
            const game = games.find(g => g.name === gameName);
            if (game) {
                setGameDetails(game);
            }
        }
        fetchGamesAndSetDetails();
    }, [gameName]);

    useEffect(() => {
        if (!gameDetails) return;

        const checkMarketStatus = () => {
             if (!gameDetails.openTime || !gameDetails.closeTime) {
                setMarketOpen({ isOpen: true, message: 'Market is open 24/7.' });
                setMarketClose({ isOpen: true, message: '' });
                return;
            }

            const now = getCurrentISTTime();
            const openTime = gameDetails.openTime;
            const closeTime = gameDetails.closeTime;

            const isOpenMarket = now < openTime;
            setMarketOpen({
                isOpen: isOpenMarket,
                message: isOpenMarket ? `Open betting closes at ${openTime} IST.` : `Open betting is closed. Close betting is active.`
            });

            const isCloseMarket = now < closeTime;
            setMarketClose({
                isOpen: isCloseMarket,
                message: isCloseMarket ? `Close betting closes at ${closeTime} IST.` : `Market is fully closed for today.`
            });
        };

        checkMarketStatus();
        const interval = setInterval(checkMarketStatus, 60000); // Check every minute

        return () => clearInterval(interval);

    }, [gameDetails]);

    const handleBetPlaced = () => {
        // The parent component's onSnapshot listener will automatically update the user prop
    };

    const isBettingDisabled = !marketOpen.isOpen && !marketClose.isOpen;
    const disabledMessage = isBettingDisabled ? 'Market is fully closed for today.' : '';

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    const renderBetForm = (betType: BetType, disabled: boolean, message: string) => {
        return (
            <BetForm
                gameName={gameName}
                betType={betType}
                userId={user.uid}
                onBetPlaced={handleBetPlaced}
                disabled={disabled}
                disabledMessage={message}
            />
        );
    };

    if(gameName === 'Starline') {
         return (
             <div className="space-y-6">
                 <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={handleBack}>
                        <ArrowLeft />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Star className="text-primary h-7 w-7" />
                        <h1 className="text-2xl font-bold text-primary">{gameName}</h1>
                    </div>
                </div>
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl">Place Starline Bet</CardTitle>
                        <CardDescription>
                           Starline games run throughout the day. Place your bet on a single ank.
                        </CardDescription>
                    </CardHeader>
                     <CardContent className="flex items-center justify-between text-lg">
                       <div className="flex items-center gap-2">
                         <Wallet className="h-6 w-6 text-primary" />
                         <span>Your Balance:</span>
                       </div>
                       <span className="font-bold flex items-center">
                         <IndianRupee className="h-5 w-5 mr-1" />
                         {user.profile.walletBalance.toFixed(2)}
                       </span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        {renderBetForm('starline', false, '')}
                    </CardContent>
                </Card>
             </div>
         )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={handleBack}>
                    <ArrowLeft />
                </Button>
                <h1 className="text-2xl font-bold text-primary">{gameName}</h1>
            </div>

            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl">Place Bet</CardTitle>
                    <CardDescription>
                        {marketOpen.isOpen ? marketOpen.message : marketClose.message}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-lg">
                   <div className="flex items-center gap-2">
                     <Wallet className="h-6 w-6 text-primary" />
                     <span>Your Balance:</span>
                   </div>
                   <span className="font-bold flex items-center">
                     <IndianRupee className="h-5 w-5 mr-1" />
                     {user.profile.walletBalance.toFixed(2)}
                   </span>
                </CardContent>
            </Card>

            <Tabs defaultValue="single_ank" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
                    <TabsTrigger value="single_ank">Single Ank</TabsTrigger>
                    <TabsTrigger value="jodi">Jodi</TabsTrigger>
                    <TabsTrigger value="panna">Panna</TabsTrigger>
                    <TabsTrigger value="half_sangam">Half Sangam</TabsTrigger>
                    <TabsTrigger value="full_sangam">Full Sangam</TabsTrigger>
                </TabsList>
                <Card className="mt-4">
                    <CardContent className="p-6">
                        <TabsContent value="single_ank">
                             {renderBetForm('single_ank', isBettingDisabled, disabledMessage)}
                        </TabsContent>
                        <TabsContent value="jodi">
                             {renderBetForm('jodi', !marketOpen.isOpen, 'Jodi betting is only available before the Open result.')}
                        </TabsContent>
                         <TabsContent value="panna">
                            <PannaBetting onBetPlaced={handleBetPlaced} disabled={isBettingDisabled} disabledMessage={disabledMessage} gameName={gameName} userId={user.uid} />
                        </TabsContent>
                        <TabsContent value="half_sangam">
                            {renderBetForm('half_sangam', !marketOpen.isOpen, 'Sangam betting is only available before the Open result.')}
                        </TabsContent>
                        <TabsContent value="full_sangam">
                            {renderBetForm('full_sangam', !marketOpen.isOpen, 'Sangam betting is only available before the Open result.')}
                        </TabsContent>
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}

function PannaBetting({ gameName, userId, onBetPlaced, disabled, disabledMessage }: Omit<Parameters<typeof BetForm>[0], 'betType'>) {
    const [pannaType, setPannaType] = useState<Extract<BetType, 'single_panna' | 'double_panna' | 'triple_panna'>>('single_panna');

    return (
        <div className="space-y-4">
            <RadioGroup
                value={pannaType}
                onValueChange={(value) => setPannaType(value as any)}
                className="flex justify-center gap-4"
                aria-label="Panna Type"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single_panna" id="single_panna" />
                    <Label htmlFor="single_panna">Single</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="double_panna" id="double_panna" />
                    <Label htmlFor="double_panna">Double</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="triple_panna" id="triple_panna" />
                    <Label htmlFor="triple_panna">Triple</Label>
                </div>
            </RadioGroup>
            <BetForm
                betType={pannaType}
                gameName={gameName}
                userId={userId}
                onBetPlaced={onBetPlaced}
                disabled={disabled}
                disabledMessage={disabledMessage}
            />
        </div>
    );
}
