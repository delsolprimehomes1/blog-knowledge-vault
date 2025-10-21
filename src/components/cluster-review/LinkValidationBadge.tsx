import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { LinkValidationResult } from "@/lib/linkValidation";

interface LinkValidationBadgeProps {
  validation: LinkValidationResult | null;
  compact?: boolean;
}

export const LinkValidationBadge = ({ validation, compact = false }: LinkValidationBadgeProps) => {
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
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        <CheckCircle2 className="h-3 w-3" />
        {!compact && "Valid"}
      </Badge>
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
