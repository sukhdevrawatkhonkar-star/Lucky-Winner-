
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { listUsers, updateUserStatus, deleteUser } from '@/app/actions';
import { UserProfile } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, RefreshCw, Search } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ManageWalletDialog, SetWalletLimitDialog } from '@/components/shared/UserActionsDialogs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CreateUserForm } from '@/components/shared/CreateUserForm';


export default function AgentsPage() {
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'customId' | 'email' | 'mobile'>('customId');
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const { toast } = useToast();

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const agentList = await listUsers('agent');
    setAgents(agentList);
    setFilteredAgents(agentList);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const results = agents.filter(agent => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;

        const fieldValue = agent[searchField]?.toLowerCase() || '';
        return fieldValue.includes(term);
    });
    setFilteredAgents(results);
  }, [searchTerm, searchField, agents]);

  const handleStatusChange = async (uid: string, disabled: boolean) => {
    const result = await updateUserStatus(uid, disabled);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchAgents();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (uid: string) => {
    const result = await deleteUser(uid);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchAgents();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Manage Agents</h1>
            <Button variant="outline" size="sm" onClick={fetchAgents} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
        </div>
        <Dialog open={isCreateAgentOpen} onOpenChange={setIsCreateAgentOpen}>
            <DialogTrigger asChild>
                 <Button>Create Agent</Button>
            </DialogTrigger>
            <DialogContent>
                 <CreateUserForm 
                    role="agent" 
                    onAccountCreated={fetchAgents}
                    title="Create New Agent"
                    description="Enter the details for the new agent account. A unique 6-digit Agent ID will be generated."
                    onClose={() => setIsCreateAgentOpen(false)}
                 />
            </DialogContent>
        </Dialog>

      
      <Card>
        <CardHeader>
          <CardTitle>Agent List</CardTitle>
          <CardDescription>A list of all registered agent accounts.</CardDescription>
           <div className="flex items-center gap-2 pt-4">
                <Input
                    placeholder="Search agents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={searchField} onValueChange={(value: any) => setSearchField(value)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Search by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="customId">Agent ID</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                </Select>
                 <Button variant="outline"><Search className="h-4 w-4" /></Button>
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading agents...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Total Wallet</TableHead>
                  <TableHead>Wallet Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No agents found.</TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => (
                    <TableRow key={agent.uid}>
                      <TableCell className="font-mono">{agent.customId}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell>{agent.mobile || 'N/A'}</TableCell>
                      <TableCell className='flex items-center font-bold'>
                         <IndianRupee className="h-4 w-4 mr-1"/> {agent.walletBalance?.toFixed(2) || '0.00'}
                      </TableCell>
                       <TableCell>
                         {agent.walletLimit ? `₹${agent.walletLimit.toFixed(2)}` : 'No Limit'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={agent.disabled ? 'destructive' : 'default'}>
                          {agent.disabled ? 'Inactive' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(agent.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                         <ManageWalletDialog user={agent} onUpdate={fetchAgents} />
                         <SetWalletLimitDialog user={agent} onUpdate={fetchAgents} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(agent.uid, !agent.disabled)}
                        >
                          {agent.disabled ? 'Activate' : 'Deactivate'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the agent account.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(agent.uid)}>Continue</AlertDialogAction>
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
