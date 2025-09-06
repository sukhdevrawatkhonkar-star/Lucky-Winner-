import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

// This would come from your database
const commissionData = [
    { period: "May 2024", totalBets: 5000, commissionRate: "5%", earnings: 250.00, status: "Paid" },
    { period: "April 2024", totalBets: 4200, commissionRate: "5%", earnings: 210.00, status: "Paid" },
    { period: "March 2024", totalBets: 3500, commissionRate: "5%", earnings: 175.00, status: "Paid" },
];

export default function CommissionPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Commission</h1>
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Total Bets (USD)</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Earnings (USD)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissionData.map((item) => (
                <TableRow key={item.period}>
                  <TableCell className="font-medium">{item.period}</TableCell>
                  <TableCell className="text-right">{item.totalBets.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.commissionRate}</TableCell>
                  <TableCell className="text-right">{item.earnings.toFixed(2)}</TableCell>
                  <TableCell>{item.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
