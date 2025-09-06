
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

// This would come from your database
const depositsData = [
    { id: "DEP001", userId: "USER01", amount: 100, method: "Credit Card", status: "Completed", date: "2024-05-20" },
    { id: "DEP002", userId: "USER02", amount: 50, method: "PayPal", status: "Completed", date: "2024-05-19" },
    { id: "DEP003", userId: "USER03", amount: 200, method: "Bank Transfer", status: "Pending", date: "2024-05-21" },
];

export default function DepositsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Deposits</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent Deposits</CardTitle>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {depositsData.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell className="font-medium">{deposit.id}</TableCell>
                  <TableCell>{deposit.userId}</TableCell>
                  <TableCell>{deposit.date}</TableCell>
                  <TableCell>{deposit.method}</TableCell>
                  <TableCell className="text-right">{deposit.amount.toFixed(2)}</TableCell>
                  <TableCell>
                     <Badge variant={deposit.status === 'Completed' ? 'default' : 'secondary'}>
                      {deposit.status}
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
