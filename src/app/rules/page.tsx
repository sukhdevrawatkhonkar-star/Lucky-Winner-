
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const rules = [
    {
        title: "1. General Gameplay",
        content: "All bets must be placed before the draw begins. The official result announced on the platform is final and binding."
    },
    {
        title: "2. Account Responsibility",
        content: "You are responsible for all activity on your account. Keep your password secure. Users must be 18 years or older to play."
    },
    {
        title: "3. Deposits & Withdrawals",
        content: "Deposits and withdrawals are handled by your assigned agent. The platform is not responsible for financial transactions between users and agents."
    },
    {
        title: "4. Prohibited Activities",
        content: "Any form of cheating, collusion, or fraudulent activity will result in immediate account suspension and forfeiture of all funds."
    },
     {
        title: "5. Payouts",
        content: "Winnings are calculated based on the odds at the time the bet was placed. Payouts for winning bets are credited to your account balance after the event concludes."
    },
    {
        title: "6. Disputes",
        content: "Any disputes regarding a bet or its outcome must be raised with your agent within 24 hours of the event."
    },
];

export default function RulesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rules and Regulations</CardTitle>
        <CardDescription>Please read the rules carefully before playing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {rules.map((rule, index) => (
          <div key={index}>
            <h3 className="font-semibold text-lg">{rule.title}</h3>
            <p className="text-muted-foreground pl-4 border-l-2 border-primary mt-1">
              {rule.content}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
