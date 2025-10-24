import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info, Wand2 } from "lucide-react";
import { validateSchemaRequirements, SchemaValidationError, isAutoFixable } from "@/lib/schemaGenerator";
import { BlogArticle } from "@/types/blog";

interface SchemaValidationAlertProps {
  article: Partial<BlogArticle>;
  author: any;
  reviewer: any;
  onAutoFix?: () => void;
}

export const SchemaValidationAlert = ({ article, author, reviewer, onAutoFix }: SchemaValidationAlertProps) => {
  const validationErrors = validateSchemaRequirements(article as BlogArticle);
  const hasFixableIssues = validationErrors.some(isAutoFixable);
  
  if (validationErrors.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-100">
          Schema Validation Passed ✓
        </AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          All schema requirements are met. Your article is optimized for:
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline" className="bg-white dark:bg-background">
              ✅ Article Schema
            </Badge>
            <Badge variant="outline" className="bg-white dark:bg-background">
              ✅ Speakable Schema
            </Badge>
            <Badge variant="outline" className="bg-white dark:bg-background">
              ✅ Breadcrumb Schema
            </Badge>
            {article.faq_entities && article.faq_entities.length > 0 && (
              <Badge variant="outline" className="bg-white dark:bg-background">
                ✅ FAQ Schema
              </Badge>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const errors = validationErrors.filter(e => e.severity === 'error');
  const warnings = validationErrors.filter(e => e.severity === 'warning');

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Schema Validation Errors ({errors.length})</AlertTitle>
          <AlertDescription>
            <p className="mb-2 font-medium">
              ⚠️ These issues will prevent proper schema generation:
            </p>
            <ul className="space-y-1 text-sm">
              {errors.map((error, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-destructive mt-0.5">•</span>
                  <span>{error.message}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100 flex items-center justify-between">
            <span>Schema Recommendations ({warnings.length})</span>
            {hasFixableIssues && onAutoFix && (
              <Button
                onClick={onAutoFix}
                size="sm"
                variant="outline"
                className="ml-auto"
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Auto-Fix Issues
              </Button>
            )}
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <p className="mb-2 font-medium">
              These improvements will enhance your schema:
            </p>
            <ul className="space-y-1 text-sm">
              {warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>
                    {warning.message}
                    {isAutoFixable(warning) && (
                      <Badge variant="outline" className="ml-2 text-xs">Auto-fixable</Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
