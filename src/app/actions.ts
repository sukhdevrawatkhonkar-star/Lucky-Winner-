
'use server';

import { adminAuth, adminDb, FieldValue } from '@/lib/firebase/admin';
import type { UserProfile, UserRole, Transaction, Bet, BetType, WithdrawalRequest, GameSettings, DepositRequest, LotteryResult, Lottery, BetTime } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import Papa from 'papaparse';

// --- Helper Functions ---

const getAuthorizedUser = async (authToken?: string): Promise<{ uid: string; role: UserRole; email: string; customId: string; } | null> => {
    const headerList = headers();
    const token = authToken || headerList.get('Authorization')?.split('Bearer ')[1];
    
    if (!token) {
        console.error('Unauthorized: No token provided.');
        return null;
    }
    
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            throw new Error('User profile not found.');
        }
        const userProfile = userDoc.data() as UserProfile;

        return { 
            uid: decodedToken.uid, 
            role: userProfile.role, 
            email: userProfile.email,
            customId: userProfile.customId
        };
    } catch (error) {
        console.error('Error verifying auth token:', error);
        return null;
    }
};

const getGameSettingsForProcessing = async () => {
    const docRef = adminDb.collection('settings').doc('payoutRates');
    const doc = await docRef.get();
    if (!doc.exists) {
        return {
            rates: { single_ank: 9.5, jodi: 95, single_panna: 150, double_panna: 300, triple_panna: 1000, starline: 9.5, half_sangam: 1000, full_sangam: 10000 },
            commission: 0.05
        };
    }
    const data = doc.data()!;
    return { rates: data.rates, commission: data.commission };
};

const processWinners = async (
    transaction: FirebaseFirestore.Transaction,
    lotteryName: string,
    resultType: 'open' | 'close',
    winningAnk: string,
    winningPanna: string,
    winningJodi?: string
) => {
    const { rates: PAYOUT_RATES } = await getGameSettingsForProcessing();

    const betTypeChecks: { type: BetType, time?: BetTime }[] = [
        { type: 'single_ank', time: resultType },
        { type: 'single_panna', time: resultType },
        { type: 'double_panna', time: resultType },
        { type: 'triple_panna', time: resultType },
    ];
    if (resultType === 'close') {
        betTypeChecks.push({ type: 'jodi' });
    }

    for (const { type, time } of betTypeChecks) {
        let betsQuery = adminDb.collection('bets')
            .where('lotteryName', '==', lotteryName)
            .where('status', '==', 'placed')
            .where('betType', '==', type);
        
        if (time) {
            betsQuery = betsQuery.where('betTime', '==', time);
        }

        const betsSnapshot = await transaction.get(betsQuery);

        for (const betDoc of betsSnapshot.docs) {
            const bet = betDoc.data() as Bet;
            let isWinner = false;

            switch (bet.betType) {
                case 'single_ank': if (bet.numbers === winningAnk) isWinner = true; break;
                case 'jodi': if (bet.numbers === winningJodi) isWinner = true; break;
                case 'single_panna': case 'double_panna': case 'triple_panna': if (bet.numbers === winningPanna) isWinner = true; break;
            }

            if (isWinner) {
                const payoutRate = PAYOUT_RATES[bet.betType];
                const payoutAmount = bet.amount * payoutRate;
                transaction.update(betDoc.ref, { status: 'won', payout: payoutAmount });

                const userRef = adminDb.collection('users').doc(bet.userId);
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
            }
        }
    }
};

const processCommissions = async (transaction: FirebaseFirestore.Transaction, lotteryName: string) => {
    const { commission: AGENT_COMMISSION_RATE } = await getGameSettingsForProcessing();
    if (AGENT_COMMISSION_RATE <= 0) return;

    // Only calculate commission on bets that have not yet been processed for commission.
    const betsQuery = adminDb.collection('bets')
      .where('lotteryName', '==', lotteryName)
      .where('status', 'in', ['won', 'lost']);
      
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
            }
        }
    }
};

/**
 * Handles user sign-in (Google or Email), creating a profile if one doesn't exist.
 */
export async function handleSignIn(uid: string, email: string | null, name: string | null): Promise<{ success: boolean; isNewUser: boolean; message: string }> {
    try {
        const userDocRef = adminDb.collection('users').doc(uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            return { success: true, isNewUser: false, message: "Logged in successfully!" };
        } else {
            // New user gets a starting bonus
            const userProfile: Omit<UserProfile, 'uid'> = {
                name: name || 'Lucky Player',
                email: email || '',
                role: 'user',
                customId: `C${Math.random().toString().substring(2, 8)}`,
                createdAt: new Date().toISOString(),
                disabled: false,
                walletBalance: 100, // Starting bonus
                cashBalance: 100,
                creditBalance: 0,
            };
            await userDocRef.set(userProfile);
            
            const txRef = adminDb.collection('transactions').doc();
            await txRef.set({
                fromId: 'admin',
                fromEmail: 'System',
                toId: uid,
                toEmail: email,
                amount: 100,
                type: 'deposit',
                paymentType: 'cash',
                timestamp: new Date().toISOString()
            });

            return { success: true, isNewUser: true, message: "Welcome! Your account has been created with a bonus." };
        }
    } catch (error: any) {
        console.error('Error handling sign-in on server:', error);
        return { success: false, isNewUser: false, message: 'An error occurred on the server during sign-in.' };
    }
}

/**
 * Places a bet for a user.
 */
export async function placeBet(betDetails: {
    authToken: string,
    lotteryName: string,
    betType: BetType,
    numbers: string,
    amount: number,
    betTime?: 'open' | 'close'
}): Promise<{ success: boolean; message: string }> {
    const { authToken, lotteryName, betType, numbers, amount, betTime } = betDetails;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return { success: false, message: 'Invalid bet amount.' };
    }
    if (!numbers || typeof numbers !== 'string') {
        return { success: false, message: 'Invalid numbers provided.' };
    }

    // --- Server-Side Input Validation ---
    const betTypeRules = {
        single_ank: { length: 1, label: 'Single Ank' },
        jodi: { length: 2, label: 'Jodi' },
        single_panna: { length: 3, label: 'Single Panna' },
        double_panna: { length: 3, label: 'Double Panna' },
        triple_panna: { length: 3, label: 'Triple Panna' },
        starline: { length: 1, label: 'Starline' },
        half_sangam: { length: 4, label: 'Half Sangam' },
        full_sangam: { length: 6, label: 'Full Sangam' },
    };
    const rule = betTypeRules[betType];
    if (!rule || numbers.length !== rule.length) {
        return { success: false, message: `Invalid numbers for ${rule?.label || betType}. Expected ${rule?.length || 'a different number of'} digits.` };
    }
    // --- End Validation ---

    const user = await getAuthorizedUser(authToken);
    if (!user) {
        return { success: false, message: "Unauthorized." };
    }

    const userDocRef = adminDb.collection('users').doc(user.uid);

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists) {
                return { success: false, message: 'User not found.' };
            }
            const userProfile = userDoc.data() as UserProfile;

            if (userProfile.disabled) {
                return { success: false, message: 'Your account is disabled.' };
            }
             if (userProfile.walletLimit != null && (userProfile.walletBalance + amount) > userProfile.walletLimit) {
                return { success: false, message: `Cannot place bet. Exceeds wallet limit of ${userProfile.walletLimit}.` };
            }

            if (userProfile.walletBalance < amount) {
                return { success: false, message: 'Insufficient wallet balance.' };
            }

            transaction.update(userDocRef, {
                walletBalance: FieldValue.increment(-amount)
            });

            const betRef = adminDb.collection('bets').doc();
            const betData: Omit<Bet, 'id'> = {
                userId: user.uid,
                userEmail: userProfile.email,
                agentId: userProfile.agentId,
                lotteryName,
                betType,
                numbers,
                amount,
                createdAt: new Date().toISOString(),
                status: 'placed',
            };

            // Only add betTime if it's provided and relevant
            if (betTime) {
                betData.betTime = betTime;
            }

            transaction.set(betRef, betData);

            const txRef = adminDb.collection('transactions').doc();
             transaction.set(txRef, {
                fromId: user.uid,
                fromEmail: userProfile.email,
                toId: 'game-pot',
                toEmail: 'Game Pot',
                amount,
                type: 'bet',
                paymentType: 'cash',
                timestamp: new Date().toISOString()
            });

            return { success: true, message: 'Bet placed successfully!' };
        });
    } catch (error: any) {
        console.error('Error placing bet:', error);
        return { success: false, message: 'An error occurred while placing your bet.' };
    }
}


/**
 * Fetches historical results for a specific game.
 */
export async function getHistoricalResults(gameName: string): Promise<LotteryResult[]> {
    const snapshot = await adminDb.collection('historical_results')
        .where('lotteryName', '==', gameName)
        .orderBy('drawDate', 'desc')
        .limit(100)
        .get();
        
    return snapshot.docs.map(doc => ({ ...doc.data() } as LotteryResult));
}

export async function getDashboardStats(agentId?: string): Promise<any> {
    try {
        const currentUser = await getAuthorizedUser();
        if (!currentUser) return { totalUsers: 0, totalAgents: 0, totalBets: 0, totalRevenue: 0, totalCommission: 0, pendingDeposits: 0, pendingWithdrawals: 0 };
        
        if (agentId && currentUser.role === 'agent' && currentUser.uid === agentId) {
            // Agent stats
            const usersSnapshot = await adminDb.collection('users').where('agentId', '==', agentId).get();
            const betsSnapshot = await adminDb.collection('bets').where('agentId', '==', agentId).get();
            const commissionSnapshot = await adminDb.collection('transactions').where('toId', '==', agentId).where('type', '==', 'commission').get();
            
            const totalCommission = commissionSnapshot.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
            
            return {
                totalUsers: usersSnapshot.size,
                totalBets: betsSnapshot.size,
                totalCommission: totalCommission,
            };

        } else if (currentUser.role === 'admin') {
             // Admin stats
            const usersSnapshot = await adminDb.collection('users').where('role', '==', 'user').get();
            const agentsSnapshot = await adminDb.collection('users').where('role', '==', 'agent').get();
            const betsSnapshot = await adminDb.collection('bets').get();
            const pendingDepositsSnapshot = await adminDb.collection('deposits').where('status', '==', 'pending').get();
            const pendingWithdrawalsSnapshot = await adminDb.collection('withdrawals').where('status', '==', 'pending').get();
            
            const totalRevenue = betsSnapshot.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
            
            return {
                totalUsers: usersSnapshot.size,
                totalAgents: agentsSnapshot.size,
                totalBets: betsSnapshot.size,
                totalRevenue: totalRevenue,
                pendingDeposits: pendingDepositsSnapshot.size,
                pendingWithdrawals: pendingWithdrawalsSnapshot.size
            };
        }
        // If not an admin and trying to fetch general stats, or if agentId doesn't match, return empty.
        return { totalUsers: 0, totalAgents: 0, totalBets: 0, totalRevenue: 0, totalCommission: 0, pendingDeposits: 0, pendingWithdrawals: 0 };

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return { totalUsers: 0, totalAgents: 0, totalBets: 0, totalRevenue: 0, totalCommission: 0, pendingDeposits: 0, pendingWithdrawals: 0 };
    }
}


export async function listUsers(role: UserRole): Promise<UserProfile[]> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'admin') {
        console.error("Unauthorized attempt to list users.");
        return [];
    }
    const snapshot = await adminDb.collection('users').where('role', '==', role).get();
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
}

export async function listAgentUsers(agentId: string): Promise<UserProfile[]> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'agent' || currentUser.uid !== agentId) {
        console.error("Unauthorized attempt to list agent users.");
        return [];
    }
    const snapshot = await adminDb.collection('users').where('agentId', '==', agentId).get();
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
}


export async function updateUserStatus(uid: string, disabled: boolean): Promise<{ success: boolean; message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || !['admin', 'agent'].includes(currentUser.role)) {
        return { success: false, message: "Unauthorized." };
    }
    try {
        await adminAuth.updateUser(uid, { disabled });
        await adminDb.collection('users').doc(uid).update({ disabled });
        return { success: true, message: `User ${disabled ? 'disabled' : 'enabled'} successfully.` };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteUser(uid: string): Promise<{ success: boolean; message: string }> {
    const currentUser = await getAuthorizedUser();
     if (!currentUser || !['admin', 'agent'].includes(currentUser.role)) {
        return { success: false, message: "Unauthorized." };
    }
    try {
        await adminDb.collection('users').doc(uid).delete();
        await adminAuth.deleteUser(uid);
        return { success: true, message: 'User deleted successfully.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function createAdmin(email: string): Promise<{ success: boolean; message: string }> {
     // This is a special setup function. It can be called without auth, but should be protected/removed post-setup.
    try {
        const user = await adminAuth.getUserByEmail(email);
        await adminAuth.setCustomUserClaims(user.uid, { role: 'admin' });
        await adminDb.collection('users').doc(user.uid).update({ role: 'admin' });
        return { success: true, message: `User ${email} has been promoted to admin. They will need to log out and log back in for changes to take effect.` };
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            return { success: false, message: 'User with this email does not exist.' };
        }
        return { success: false, message: error.message };
    }
}

export async function updateUserProfile(uid: string, name: string, mobile: string, upiId: string): Promise<{ success: boolean, message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.uid !== uid) {
        return { success: false, message: "Unauthorized." };
    }
    try {
        const userRef = adminDb.collection('users').doc(uid);
        await userRef.update({ name, mobile, upiId });
        return { success: true, message: "Profile updated successfully!" };
    } catch (error: any) {
        console.error("Error updating profile:", error);
        return { success: false, message: "Failed to update profile." };
    }
}

export async function createUser(name: string, email: string, password: string, mobile: string, agentCustomId?: string): Promise<{ success: boolean; message: string }> {
    // This can be called by an admin, an agent, or a new user registering.
    // The auth check happens inside createAgent for agents/admins
    // For public registration, no initial auth is needed.
    
    // --- Server-Side Input Validation ---
    if (!name || name.trim().length < 3) {
        return { success: false, message: 'Name must be at least 3 characters.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return { success: false, message: 'Please provide a valid email address.' };
    }
    if (!password || password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long.' };
    }
    if (!mobile || !/^\d{10,15}$/.test(mobile)) {
        return { success: false, message: 'Please provide a valid mobile number.' };
    }
    // --- End Validation ---

    try {
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
            phoneNumber: `+91${mobile}`
        });

        let agentId, resolvedAgentCustomId;
        if (agentCustomId && agentCustomId !== 'no-agent') {
            const agentQuery = await adminDb.collection('users').where('customId', '==', agentCustomId).limit(1).get();
            if (agentQuery.empty) {
                await adminAuth.deleteUser(userRecord.uid); // Rollback
                return { success: false, message: `Agent with ID ${agentCustomId} not found.` };
            }
            agentId = agentQuery.docs[0].id;
            resolvedAgentCustomId = agentCustomId;
        }

        const userProfile: Omit<UserProfile, 'uid'> = {
            name,
            email,
            mobile,
            role: 'user',
            customId: `C${Math.random().toString().substring(2, 8)}`,
            createdAt: new Date().toISOString(),
            disabled: false,
            walletBalance: 0,
            cashBalance: 0,
            creditBalance: 0,
            agentId: agentId || undefined,
            agentCustomId: resolvedAgentCustomId || undefined,
        };

        await adminDb.collection('users').doc(userRecord.uid).set(userProfile);
        return { success: true, message: 'User created successfully.' };
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            return { success: false, message: 'An account with this email already exists.' };
        }
        return { success: false, message: error.message };
    }
}

export async function updateUserAgent(userId: string, agentCustomId: string): Promise<{ success: boolean; message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, message: "Unauthorized." };
    }
    try {
        const userRef = adminDb.collection('users').doc(userId);
        if (agentCustomId === 'no-agent') {
            await userRef.update({
                agentId: FieldValue.delete(),
                agentCustomId: FieldValue.delete()
            });
             return { success: true, message: 'User assigned to Admin successfully.' };
        }

        const agentQuery = await adminDb.collection('users').where('customId', '==', agentCustomId).limit(1).get();
        if (agentQuery.empty) {
            return { success: false, message: `Agent with ID ${agentCustomId} not found.` };
        }
        const agentId = agentQuery.docs[0].id;
        
        await userRef.update({ agentId, agentCustomId });
        return { success: true, message: 'User agent updated successfully.' };

    } catch(error: any) {
        return { success: false, message: error.message };
    }
}

export async function createAgent(name: string, email: string, mobile: string, password: string): Promise<{ success: boolean; message: string }> {
     const currentUser = await getAuthorizedUser();
     if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, message: "Unauthorized." };
    }
     // --- Server-Side Input Validation ---
    if (!name || name.trim().length < 3) {
        return { success: false, message: 'Name must be at least 3 characters.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return { success: false, message: 'Please provide a valid email address.' };
    }
    if (!password || password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long.' };
    }
    if (!mobile || !/^\d{10,15}$/.test(mobile)) {
        return { success: false, message: 'Please provide a valid mobile number.' };
    }
    // --- End Validation ---
    
    try {
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
            phoneNumber: `+91${mobile}`
        });

        await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'agent' });
        
        const agentProfile: Omit<UserProfile, 'uid'> = {
            name,
            email,
            mobile,
            role: 'agent',
            customId: `A${Math.random().toString().substring(2, 8)}`,
            createdAt: new Date().toISOString(),
            disabled: false,
            walletBalance: 0,
            cashBalance: 0,
            creditBalance: 0,
        };

        await adminDb.collection('users').doc(userRecord.uid).set(agentProfile);
        return { success: true, message: 'Agent created successfully.' };
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            return { success: false, message: 'An account with this email already exists.' };
        }
        return { success: false, message: error.message };
    }
}

export async function updateWalletBalance(
    targetUserId: string,
    amount: number,
    paymentType: 'cash' | 'credit'
): Promise<{ success: boolean; message: string }> {
    // --- Server-Side Input Validation ---
    if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
        return { success: false, message: 'Invalid amount provided.' };
    }
    // --- End Validation ---

    const currentUser = await getAuthorizedUser();
    if (!currentUser || !['admin', 'agent'].includes(currentUser.role)) {
        return { success: false, message: "Unauthorized." };
    }

    const targetUserRef = adminDb.collection('users').doc(targetUserId);

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const sourceUserRef = adminDb.collection('users').doc(currentUser.uid);
            const sourceUserDoc = await transaction.get(sourceUserRef);
            const targetUserDoc = await transaction.get(targetUserRef);

            if (!targetUserDoc.exists || !sourceUserDoc.exists) {
                return { success: false, message: "User not found." };
            }

            const targetUserProfile = targetUserDoc.data() as UserProfile;
            const sourceUserProfile = sourceUserDoc.data() as UserProfile;
            
            // Check for wallet limits
            const newBalance = (targetUserProfile.walletBalance || 0) + amount;
            if (targetUserProfile.walletLimit != null && newBalance > targetUserProfile.walletLimit) {
                return { success: false, message: `Action failed. User's new balance would exceed their limit of ${targetUserProfile.walletLimit}.` };
            }
            if (sourceUserProfile.walletLimit != null && sourceUserProfile.role === 'agent' && amount > 0) {
                 const newSourceBalance = (sourceUserProfile.walletBalance || 0) - amount;
                 if(newSourceBalance < 0){
                    return { success: false, message: `Action failed. Insufficient balance.` };
                 }
            }


            // Update target user's balance
            transaction.update(targetUserRef, {
                walletBalance: FieldValue.increment(amount),
                [paymentType === 'cash' ? 'cashBalance' : 'creditBalance']: FieldValue.increment(amount)
            });

            // If an agent is funding a user, deduct from the agent's balance
            if (currentUser.role === 'agent' && amount > 0) {
                 transaction.update(sourceUserRef, {
                    walletBalance: FieldValue.increment(-amount),
                    cashBalance: FieldValue.increment(-amount)
                });
            }

            // Create transaction log
            const txRef = adminDb.collection('transactions').doc();
            transaction.set(txRef, {
                fromId: amount > 0 ? currentUser.uid : targetUserId,
                fromEmail: amount > 0 ? currentUser.email : targetUserProfile.email,
                toId: amount > 0 ? targetUserId : currentUser.uid,
                toEmail: amount > 0 ? targetUserProfile.email : currentUser.email,
                amount: Math.abs(amount),
                type: 'transfer',
                paymentType,
                timestamp: new Date().toISOString(),
            });

            const action = amount > 0 ? 'added to' : 'removed from';
            return { success: true, message: `${Math.abs(amount)} coins successfully ${action} ${targetUserProfile.email}'s wallet.` };
        });
    } catch (error: any) {
        console.error("Error updating wallet balance:", error);
        return { success: false, message: "An error occurred during the transaction." };
    }
}

export async function updateWalletLimit(userId: string, limit: number | null): Promise<{ success: boolean; message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || !['admin', 'agent'].includes(currentUser.role)) {
        return { success: false, message: "Unauthorized." };
    }
    try {
        await adminDb.collection('users').doc(userId).update({
            walletLimit: limit
        });
        return { success: true, message: 'Wallet limit updated successfully.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function listBets(userId?: string, agentId?: string): Promise<Bet[]> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser) return [];

    let query: FirebaseFirestore.Query = adminDb.collection('bets');

    if (currentUser.role === 'user' && userId === currentUser.uid) {
        query = query.where('userId', '==', userId);
    } else if (currentUser.role === 'agent' && agentId === currentUser.uid) {
        query = query.where('agentId', '==', agentId);
    } else if (currentUser.role === 'admin') {
        // Admin can see all bets, no filter needed unless specified
        if (userId) {
             query = query.where('userId', '==', userId);
        } else if (agentId) {
             query = query.where('agentId', '==', agentId);
        }
    } else {
        return []; // Unauthorized request
    }

    query = query.orderBy('createdAt', 'desc').limit(200);
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
}

export async function listTransactions(userId: string, role: UserRole): Promise<Transaction[]> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.uid !== userId) return [];

    let query: FirebaseFirestore.Query;
    
    if (role === 'admin') {
        // Admin sees all transactions they initiated (funding agents)
        query = adminDb.collection('transactions')
            .where('fromId', '==', userId)
            .where('type', '==', 'transfer');
    } else {
        // Users and agents see transactions where they are either the sender or receiver
         const toQuery = adminDb.collection('transactions').where('toId', '==', userId);
         const fromQuery = adminDb.collection('transactions').where('fromId', '==', userId);

         const [toSnapshot, fromSnapshot] = await Promise.all([toQuery.get(), fromQuery.get()]);

         const transactionsMap = new Map<string, Transaction>();
         toSnapshot.forEach(doc => transactionsMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));
         fromSnapshot.forEach(doc => transactionsMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));
         
         const transactions = Array.from(transactionsMap.values());
         transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
         return transactions;
    }
    
    const snapshot = await query.orderBy('timestamp', 'desc').limit(200).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
}

export async function getGameSettings(): Promise<GameSettings> {
     const currentUser = await getAuthorizedUser(); 
     if (!currentUser) {
        // For public pages like /rates, we don't require auth
        // In a more secure app, you might only allow logged-in users
     }
    const doc = await adminDb.collection('settings').doc('payoutRates').get();
    if (!doc.exists) {
        // Default values
        return {
            rates: {
                single_ank: 9.5, jodi: 95, single_panna: 150, double_panna: 300, triple_panna: 1000, starline: 9.5, half_sangam: 1000, full_sangam: 10000
            },
            commission: 0.05,
            upiId: '',
            qrCodeUrl: ''
        };
    }
    return doc.data() as GameSettings;
}

export async function updateGameSettings(rates: Record<BetType, number>, commission: number, upiId: string, qrCodeUrl: string): Promise<{ success: boolean; message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, message: "Unauthorized." };
    }
    try {
        await adminDb.collection('settings').doc('payoutRates').set({ rates, commission, upiId, qrCodeUrl });
        return { success: true, message: 'Game settings updated successfully.' };
    } catch (error: any) {
        return { success: false, message: 'Failed to update settings.' };
    }
}


export async function declareResultManually(
    lotteryName: string,
    resultType: 'open' | 'close',
    panna: string
): Promise<{ success: boolean, message: string }> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, message: "Unauthorized." };
    }
    
    if (panna.length !== 3 || !/^\d{3}$/.test(panna)) {
        return { success: false, message: 'Invalid Panna. Must be 3 digits.' };
    }
    
    const ank = (panna.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0) % 10).toString();
    const resultDocRef = adminDb.collection('results').doc(lotteryName);
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).toISOString().split('T')[0];
    const resultLockRef = adminDb.collection('result_locks').doc(`${lotteryName}_${today}`);

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const currentResultDoc = await transaction.get(resultDocRef);
            let resultData: Partial<LotteryResult>;

            if (resultType === 'open') {
                resultData = {
                    lotteryName,
                    drawDate: new Date().toISOString(),
                    openPanna: panna,
                    openAnk: ank,
                    status: 'open',
                    source: 'manual',
                };
                transaction.set(resultDocRef, resultData, { merge: true });
                transaction.set(resultLockRef, { openDeclared: true, manualOverride: true }, { merge: true });
                
                await processWinners(transaction, lotteryName, 'open', ank, panna);

            } else { // Close result
                if (!currentResultDoc.exists || !currentResultDoc.data()?.openAnk) {
                    throw new Error('Cannot declare close result before open result.');
                }
                const openAnk = currentResultDoc.data()!.openAnk!;
                const openPanna = currentResultDoc.data()!.openPanna!;
                const jodi = `${openAnk}${ank}`;
                const fullResult = `${openPanna}-${jodi}-${panna}`;

                resultData = {
                    closePanna: panna,
                    closeAnk: ank,
                    jodi,
                    fullResult,
                    status: 'closed',
                    source: 'manual',
                };
                 transaction.set(resultDocRef, resultData, { merge: true });
                 transaction.set(resultLockRef, { closeDeclared: true, manualOverride: true }, { merge: true });

                 await processWinners(transaction, lotteryName, 'close', ank, panna, jodi);
                 
                 const remainingBetsQuery = adminDb.collection('bets').where('lotteryName', '==', lotteryName).where('status', '==', 'placed');
                 const remainingBetsSnap = await transaction.get(remainingBetsQuery);
                 remainingBetsSnap.forEach(betDoc => transaction.update(betDoc.ref, { status: 'lost' }));

                 await processCommissions(transaction, lotteryName);
            }

            return { success: true, message: `${resultType.toUpperCase()} result for ${lotteryName} declared, and winners processed.` };
        });
    } catch (error: any) {
        console.error("Error declaring manual result:", error);
        return { success: false, message: error.message };
    }
}

// --- Withdrawal Actions ---

export async function createWithdrawalRequest(amount: number): Promise<{ success: boolean; message: string }> {
    const user = await getAuthorizedUser();
    if (!user) {
        return { success: false, message: "Unauthorized." };
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        return { success: false, message: 'Invalid withdrawal amount.' };
    }

    const userRef = adminDb.collection('users').doc(user.uid);

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                return { success: false, message: 'User not found.' };
            }
            const userProfile = userDoc.data() as UserProfile;

            if (userProfile.cashBalance < amount) {
                return { success: false, message: 'Insufficient cash balance for withdrawal.' };
            }

            const requestRef = adminDb.collection('withdrawals').doc();
            const requestData: Omit<WithdrawalRequest, 'id'> = {
                userId: user.uid,
                userEmail: userProfile.email,
                userName: userProfile.name,
                userUpiId: userProfile.upiId || 'Not Provided',
                agentId: userProfile.agentId,
                amount: amount,
                status: 'pending',
                requestedAt: new Date().toISOString(),
            };

            transaction.set(requestRef, requestData);

            return { success: true, message: 'Your withdrawal request has been submitted successfully.' };
        });
    } catch (error: any) {
        console.error("Error creating withdrawal request:", error);
        return { success: false, message: "An error occurred while submitting your request." };
    }
}

export async function listWithdrawalRequests(agentId?: string): Promise<WithdrawalRequest[]> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || !['admin', 'agent'].includes(currentUser.role)) {
        return [];
    }

    let query: FirebaseFirestore.Query = adminDb.collection('withdrawals');

    if (currentUser.role === 'agent') {
        query = query.where('agentId', '==', currentUser.uid);
    }
    // Admin sees all requests

    query = query.orderBy('requestedAt', 'desc').limit(100);
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
}

export async function processWithdrawalRequest(
    requestId: string,
    action: 'approve' | 'reject'
): Promise<{ success: boolean; message: string }> {
    const processor = await getAuthorizedUser();
    if (!processor || !['admin', 'agent'].includes(processor.role)) {
        return { success: false, message: 'Unauthorized.' };
    }

    const requestRef = adminDb.collection('withdrawals').doc(requestId);

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const requestDoc = await transaction.get(requestRef);
            if (!requestDoc.exists) {
                return { success: false, message: 'Withdrawal request not found.' };
            }
            const requestData = requestDoc.data() as WithdrawalRequest;
            const userRef = adminDb.collection('users').doc(requestData.userId);

            if (requestData.status !== 'pending') {
                return { success: false, message: `This request has already been ${requestData.status}.` };
            }

            if (action === 'approve') {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) {
                    throw new Error('User to withdraw from does not exist.');
                }
                const userProfile = userDoc.data() as UserProfile;
                if (userProfile.cashBalance < requestData.amount) {
                    throw new Error('User has insufficient cash balance.');
                }

                // Deduct from user's balance
                transaction.update(userRef, {
                    walletBalance: FieldValue.increment(-requestData.amount),
                    cashBalance: FieldValue.increment(-requestData.amount),
                });

                // Create transaction log
                const txRef = adminDb.collection('transactions').doc();
                transaction.set(txRef, {
                    fromId: requestData.userId,
                    fromEmail: requestData.userEmail,
                    toId: processor.uid,
                    toEmail: processor.email,
                    amount: requestData.amount,
                    type: 'withdrawal',
                    paymentType: 'cash',
                    timestamp: new Date().toISOString(),
                });
            }

            // Update request status
            transaction.update(requestRef, {
                status: action === 'approve' ? 'approved' : 'rejected',
                processedAt: new Date().toISOString(),
                processedBy: processor.uid,
            });

            return { success: true, message: `Request has been successfully ${action === 'approve' ? 'approved' : 'rejected'}.` };
        });
    } catch (error: any) {
        console.error("Error processing withdrawal request:", error);
        return { success: false, message: error.message || "An error occurred." };
    }
}

// --- Deposit Actions ---

export async function createDepositRequest(amount: number, transactionId: string): Promise<{ success: boolean; message: string }> {
    const user = await getAuthorizedUser();
    if (!user) {
        return { success: false, message: "Unauthorized." };
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        return { success: false, message: 'Invalid deposit amount.' };
    }
    if (!transactionId || transactionId.trim().length === 0) {
        return { success: false, message: 'Transaction ID is required.' };
    }

    try {
        const userDoc = await adminDb.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            return { success: false, message: 'User not found.' };
        }
        const userProfile = userDoc.data() as UserProfile;

        const requestRef = adminDb.collection('deposits').doc();
        const requestData: Omit<DepositRequest, 'id'> = {
            userId: user.uid,
            userEmail: userProfile.email,
            userName: userProfile.name,
            agentId: userProfile.agentId,
            amount,
            transactionId,
            status: 'pending',
            requestedAt: new Date().toISOString(),
        };

        await requestRef.set(requestData);

        return { success: true, message: 'Your deposit request has been submitted. It will be reviewed shortly.' };
    } catch (error: any) {
        console.error("Error creating deposit request:", error);
        return { success: false, message: "An error occurred while submitting your request." };
    }
}

export async function listDepositRequests(): Promise<DepositRequest[]> {
    const currentUser = await getAuthorizedUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return [];
    }

    const query = adminDb.collection('deposits').orderBy('requestedAt', 'desc').limit(100);
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest));
}

export async function processDepositRequest(
    requestId: string,
    action: 'approve' | 'reject'
): Promise<{ success: boolean; message: string }> {
    const processor = await getAuthorizedUser();
    if (!processor || processor.role !== 'admin') {
        return { success: false, message: 'Unauthorized.' };
    }

    const requestRef = adminDb.collection('deposits').doc(requestId);

    try {
        return await adminDb.runTransaction(async (transaction) => {
            const requestDoc = await transaction.get(requestRef);
            if (!requestDoc.exists) {
                return { success: false, message: 'Deposit request not found.' };
            }
            const requestData = requestDoc.data() as DepositRequest;
            const userRef = adminDb.collection('users').doc(requestData.userId);

            if (requestData.status !== 'pending') {
                return { success: false, message: `This request has already been ${requestData.status}.` };
            }

            if (action === 'approve') {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) {
                    throw new Error('User to deposit to does not exist.');
                }

                // Add to user's balance
                transaction.update(userRef, {
                    walletBalance: FieldValue.increment(requestData.amount),
                    cashBalance: FieldValue.increment(requestData.amount),
                });

                // Create transaction log
                const txRef = adminDb.collection('transactions').doc();
                transaction.set(txRef, {
                    fromId: processor.uid,
                    fromEmail: processor.email,
                    toId: requestData.userId,
                    toEmail: requestData.userEmail,
                    amount: requestData.amount,
                    type: 'deposit',
                    paymentType: 'cash',
                    timestamp: new Date().toISOString(),
                });
            }

            // Update request status
            transaction.update(requestRef, {
                status: action === 'approve' ? 'approved' : 'rejected',
                processedAt: new Date().toISOString(),
                processedBy: processor.uid,
            });

            return { success: true, message: `Request has been successfully ${action === 'approve' ? 'approved' : 'rejected'}.` };
        });
    } catch (error: any) {
        console.error("Error processing deposit request:", error);
        return { success: false, message: error.message || "An error occurred." };
    }
}


export async function processBankStatement(
    csvContent: string
): Promise<{ success: boolean; message: string; processedCount: number; notFoundCount: number }> {
    const processor = await getAuthorizedUser();
    if (!processor || processor.role !== 'admin') {
        return { success: false, message: 'Unauthorized.', processedCount: 0, notFoundCount: 0 };
    }

    try {
        const parseResult = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
        const transactions = parseResult.data as any[];

        if (!transactions || transactions.length === 0) {
            return { success: false, message: 'No transactions found in the file.', processedCount: 0, notFoundCount: 0 };
        }

        let processedCount = 0;
        let notFoundCount = 0;

        // Fetch all pending requests at once
        const pendingRequestsSnap = await adminDb.collection('deposits').where('status', '==', 'pending').get();
        const pendingRequests = pendingRequestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest));

        for (const record of transactions) {
            // Adjust these keys based on your bank's CSV format
            const transactionId = record['Transaction ID'] || record['Ref No'] || record['ID'] || record['transactionId'];
            const amountStr = record['Amount'] || record['Credit'] || record['amount'];
            
            if (!transactionId || !amountStr) {
                continue; // Skip rows that don't have the required data
            }
            
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            if (isNaN(amount) || amount <= 0) {
                continue; // Skip if amount is not a valid positive number
            }

            const matchingRequest = pendingRequests.find(
                req => req.transactionId === transactionId && req.amount === amount
            );
            
            if (matchingRequest) {
                const result = await processDepositRequest(matchingRequest.id, 'approve');
                if (result.success) {
                    processedCount++;
                    // Remove the processed request from the array to prevent reprocessing
                    const index = pendingRequests.findIndex(r => r.id === matchingRequest.id);
                    if (index > -1) pendingRequests.splice(index, 1);
                }
            } else {
                notFoundCount++;
            }
        }

        return {
            success: true,
            message: `Statement processed. Approved: ${processedCount}. Not found or already processed: ${notFoundCount}.`,
            processedCount,
            notFoundCount,
        };

    } catch (error: any) {
        console.error("Error processing bank statement:", error);
        return { success: false, message: 'Failed to parse or process the file. Please ensure it is a valid CSV.', processedCount: 0, notFoundCount: 0 };
    }
}

// Game Management Actions
export async function createLotteryGame(authToken: string, game: Omit<Lottery, 'id'>): Promise<{ success: boolean, message: string }> {
    const user = await getAuthorizedUser(authToken);
    if (!user || user.role !== 'admin') {
        return { success: false, message: "Unauthorized." };
    }

    try {
        const gameRef = adminDb.collection('lotteries').doc(game.name);
        const doc = await gameRef.get();
        if (doc.exists) {
            return { success: false, message: `Game with name "${game.name}" already exists.` };
        }
        await gameRef.set(game);
        revalidatePath('/'); // Revalidate home page to show new game
        return { success: true, message: `Game "${game.name}" created successfully.` };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function listLotteryGames(): Promise<Lottery[]> {
    // This can be public as game list is not sensitive
    const snapshot = await adminDb.collection('lotteries').orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lottery));
}

export async function updateLotteryGameTimes(authToken: string, gameId: string, openTime: string | null, closeTime: string | null): Promise<{ success: boolean, message: string, updatedGame?: Lottery }> {
    const user = await getAuthorizedUser(authToken);
    if (!user || user.role !== 'admin') {
        return { success: false, message: "Unauthorized." };
    }
     try {
        const gameRef = adminDb.collection('lotteries').doc(gameId);
        await gameRef.update({ openTime, closeTime });
        const updatedDoc = await gameRef.get();
        const updatedGame = { id: updatedDoc.id, ...updatedDoc.data() } as Lottery;
        revalidatePath('/');
        return { success: true, message: `Timings for "${gameId}" updated.`, updatedGame };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteLotteryGame(authToken: string, gameId: string): Promise<{ success: boolean, message: string }> {
     const user = await getAuthorizedUser(authToken);
    if (!user || user.role !== 'admin') {
        return { success: false, message: "Unauthorized." };
    }
    try {
        await adminDb.collection('lotteries').doc(gameId).delete();
        revalidatePath('/');
        return { success: true, message: 'Game deleted successfully.' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

    