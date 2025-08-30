
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { listUsers, updateUserStatus, deleteUser, createUser, updateUserAgent } from '@/app/actions';
import { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, RefreshCw, UserPlus, Search } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ManageWalletDialog, SetWalletLimitDialog } from '@/components/shared/UserActionsDialogs';


function CreateUserDialog({ onUserCreated }: { onUserCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [agentCustomId, setAgentCustomId] = useState('no-agent');
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLoadingAgents(true);
      listUsers('agent').then(agentList => {
        setAgents(agentList);
        setLoadingAgents(false);
      });
    }
  }, [open]);

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
      toast({ title: 'Success', description: result.message });
      setName('');
      setEmail('');
      setPassword('');
      setMobile('');
      setAgentCustomId('no-agent');
      onUserCreated();
      setOpen(false);
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                    A unique 6-digit Customer ID will be generated automatically.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name-admin">User Full Name</Label>
                <Input id="name-admin" type="text" placeholder="e.g. Rahul Kumar" required value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-admin">User Email</Label>
                <Input id="email-admin" type="email" placeholder="user@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile-admin">Mobile</Label>
                <Input id="mobile-admin" type="tel" placeholder="User's mobile number" required value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-admin">Password</Label>
                <Input id="password-admin" type="password" placeholder="•••••••• (min. 6 characters)" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-select">Assign to Agent (Optional)</Label>
                <Select value={agentCustomId} onValueChange={setAgentCustomId} disabled={loading || loadingAgents}>
                    <SelectTrigger id="agent-select">
                        <SelectValue placeholder="Select an agent..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-agent">No Agent (Admin User)</SelectItem>
                        {agents.map(agent => (
                            <SelectItem key={agent.uid} value={agent.customId}>{agent.email} ({agent.customId})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create User'}</Button>
              </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
  );
}

function ChangeAgentDialog({ user, onAgentChanged }: { user: UserProfile, onAgentChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [newAgentId, setNewAgentId] = useState(user.agentCustomId || 'no-agent');
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setLoadingAgents(true);
      listUsers('agent').then(agentList => {
        setAgents(agentList);
        setLoadingAgents(false);
      });
    }
  }, [open]);

  const handleUpdateAgent = async () => {
    setLoading(true);
    const result = await updateUserAgent(user.uid, newAgentId);

    if (result.success) {
      toast({ title: 'Success', description: result.message });
      onAgentChanged();
      setOpen(false);
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" size="sm">Change Agent</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Change Agent for {user.email}</DialogTitle>
                <DialogDescription>
                    Re-assign this user to a different agent or manage them directly as an admin.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="agent-reassign-select">Assign to Agent</Label>
                <Select value={newAgentId} onValueChange={setNewAgentId} disabled={loading || loadingAgents}>
                    <SelectTrigger id="agent-reassign-select">
                        <SelectValue placeholder="Select an agent..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-agent">No Agent (Admin User)</SelectItem>
                        {agents.map(agent => (
                            <SelectItem key={agent.uid} value={agent.customId}>{agent.email} ({agent.customId})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleUpdateAgent} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'customId' | 'email' | 'mobile'>('customId');
  const [agentFilter, setAgentFilter] = useState('all');
  const [agents, setAgents] = useState<UserProfile[]>([]);

  const { toast } = useToast();

  const fetchUsersAndAgents = useCallback(async () => {
    setLoading(true);
    const [userList, agentList] = await Promise.all([
        listUsers('user'),
        listUsers('agent')
    ]);
    setUsers(userList);
    setAgents(agentList);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsersAndAgents();
  }, [fetchUsersAndAgents]);


  const filteredUsers = useMemo(() => {
    return users
      .filter(user => {
        if (agentFilter === 'all') return true;
        if (agentFilter === 'no-agent') return !user.agentId;
        return user.agentId === agentFilter;
      })
      .filter(user => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        
        const fieldValue = user[searchField]?.toLowerCase() || '';
        return fieldValue.includes(term);
    });
  }, [users, searchTerm, searchField, agentFilter]);

  const handleStatusChange = async (uid: string, disabled: boolean) => {
    const result = await updateUserStatus(uid, disabled);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchUsersAndAgents();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (uid: string) => {
    const result = await deleteUser(uid);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchUsersAndAgents();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Manage Users</h1>
            <div className='flex items-center gap-2'>
                 <CreateUserDialog onUserCreated={fetchUsersAndAgents} />
                 <Button variant="outline" size="sm" onClick={fetchUsersAndAgents} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>A list of all registered user accounts.</CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-4">
                <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                    <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                    <Select value={searchField} onValueChange={(value: any) => setSearchField(value)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="By..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="customId">ID</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="mobile">Mobile</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                    <Select value={agentFilter} onValueChange={setAgentFilter}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                             <SelectValue placeholder="Filter by Agent" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Agents</SelectItem>
                            <SelectItem value="no-agent">Admin / No Agent</SelectItem>
                            {agents.map(agent => (
                                <SelectItem key={agent.uid} value={agent.uid}>{agent.name} ({agent.customId})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
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
                  <TableHead>Assigned Agent</TableHead>
                  <TableHead>Total Wallet</TableHead>
                  <TableHead>Wallet Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No users found.</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-mono">{user.customId}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.mobile || 'N/A'}</TableCell>
                      <TableCell>{user.agentCustomId || 'Admin'}</TableCell>
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
                        <ManageWalletDialog user={user} onUpdate={fetchUsersAndAgents} />
                        <SetWalletLimitDialog user={user} onUpdate={fetchUsersAndAgents} />
                        <ChangeAgentDialog user={user} onAgentChanged={fetchUsersAndAgents} />
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
