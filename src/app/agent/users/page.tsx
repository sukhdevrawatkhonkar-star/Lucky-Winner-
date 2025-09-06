
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { listAgentUsers, updateUserStatus, deleteUser, createUser } from '@/app/actions';
import { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, RefreshCw, UserPlus } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ManageWalletDialog, SetWalletLimitDialog } from '@/components/shared/UserActionsDialogs';
import { CreateUserForm } from '@/components/shared/CreateUserForm';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AgentUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [agent, setAgent] = useState<{uid: string, customId: string} | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchUsers = useCallback(async (agentId: string) => {
    setLoading(true);
    const userList = await listAgentUsers(agentId);
    setUsers(userList);
    setLoading(false);
  }, []);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if(user) {
            const token = await user.getIdTokenResult();
            if (token.claims.role === 'agent') {
                 const userDoc = await auth.currentUser?.getIdTokenResult();
                 // @ts-ignore
                 const customId = userDoc?.claims.customId;
                 setAgent({uid: user.uid, customId});
                 fetchUsers(user.uid);
            } else {
                 router.push('/login');
            }
        } else {
            router.push('/login');
        }
    });
    return () => unsubscribe();
  }, [fetchUsers, router]);


  const handleStatusChange = async (uid: string, disabled: boolean) => {
    const result = await updateUserStatus(uid, disabled);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      if(agent) fetchUsers(agent.uid);
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (uid: string) => {
    const result = await deleteUser(uid);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
       if(agent) fetchUsers(agent.uid);
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };
  
   const onUserCreated = () => {
    if (agent) {
        fetchUsers(agent.uid);
    }
    setIsCreateUserOpen(false);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">My Users</h1>
            <div className='flex items-center gap-2'>
                 <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                         <CreateUserForm 
                            role="user" 
                            onAccountCreated={onUserCreated} 
                            agentCustomId={agent?.customId}
                            title="Create New User" 
                            description={`A new user will be created under your agent ID (${agent?.customId}).`}
                            onClose={() => setIsCreateUserOpen(false)}
                         />
                    </DialogContent>
                </Dialog>
                 <Button variant="outline" size="sm" onClick={() => agent && fetchUsers(agent.uid)} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>A list of all user accounts assigned to you.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Total Wallet</TableHead>
                  <TableHead>Wallet Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">No users found.</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-mono">{user.customId}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.mobile || 'N/A'}</TableCell>
                      <TableCell className="font-mono font-bold">
                        <IndianRupee className="inline-block h-3.5 w-3.5 mr-1" />
                        {(user.walletBalance ?? 0).toFixed(2)}
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
                        <ManageWalletDialog user={user} onUpdate={() => agent && fetchUsers(agent.uid)} />
                        <SetWalletLimitDialog user={user} onUpdate={() => agent && fetchUsers(agent.uid)} />
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
