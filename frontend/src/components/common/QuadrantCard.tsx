
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { QuadrantData } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface QuadrantCardProps {
  quadrant: QuadrantData;
  batchAvg: number;
  batchBest: number;
  className?: string;
  gradientClass?: string;
}

const QuadrantCard: React.FC<QuadrantCardProps> = ({
  quadrant,
  batchAvg,
  batchBest,
  className,
  gradientClass = "card-gradient-primary",
}) => {
  const navigate = useNavigate();
  const percentage = Math.round((quadrant.obtained / quadrant.maxScore) * 100);

  const handleClick = () => {
    navigate(`/student/quadrant/${quadrant.id}`);
  };

  return (
    <Card 
      className={cn("cursor-pointer hover:shadow-lg transition-all", className)} 
      onClick={handleClick}
    >
      <div className={cn("p-4 rounded-t-lg", gradientClass)}>
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">{quadrant.name}</h3>
          <StatusBadge status={quadrant.status} />
        </div>
        <p className="text-sm opacity-80">Weightage: {quadrant.weightage}%</p>
      </div>
      <CardContent className="pt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Your Score</span>
          <span className="text-xl font-bold">{quadrant.obtained.toFixed(1)}/{quadrant.maxScore}</span>
        </div>
        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-center text-sm text-muted-foreground mt-1">
          {percentage}%
        </div>
        
        {/* Show sub-category count if available */}
        {quadrant.sub_categories && quadrant.sub_categories.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground border-t pt-2">
            <p className="mb-1">{quadrant.sub_categories.length} Sub-categories:</p>
            <div className="space-y-1">
              {quadrant.sub_categories.map((subCat) => (
                <div key={subCat.id} className="flex justify-between">
                  <span className="truncate">{subCat.name}</span>
                  <span className="font-medium">
                    {subCat.obtained.toFixed(1)}/{subCat.maxScore.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="text-sm">
            <p className="text-muted-foreground">Batch Avg</p>
            <p className="font-medium">{batchAvg.toFixed(1)}/{quadrant.maxScore}</p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">Batch Best</p>
            <p className="font-medium">{batchBest.toFixed(1)}/{quadrant.maxScore}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuadrantCard;
