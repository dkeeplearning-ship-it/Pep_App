
import React from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  maxScore: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  maxScore,
  size = "md",
  showText = true,
  className,
}) => {
  const percentage = (score / maxScore) * 100;
  const circumference = 2 * Math.PI * 45; // r = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 80) return "stroke-green-500";
    if (percentage >= 60) return "stroke-blue-500";
    if (percentage >= 40) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  // Determine dimensions based on size
  const getDimensions = () => {
    switch (size) {
      case "sm":
        return { width: 80, height: 80, textSize: "text-sm", scoreSize: "text-xl" };
      case "lg":
        return { width: 160, height: 160, textSize: "text-lg", scoreSize: "text-4xl" };
      default: // md
        return { width: 120, height: 120, textSize: "text-base", scoreSize: "text-2xl" };
    }
  };

  const { width, height, textSize, scoreSize } = getDimensions();

  return (
    <div className={cn("relative", className)} style={{ width, height }}>
      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={getColor()}
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-bold", scoreSize)}>
            {score}
            <span className={cn("text-muted-foreground font-normal", textSize)}>/{maxScore}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default ScoreRing;
