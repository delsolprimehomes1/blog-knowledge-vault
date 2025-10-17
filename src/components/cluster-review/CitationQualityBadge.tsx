import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { validateCitations, getCitationBadgeVariant, getCitationStatusLabel } from "@/lib/citationValidation";

interface CitationQualityBadgeProps {
  content: string;
  externalCitations: any[];
  language: string;
}

export const CitationQualityBadge = ({
  content,
  externalCitations,
  language
}: CitationQualityBadgeProps) => {
  const validation = validateCitations(content, externalCitations, language);
  
  const getIcon = () => {
    if (validation.hasUnreplacedMarkers) {
      return <AlertCircle className="h-3 w-3" />;
    }
    if (validation.score >= 90) {
      return <CheckCircle2 className="h-3 w-3" />;
    }
    if (validation.score >= 70) {
      return <CheckCircle2 className="h-3 w-3" />;
    }
    if (validation.score >= 50) {
      return <AlertTriangle className="h-3 w-3" />;
    }
    return <AlertCircle className="h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getCitationBadgeVariant(validation.score)}
            className="gap-1 cursor-help"
          >
            {getIcon()}
            {getCitationStatusLabel(validation)} ({validation.score})
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold">Citation Quality: {validation.score}/100</div>
            <div className="text-xs space-y-1">
              <div>✓ Total Citations: {validation.totalCitations}</div>
              <div>✓ Official Sources: {validation.officialSourceCount}</div>
              {validation.hasUnreplacedMarkers && (
                <div className="text-red-400">⚠ Contains [CITATION_NEEDED] markers</div>
              )}
            </div>
            
            {validation.issues.length > 0 && (
              <div className="space-y-1 pt-2 border-t">
                <div className="text-xs font-semibold">Issues:</div>
                {validation.issues.slice(0, 3).map((issue, index) => (
                  <div key={index} className="text-xs flex items-start gap-1">
                    {issue.type === 'error' && <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />}
                    {issue.type === 'warning' && <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />}
                    {issue.type === 'info' && <Info className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />}
                    <span>{issue.message}</span>
                  </div>
                ))}
                {validation.issues.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    ...and {validation.issues.length - 3} more issue{validation.issues.length - 3 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
