
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getGameSettings, updateGameSettings } from '@/app/actions';
import type { BetType } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const BET_TYPES: BetType[] = ['single_ank', 'jodi', 'single_panna', 'double_panna', 'triple_panna', 'half_sangam', 'full_sangam', 'starline'];

const formatLabel = (betType: string) => {
    return betType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function SettingsPage() {
    const [rates, setRates] = useState<Record<BetType, number>>({
        single_ank: 0, jodi: 0, single_panna: 0, double_panna: 0, triple_panna: 0, half_sangam: 0, full_sangam: 0, starline: 0
    });
    const [commission, setCommission] = useState<number>(0);
    const [upiId, setUpiId] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            const settings = await getGameSettings();
            setRates(settings.rates);
            setCommission(settings.commission * 100); // Convert to percentage for display
            setUpiId(settings.upiId || '');
            setQrCodeUrl(settings.qrCodeUrl || '');
            setLoading(false);
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const commissionRate = commission / 100; // Convert back to decimal for storage
        const numericRates = Object.fromEntries(
            Object.entries(rates).map(([key, value]) => [key, Number(value)])
        ) as Record<BetType, number>;

        const result = await updateGameSettings(numericRates, commissionRate, upiId, qrCodeUrl);
        if (result.success) {
            toast({ title: 'Success', description: result.message });
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Game Settings</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Payout Rates</CardTitle>
                    <CardDescription>
                        Configure the winning multipliers for each bet type. This is how many times the bet amount will be multiplied for a win.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {BET_TYPES.map((type) => (
                            <div key={type} className="space-y-2">
                                <Label htmlFor={`rate-${type}`}>{formatLabel(type)} (e.g., 1:X)</Label>
                                <Input
                                    id={`rate-${type}`}
                                    type="number"
                                    value={rates[type] || ''}
                                    onChange={(e) => setRates({ ...rates, [type]: Number(e.target.value) })}
                                    placeholder="e.g., 90"
                                />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Agent Commission</CardTitle>
                    <CardDescription>
                        Set the commission percentage agents will earn on the total bet amount from their users.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                     <Label htmlFor="commission">Commission Rate (%)</Label>
                    <Input
                        id="commission"
                        type="number"
                        value={commission}
                        onChange={(e) => setCommission(Number(e.target.value))}
                        placeholder="e.g., 5 for 5%"
                        className="max-w-xs"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Deposit Settings</CardTitle>
                    <CardDescription>
                        Provide UPI details for users to deposit funds.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="upiId">UPI ID</Label>
                        <Input
                            id="upiId"
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g., yourname@oksbi"
                            className="max-w-md"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label htmlFor="qrCodeUrl">QR Code Image URL</Label>
                        <Input
                            id="qrCodeUrl"
                            type="text"
                            value={qrCodeUrl}
                            onChange={(e) => setQrCodeUrl(e.target.value)}
                            placeholder="https://your-image-host.com/qr.png"
                             className="max-w-md"
                        />
                         <p className="text-xs text-muted-foreground">Upload your QR code to an image hosting service and paste the direct link here.</p>
                     </div>
                </CardContent>
            </Card>

             <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
}
