
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { listAgentUsers, updateUserStatus, deleteUser, createUser } from '@/app/actions';
import { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Loader2, RefreshCw } from 'lucide-react';
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
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ManageWalletDialog, SetWalletLimitDialog } from '@/components/shared/UserActionsDialogs';


function CreateUserCard({ agentCustomId, onUserCreated }: { agentCustomId: string, onUserCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
        toast({
            title: 'Weak Password',
            description: 'Password must be at least 6 characters long.',
            variant: 'destructive',
        });
        setLoading(false);
        return;
    }

    const result = await createUser(name, email, password, mobile, agentCustomId);

    if (result.success) {
      toast({
        title: 'Success',
        description: result.message,
      });
      setName('');
      setEmail('');
      setPassword('');
      setMobile('');
      onUserCreated();
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create New User</CardTitle>
        <CardDescription>A unique 6-digit Customer ID will be generated automatically and assigned to you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name-agent">User Full Name</Label>
            <Input
              id="name-agent"
              type="text"
              placeholder="e.g. Rahul Kumar"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-agent">User Email</Label>
            <Input
              id="email-agent"
              type="email"
              placeholder="user@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile-agent">Mobile</Label>
            <Input
              id="mobile-agent"
              type="tel"
              placeholder="User's mobile number"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-agent">Password</Label>
            <Input
              id="password-agent"
              type="password"
              placeholder="•••••••• (min. 6 characters)"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating User...' : 'Create User'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function AgentUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<{uid: string, customId: string} | null>(null);
  const { toast } = useToast();

  const handleDataUpdate = useCallback(() => {
     // This function can be left empty as the onSnapshot listener handles updates automatically.
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'agent') {
            const agentProfile = userDoc.data();
            setAgent({ uid: user.uid, customId: agentProfile.customId });
        } else {
             setAgent(null);
             setLoading(false);
        }
      } else {
        setAgent(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!agent) { 
      return; 
    }

    setLoading(true);
    const q = query(collection(db, "users"), where("agentId", "==", agent.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userList: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
            userList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        userList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUsers(userList);
        setLoading(false);
    }, (error) => {
        console.error("Failed to fetch agent users:", error);
        toast({ title: 'Error', description: 'Could not load user list.', variant: 'destructive' });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [agent, toast]);


  const handleStatusChange = async (uid: string, disabled: boolean) => {
    if (!agent) return;
    const result = await updateUserStatus(uid, disabled);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (uid: string) => {
    if (!agent) return;
    const result = await deleteUser(uid);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };


  if (loading && !agent) {
      return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-4">Authenticating agent...</p>
        </div>
      );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manage My Users</h1>
         {agent && (
            <Button variant="outline" size="sm" onClick={handleDataUpdate} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
         )}
      </div>
      
      {agent && <CreateUserCard agentCustomId={agent.customId} onUserCreated={handleDataUpdate} />}

      <Card>
        <CardHeader>
          <CardTitle>My User List</CardTitle>
          <CardDescription>A list of all users registered under you.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4">Loading users...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Wallet</TableHead>
                  <TableHead>Wallet Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No users found.</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-mono">{user.customId}</TableCell>
                      <TableCell>{user.email}</TableCell>
                       <TableCell className='font-bold'>
                          {user.walletBalance?.toFixed(2) || '0.00'}
                      </TableCell>
                       <TableCell>
                         {user.walletLimit ? `₹${user.walletLimit.toFixed(2)}` : 'No Limit'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.disabled ? 'destructive' : 'default'}>
                          {user.disabled ? 'Inactive' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {agent && <ManageWalletDialog user={user} onUpdate={handleDataUpdate} />}
                        {agent && <SetWalletLimitDialog user={user} onUpdate={handleDataUpdate} />}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(user.uid, !user.disabled)}
                        >
                          {user.disabled ? 'Activate' : 'Deactivate'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user account.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(user.uid)}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    