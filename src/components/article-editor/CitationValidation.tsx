import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { validateCitations, getCitationBadgeVariant, getCitationStatusLabel } from "@/lib/citationValidation";

interface CitationValidationProps {
  content: string;
  externalCitations: any[];
  language: string;
}

export const CitationValidation = ({
  content,
  externalCitations,
  language
}: CitationValidationProps) => {
  const validation = validateCitations(content, externalCitations, language);

  if (validation.isValid && validation.issues.length === 0) {
    return null;
  }

  const getIssueIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  const getIssueVariant = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'default' as const;
      case 'info':
        return 'default' as const;
    }
  };

  return (
    <Card className={validation.isValid ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/30"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              Citation Quality
            </CardTitle>
            <CardDescription className="mt-1">
              Score: {validation.score}/100 - {getCitationStatusLabel(validation)}
            </CardDescription>
          </div>
          <Badge variant={getCitationBadgeVariant(validation.score)} className="text-lg px-3 py-1">
            {validation.score}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Total Citations:</span>
            <span className="ml-2 font-semibold">{validation.totalCitations}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Official Sources:</span>
            <span className="ml-2 font-semibold">{validation.officialSourceCount}</span>
          </div>
        </div>

        {/* Issues */}
        {validation.issues.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Issues to Fix:</div>
            {validation.issues.map((issue, index) => (
              <Alert key={index} variant={getIssueVariant(issue.type)}>
                <div className="flex items-start gap-2">
                  {getIssueIcon(issue.type)}
                  <AlertDescription className="text-sm">
                    {issue.message}
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {!validation.isValid && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              <strong>Tips:</strong>
              {validation.hasUnreplacedMarkers && " Use the 'Find Sources with AI' button above to fix citation markers."}
              {validation.totalCitations < 3 && " Add more authoritative sources to improve quality."}
              {validation.officialSourceCount === 0 && " Include official government or institutional sources (.gov, .edu, etc.)"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
