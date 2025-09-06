import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// This would come from your database, filtered for the current agent's users
const agentBetsData = [
  { id: "BET001", userId: "USER01", gameId: "GAME101", number: 42, amount: 10, status: "won" },
  { id: "BET002", userId: "USER02", gameId: "GAME101", number: 7, amount: 5, status: "lost" },
  { id: "BET003", userId: "USER01", gameId: "GAME102", number: 19, amount: 20, status: "placed" },
];

export default function AgentBetsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">User Bets</h1>
       <Card>
        <CardHeader>
          <CardTitle>Bets from My Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bet ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Game ID</TableHead>
                <TableHead className="text-right">Amount (USD)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentBetsData.map((bet) => (
                <TableRow key={bet.id}>
                  <TableCell className="font-medium">{bet.id}</TableCell>
                  <TableCell>{bet.userId}</TableCell>
                  <TableCell>{bet.gameId}</TableCell>
                  <TableCell className="text-right">{bet.amount.toFixed(2)}</TableCell>
                  <TableCell>
                     <Badge variant={bet.status === 'won' ? 'default' : bet.status === 'lost' ? 'destructive' : 'outline'}>
                      {bet.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
