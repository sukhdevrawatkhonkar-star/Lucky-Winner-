
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';
import { Gem, Loader2, Home } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UnifiedLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!identifier || !password) {
        setError("Please enter both ID/Email and password.");
        setLoading(false);
        return;
    }

    try {
        const usersRef = collection(db, "users");
        const isEmail = identifier.includes('@');
        
        const q = isEmail 
            ? query(usersRef, where("email", "==", identifier), limit(1))
            : query(usersRef, where("customId", "==", identifier.toUpperCase()), limit(1));
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setError('No account found with this ID or Email.');
            setLoading(false);
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as UserProfile;
        
        // This is the core authentication step
        await signInWithEmailAndPassword(auth, userData.email, password);
        
        // Redirect based on role from the data we already fetched
        switch (userData.role) {
            case 'admin':
                router.push('/admin');
                break;
            case 'agent':
                router.push('/agent');
                break;
            case 'user':
            default:
                router.push('/');
                break;
        }

    } catch (err: any) {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-password') {
            setError("Incorrect password. Please try again.");
        } else {
            setError("An unexpected error occurred. Please try again.");
            console.error("Login Error:", err);
        }
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-royalBlue flex items-center justify-center p-4">
      <div className="bg-darkCard border border-gold/30 rounded-2xl shadow-lg shadow-gold/10 p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Gem className="text-gold h-12 w-12 mb-4" />
          <h2 className="text-white text-3xl font-cinzel">Admin & Agent Login</h2>
          <p className="text-lightGray text-sm mt-2">Login to your panel.</p>
        </div>

        {error && <div className="bg-red-600/50 border border-red-500 text-white text-sm p-3 rounded-lg mb-4 text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-lightGray">ID or Email</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="Enter your ID or Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="text-right text-sm">
              <Link href="/forgot-password" passHref className="text-gold/80 hover:text-gold hover:underline">
                Forgot Password?
              </Link>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="animate-spin" /> : "Login"}
          </Button>
        </form>

        <div className="text-center mt-6 space-y-2 text-sm">
             <p>
                <Link href="/" className="text-gold/80 hover:text-gold hover:underline flex items-center justify-center gap-2">
                    <Home className="h-4 w-4" /> Go to Homepage
                </Link>
            </p>
        </div>

      </div>
    </div>
  );
}
