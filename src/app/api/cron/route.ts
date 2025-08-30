
import 'server-only';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { LOTTERIES } from '@/lib/constants';
import type { Bet, BetTime, BetType, LotteryResult, UserProfile } from '@/lib/types';

// Helper function to get game settings from Firestore
const getGameSettings = async () => {
    const docRef = adminDb.collection('settings').doc('payoutRates');
    const doc = await docRef.get();
    if (!doc.exists) {
        // Return default values if not set
        return {
            rates: {
                single_ank: 9.5,
                jodi: 95,
                single_panna: 150,
                double_panna: 300,
                triple_panna: 1000,
                starline: 9.5,
                half_sangam: 1000,
                full_sangam: 10000,
            },
            commission: 0.05 // 5%
        };
    }
    const data = doc.data()!;
    return {
        rates: data.rates,
        commission: data.commission,
    };
};

// --- Helper function to generate a valid panna ---
const generatePanna = (): string => {
    const digits = Array.from({ length: 10 }, (_, i) => i);
    let panna = "";
    while (panna.length < 3) {
        const randomIndex = Math.floor(Math.random() * digits.length);
        const digit = digits.splice(randomIndex, 1)[0];
        panna += digit;
    }
    return panna.split('').sort().join('');
}

// --- Placeholder function to get real results ---
const getWinningNumbers = async (gameName: string, resultType: 'open' | 'close'): Promise<{ panna: string; ank: string; }> => {
    console.log(`Generating AUTOMATIC ${resultType} result for ${gameName}.`);
    // In a real application, you would fetch this from a reliable API/source.
    // For this demo, we are generating random numbers.
    const panna = generatePanna();
    const ank = (panna.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0) % 10).toString();
    return { panna, ank };
}

// Function to process bets and distribute winnings
const processWinners = async (
    transaction: FirebaseFirestore.Transaction,
    lotteryName: string,
    resultType: 'open' | 'close',
    winningAnk: string,
    winningPanna: string,
    winningJodi?: string
) => {
    const { rates: PAYOUT_RATES } = await getGameSettings();

    const betTypeChecks: { type: BetType, time?: BetTime }[] = [
        { type: 'single_ank', time: resultType },
        { type: 'single_panna', time: resultType },
        { type: 'double_panna', time: resultType },
        { type: 'triple_panna', time: resultType },
    ];
    // Jodi is only checked on 'close'
    if (resultType === 'close') {
        betTypeChecks.push({ type: 'jodi' });
    }

    for (const { type, time } of betTypeChecks) {
        let betsQuery = adminDb.collection('bets')
            .where('lotteryName', '==', lotteryName)
            .where('status', '==', 'placed')
            .where('betType', '==', type);
        
        // For ank and panna, we also need to match the bet time (open/close)
        if (time) {
            betsQuery = betsQuery.where('betTime', '==', time);
        }

        const betsSnapshot = await transaction.get(betsQuery);

        for (const betDoc of betsSnapshot.docs) {
            const bet = betDoc.data() as Bet;
            let isWinner = false;

            switch (bet.betType) {
                case 'single_ank':
                    if (bet.numbers === winningAnk) isWinner = true;
                    break;
                case 'jodi':
                    if (bet.numbers === winningJodi) isWinner = true;
                    break;
                case 'single_panna':
                case 'double_panna':
                case 'triple_panna':
                    if (bet.numbers === winningPanna) isWinner = true;
                    break;
            }

            if (isWinner) {
                const payoutRate = PAYOUT_RATES[bet.betType];
                const payoutAmount = bet.amount * payoutRate;
                transaction.update(betDoc.ref, { status: 'won', payout: payoutAmount });

                const userRef = adminDb.collection('users').doc(bet.userId);
                 const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) {
                    console.error(`CRITICAL: User document for UID ${bet.userId} not found during payout processing for bet ID ${betDoc.id}. Skipping payout.`);
                    continue; // Skip this user and continue with others
                }

                transaction.update(userRef, {
                    walletBalance: FieldValue.increment(payoutAmount),
                    cashBalance: FieldValue.increment(payoutAmount)
                });

                const winTxRef = adminDb.collection('transactions').doc();
                transaction.set(winTxRef, {
                    fromId: 'game-pot', toId: bet.userId, toEmail: bet.userEmail,
                    amount: payoutAmount, type: 'win', paymentType: 'cash',
                    timestamp: new Date().toISOString(),
                });
            } else if (resultType === 'close') { // Mark non-winning bets as lost only after close result
                transaction.update(betDoc.ref, { status: 'lost' });
            }
        }
    }
};

// Function to process agent commissions after market closes
const processCommissions = async (transaction: FirebaseFirestore.Transaction, lotteryName: string) => {
    const { commission: AGENT_COMMISSION_RATE } = await getGameSettings();

    const betsQuery = adminDb.collection('bets').where('lotteryName', '==', lotteryName);
    const betsSnapshot = await transaction.get(betsQuery);

    const agentBetTotals: Record<string, number> = {};

    for (const betDoc of betsSnapshot.docs) {
        const bet = betDoc.data() as Bet;
        if (bet.agentId) {
            agentBetTotals[bet.agentId] = (agentBetTotals[bet.agentId] || 0) + bet.amount;
        }
    }

    for (const agentId in agentBetTotals) {
        const totalBets = agentBetTotals[agentId];
        const commissionAmount = totalBets * AGENT_COMMISSION_RATE;

        if (commissionAmount > 0) {
            const agentRef = adminDb.collection('users').doc(agentId);
            const agentDoc = await transaction.get(agentRef);
            if (agentDoc.exists) {
                const agentEmail = agentDoc.data()?.email || 'unknown-agent';
                transaction.update(agentRef, {
                    walletBalance: FieldValue.increment(commissionAmount),
                    cashBalance: FieldValue.increment(commissionAmount)
                });

                const commissionTxRef = adminDb.collection('transactions').doc();
                transaction.set(commissionTxRef, {
                    fromId: 'admin', toId: agentId, toEmail: agentEmail,
                    amount: commissionAmount, type: 'commission', paymentType: 'cash',
                    timestamp: new Date().toISOString(),
                });
            } else {
                 console.error(`CRITICAL: Agent document for UID ${agentId} not found during commission processing. Skipping commission payment.`);
            }
        }
    }
};

const initializePendingResults = async (now: Date) => {
    const today = now.toISOString().split('T')[0];
    const resultsSnapshot = await adminDb.collection('results').get();
    const existingResults = new Set(resultsSnapshot.docs.map(doc => doc.id));
    
    const batch = adminDb.batch();

    for (const lottery of LOTTERIES) {
        if (!existingResults.has(lottery.name)) {
            const resultDocRef = adminDb.collection('results').doc(lottery.name);
            const resultData: Partial<LotteryResult> = {
                lotteryName: lottery.name,
                drawDate: now.toISOString(),
                status: 'pending',
                source: 'automatic',
            };
            batch.set(resultDocRef, resultData, { merge: true });
            console.log(`Initializing PENDING status for ${lottery.name}.`);
        } else {
            // Check if existing result is from a previous day
            const resultDoc = await adminDb.collection('results').doc(lottery.name).get();
            if(resultDoc.exists) {
                const resultData = resultDoc.data() as LotteryResult;
                const resultDate = new Date(resultData.drawDate).toISOString().split('T')[0];
                if(resultDate !== today) {
                     const resultDocRef = adminDb.collection('results').doc(lottery.name);
                     const newDayResultData: Partial<LotteryResult> = {
                        lotteryName: lottery.name,
                        drawDate: now.toISOString(),
                        status: 'pending',
                        source: 'automatic',
                     };
                     batch.set(resultDocRef, newDayResultData, { merge: true });
                     console.log(`Resetting PENDING status for ${lottery.name} for the new day.`);
                }
            }
        }
    }
    await batch.commit();
}


// Main GET handler for the cron job
export async function GET(request: Request) {
    try {
        const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        const today = now.toISOString().split('T')[0];

        console.log(`Cron job running at IST: ${currentTime}`);
        
        await initializePendingResults(now);

        for (const lottery of LOTTERIES) {
            const resultLockRef = adminDb.collection('result_locks').doc(`${lottery.name}_${today}`);
            
            // --- OPEN RESULT ---
            if (lottery.openTime && lottery.openTime === currentTime) {
                console.log(`Time to declare OPEN result for ${lottery.name}`);

                try {
                    await adminDb.runTransaction(async (transaction) => {
                        const lockDoc = await transaction.get(resultLockRef);
                        if (lockDoc.exists && lockDoc.data()?.openDeclared) {
                            console.log(`OPEN result for ${lottery.name} on ${today} already declared.`);
                            return;
                        }

                        const resultDocRef = adminDb.collection('results').doc(lottery.name);
                        const currentResultDoc = await transaction.get(resultDocRef);
                        if (currentResultDoc.exists && currentResultDoc.data()?.source === 'manual' && new Date(currentResultDoc.data()?.drawDate).toISOString().split('T')[0] === today && currentResultDoc.data()?.status !== 'pending') {
                            console.log(`Manual OPEN result for ${lottery.name} exists. Skipping automatic declaration.`);
                            transaction.set(resultLockRef, { openDeclared: true, manualOverride: true }, { merge: true });
                            return;
                        }

                        const { panna: openPanna, ank: openAnk } = await getWinningNumbers(lottery.name, 'open');
                        
                        const resultData: Partial<LotteryResult> = {
                            lotteryName: lottery.name,
                            drawDate: now.toISOString(),
                            openPanna,
                            openAnk,
                            status: 'open',
                            source: 'automatic',
                        };
                        
                        transaction.set(resultDocRef, resultData, { merge: true });
                        const historicalResultRef = adminDb.collection('historical_results').doc();
                        transaction.set(historicalResultRef, resultData);

                        await processWinners(transaction, lottery.name, 'open', openAnk, openPanna);
                        
                        transaction.set(resultLockRef, { openDeclared: true, manualOverride: false }, { merge: true });
                        console.log(`AUTOMATIC OPEN result for ${lottery.name} declared: ${openPanna}-${openAnk}`);
                    });
                } catch (error) {
                     console.error(`Failed to process OPEN result for ${lottery.name}:`, error);
                }
            }

            // --- CLOSE RESULT ---
            if (lottery.closeTime && lottery.closeTime === currentTime) {
                 console.log(`Time to declare CLOSE result for ${lottery.name}`);

                 try {
                     await adminDb.runTransaction(async (transaction) => {
                        const lockDoc = await transaction.get(resultLockRef);
                        if (lockDoc.exists && lockDoc.data()?.closeDeclared) {
                            console.log(`CLOSE result for ${lottery.name} on ${today} already declared.`);
                            return;
                        }
                        
                        const resultDocRef = adminDb.collection('results').doc(lottery.name);
                        const resultDoc = await transaction.get(resultDocRef);

                        if (resultDoc.exists && resultDoc.data()?.source === 'manual' && new Date(resultDoc.data()?.drawDate).toISOString().split('T')[0] === today && resultDoc.data()?.status === 'closed') {
                            console.log(`Manual CLOSE result for ${lottery.name} exists. Skipping automatic declaration.`);
                            transaction.set(resultLockRef, { closeDeclared: true, manualOverride: true }, { merge: true });
                            return;
                        }

                        if (!resultDoc.exists || !resultDoc.data()?.openAnk) {
                            console.error(`Cannot declare CLOSE result for ${lottery.name}, OPEN result is missing.`);
                            return;
                        }

                        const openAnk = resultDoc.data()!.openAnk!;
                        const openPanna = resultDoc.data()!.openPanna!;
                        const { panna: closePanna, ank: closeAnk } = await getWinningNumbers(lottery.name, 'close');

                        const jodi = `${openAnk}${closeAnk}`;
                        const fullResult = `${openPanna}-${jodi}-${closePanna}`;

                        const resultData: Partial<LotteryResult> = {
                            ...resultDoc.data(),
                            jodi,
                            closePanna,
                            closeAnk,
                            fullResult,
                            status: 'closed',
                            source: 'automatic',
                        };
                        
                        transaction.set(resultDocRef, resultData, { merge: true });
                        
                        const historicalQuery = await adminDb.collection('historical_results')
                            .where('lotteryName', '==', lottery.name)
                            .where('openPanna', '==', openPanna)
                            .orderBy('drawDate', 'desc').limit(1).get();

                        if (!historicalQuery.empty) {
                            const historicalDocRef = historicalQuery.docs[0].ref;
                            transaction.update(historicalDocRef, resultData);
                        } else {
                            const newHistoricalResultRef = adminDb.collection('historical_results').doc();
                            transaction.set(newHistoricalResultRef, resultData);
                        }
                        
                        await processWinners(transaction, lottery.name, 'close', closeAnk, closePanna, jodi);
                        
                        const remainingBetsQuery = adminDb.collection('bets').where('lotteryName', '==', lottery.name).where('status', '==', 'placed');
                        const remainingBetsSnap = await transaction.get(remainingBetsQuery);
                        remainingBetsSnap.forEach(betDoc => transaction.update(betDoc.ref, { status: 'lost' }));

                        await processCommissions(transaction, lottery.name);

                        transaction.set(resultLockRef, { closeDeclared: true, manualOverride: false }, { merge: true });
                        console.log(`AUTOMATIC CLOSE result for ${lottery.name} declared: ${fullResult}`);
                    });
                } catch (error) {
                     console.error(`Failed to process CLOSE result for ${lottery.name}:`, error);
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Cron job executed.' });
    } catch (error: any) {
        console.error('Error in cron job:', error);
        return new NextResponse(JSON.stringify({ success: false, message: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}
