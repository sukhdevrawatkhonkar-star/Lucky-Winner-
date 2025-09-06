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

// This would come from your database, filtered for the current agent
const agentUsersData = [
    { id: "USER01", name: "Alice", email: "user1@example.com", totalBet: 1500.00, status: "Active" },
    { id: "USER02", name: "Bob", email: "user2@example.com", totalBet: 850.50, status: "Active" },
    { id: "USER05", name: "Eve", email: "user5@example.com", totalBet: 200.00, status: "Inactive" },
];

export default function AgentUsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Users</h1>
      <Card>
        <CardHeader>
          <CardTitle>Referred Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total Bet Amount (USD)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentUsersData.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-right">{user.totalBet.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                      {user.status}
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
