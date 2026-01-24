import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ConfidenceIndicatorProps {
  score: number;
  className?: string;
}

export function ConfidenceIndicator({ score, className }: ConfidenceIndicatorProps) {
  const isHighConfidence = score >= 80;
  const isMediumConfidence = score >= 50 && score < 80;
  const isLowConfidence = score < 50;

  const getIcon = () => {
    if (isHighConfidence) {
      return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    if (isMediumConfidence) {
      return <HelpCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
    }
    return <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />;
  };

  const getMessage = () => {
    if (isHighConfidence) {
      return "High confidence match - this book closely matches your search intent";
    }
    if (isMediumConfidence) {
      return "Moderate confidence - this book may be relevant, please verify on the source";
    }
    return "Lower confidence match - verify this matches your needs on the original site";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`flex items-center gap-1.5 ${className || ""}`}
          data-testid="indicator-confidence"
        >
          {getIcon()}
          <span className={`text-xs font-medium ${
            isHighConfidence 
              ? "text-green-600 dark:text-green-400" 
              : isMediumConfidence 
                ? "text-amber-500 dark:text-amber-400"
                : "text-orange-500 dark:text-orange-400"
          }`}>
            {score}% match
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{getMessage()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
