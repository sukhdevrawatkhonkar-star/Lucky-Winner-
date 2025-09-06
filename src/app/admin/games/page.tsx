
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createLotteryGame, deleteLotteryGame, listLotteryGames, updateLotteryGameTimes } from '@/app/actions';
import { Lottery } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, RefreshCw, Trash2, Loader2, Gamepad2, Edit } from 'lucide-react';
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
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';

function CreateGameCard({ onGameCreated }: { onGameCreated: () => void }) {
  const [name, setName] = useState('');
  const [openTime, setOpenTime] = useState<string | undefined>();
  const [closeTime, setCloseTime] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name.trim()) {
        toast({ title: 'Error', description: 'Game name cannot be empty.', variant: 'destructive' });
        setLoading(false);
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
            setLoading(false);
            return;
        }
        const token = await user.getIdToken();

        const result = await createLotteryGame(token, {
          name: name.trim(),
          openTime: openTime || null,
          closeTime: closeTime || null,
        });

        if (result.success) {
          toast({ title: 'Success', description: result.message });
          setName('');
          setOpenTime(undefined);
          setCloseTime(undefined);
          onGameCreated();
        } else {
          toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Add New Game</CardTitle>
        <CardDescription>Enter the name for the new game. You can optionally set open/close times.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateGame} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Game Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Starline Milan"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="open-time">Open Time (Optional)</Label>
                <TimePicker value={openTime} onChange={setOpenTime} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="close-time">Close Time (Optional)</Label>
                <TimePicker value={closeTime} onChange={setCloseTime} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">If no time is set, the game will be considered open 24/7.</p>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Adding Game...' : 'Add Game'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function EditTimingsDialog({ game, onGameUpdated }: { game: Lottery, onGameUpdated: (updatedGame: Lottery) => void }) {
    const [open, setOpen] = useState(false);
    const [openTime, setOpenTime] = useState<string | undefined>(game.openTime || undefined);
    const [closeTime, setCloseTime] = useState<string | undefined>(game.closeTime || undefined);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Reset state when dialog opens with a new game
    useEffect(() => {
        if (open) {
            setOpenTime(game.openTime || undefined);
            setCloseTime(game.closeTime || undefined);
        }
    }, [open, game]);

    const handleUpdate = async () => {
        setLoading(true);
         try {
            const user = auth.currentUser;
            if (!user || !game.id) {
                toast({ title: 'Error', description: 'Authentication failed or game ID is missing.', variant: 'destructive' });
                setLoading(false);
                return;
            }
            const token = await user.getIdToken();
            const result = await updateLotteryGameTimes(token, game.id, openTime || null, closeTime || null);

            if (result.success && result.updatedGame) {
                toast({ title: 'Success', description: result.message });
                onGameUpdated(result.updatedGame);
                setOpen(false);
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
             toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Timings for {game.name}</DialogTitle>
                    <DialogDescription>
                        Update the open and close times for this game.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="open-time-edit">Open Time</Label>
                        <TimePicker value={openTime} onChange={setOpenTime} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="close-time-edit">Close Time</Label>
                        <TimePicker value={closeTime} onChange={setCloseTime} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleUpdate} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function GamesPage() {
  const [games, setGames] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
        const gameList = await listLotteryGames();
        setGames(gameList);
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "Could not fetch games.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleGameUpdated = (updatedGame: Lottery) => {
      setGames(prevGames => 
          prevGames.map(g => g.id === updatedGame.id ? updatedGame : g)
      );
  }

  const handleDelete = async (gameId: string, gameName: string) => {
    try {
        const user = auth.currentUser;
        if (!user) {
            toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
            return;
        }
        const token = await user.getIdToken();
        const result = await deleteLotteryGame(token, gameId);
        if (result.success) {
          toast({ title: 'Success', description: `Game "${gameName}" deleted successfully.` });
          fetchGames();
        } else {
          toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-2"><Gamepad2 /> Manage Games</h1>
            <Button variant="outline" size="sm" onClick={fetchGames} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
        </div>
       <div className="grid md:grid-cols-2 gap-6 items-start">
          <CreateGameCard onGameCreated={fetchGames} />
          <Card>
            <CardHeader>
              <CardTitle>Game List</CardTitle>
              <CardDescription>List of all available games. These are shown to users on the homepage.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Game Name</TableHead>
                      <TableHead>Timings</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No games found.</TableCell>
                      </TableRow>
                    ) : (
                      games.map((game) => (
                        <TableRow key={game.id}>
                          <TableCell className="font-medium">{game.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {game.openTime && game.closeTime ? `${game.openTime} - ${game.closeTime}` : '24 Hours'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                             <EditTimingsDialog game={game} onGameUpdated={handleGameUpdated} />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{game.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the game and it will no longer be available for betting.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(game.id!, game.name)}>Continue</AlertDialogAction>
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
    </div>
  );
}
