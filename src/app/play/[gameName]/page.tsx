
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { GamePlay } from '@/components/GamePlay';
import { UserProfile } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';


export default function PlayPage() {
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState<{uid: string, profile: UserProfile} | null>(null);
    const [loading, setLoading] = useState(true);

    const gameName = Array.isArray(params.gameName) ? params.gameName[0] : params.gameName;
    const decodedGameName = decodeURIComponent(gameName || '');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                 const userDocRef = doc(db, "users", currentUser.uid);
                 const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                         setUser({ uid: currentUser.uid, profile: { uid: currentUser.uid, ...docSnap.data() } as UserProfile });
                    } else {
                        // User profile doesn't exist, log them out or handle as an error
                        auth.signOut();
                        router.push('/login');
                    }
                     setLoading(false);
                 });
                 return () => unsubscribeProfile();
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    if (loading || !user) {
        return null; // Let loading.tsx handle it
    }

    return (
        <div className="bg-[#171d22] min-h-screen text-white">
            <Header />
            <main className="pt-20 container mx-auto px-4 pb-16">
                <GamePlay gameName={decodedGameName} user={user} />
            </main>
        </div>
    )
}
