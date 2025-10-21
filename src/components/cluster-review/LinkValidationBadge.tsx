import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle, Activity } from "lucide-react";
import { LinkValidationResult } from "@/lib/linkValidation";

interface LinkValidationBadgeProps {
  validation: LinkValidationResult | null;
  compact?: boolean;
  healthScore?: number;
  lastChecked?: string;
}

export const LinkValidationBadge = ({ validation, compact = false, healthScore, lastChecked }: LinkValidationBadgeProps) => {
  if (!validation) {
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        {!compact && "Not validated"}
      </Badge>
    );
  }

  if (validation.isValid) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3" />
          {!compact && "Valid"}
        </Badge>
        {healthScore !== undefined && (
          <Badge 
            variant={healthScore >= 0.8 ? "default" : healthScore >= 0.5 ? "secondary" : "destructive"}
            className="gap-1"
          >
            <Activity className="h-3 w-3" />
            {Math.round(healthScore * 100)}% healthy
          </Badge>
        )}
      </div>
    );
  }

  const criticalErrors = validation.missingInternalLinks || validation.missingExternalCitations;

  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      {compact ? validation.errors.length : `${validation.errors.length} issue${validation.errors.length !== 1 ? 's' : ''}`}
    </Badge>
  );
};
