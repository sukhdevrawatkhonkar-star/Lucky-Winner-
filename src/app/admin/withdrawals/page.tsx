
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
import { Button } from "@/components/ui/button";

// This would come from your database
const withdrawalsData = [
    { id: "WDR001", userId: "USER01", amount: 150, method: "Bank Transfer", status: "Pending", date: "2024-05-21" },
    { id: "WDR002", userId: "USER04", amount: 200, method: "PayPal", status: "Completed", date: "2024-05-18" },
    { id: "WDR003", userId: "USER02", amount: 25, method: "Bank Transfer", status: "Failed", date: "2024-05-19" },
];

export default function WithdrawalsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Withdrawals</h1>
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount (USD)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalsData.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell className="font-medium">{withdrawal.id}</TableCell>
                  <TableCell>{withdrawal.userId}</TableCell>
                  <TableCell>{withdrawal.date}</TableCell>
                  <TableCell>{withdrawal.method}</TableCell>
                  <TableCell className="text-right">{withdrawal.amount.toFixed(2)}</TableCell>
                  <TableCell>
                     <Badge variant={
                        withdrawal.status === 'Completed' ? 'default' : 
                        withdrawal.status === 'Pending' ? 'secondary' : 
                        'destructive'
                     }>
                      {withdrawal.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {withdrawal.status === 'Pending' && (
                        <>
                            <Button variant="outline" size="sm">Approve</Button>
                            <Button variant="destructive" size="sm">Reject</Button>
                        </>
                    )}
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
