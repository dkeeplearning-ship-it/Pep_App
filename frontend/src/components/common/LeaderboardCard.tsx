
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";

interface Leader {
  id: string;
  name: string;
  score: number;
}

interface LeaderboardCardProps {
  leaders: Leader[];
  userRank: number;
  maxScore: number;
  className?: string;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  leaders,
  userRank,
  maxScore,
  className,
}) => {
  const renderRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center font-bold">{index + 1}</span>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {leaders.map((leader, index) => (
            <div 
              key={leader.id} 
              className={`flex items-center justify-between p-2 rounded-lg ${
                leaders[0].id === leader.id 
                  ? "bg-yellow-50 dark:bg-yellow-900/20"
                  : "bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                {renderRankIcon(index)}
                <span className="font-medium">{leader.name}</span>
              </div>
              <span className="font-bold">{leader.score}/{maxScore}</span>
            </div>
          ))}

          {userRank > 3 && (
            <>
              <div className="flex justify-center my-1">
                <div className="h-0.5 w-10 bg-muted-foreground/30 rounded-full" />
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 flex items-center justify-center font-bold">{userRank}</span>
                  <span className="font-medium">You</span>
                </div>
                <span className="font-bold">
                  {leaders.find(l => l.id === "2024-Ajith")?.score || "-"}/{maxScore}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderboardCard;
