import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Code, Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { BlogArticle, Author } from "@/types/blog";
import { generateAllSchemas, GeneratedSchemas } from "@/lib/schemaGenerator";

interface SchemaPreviewSectionProps {
  article: Partial<BlogArticle>;
  author: Author | null;
  reviewer: Author | null;
}

export const SchemaPreviewSection = ({
  article,
  author,
  reviewer,
}: SchemaPreviewSectionProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<GeneratedSchemas | null>(null);

  useEffect(() => {
    if (article.slug) {
      const generated = generateAllSchemas(
        article as BlogArticle,
        author,
        reviewer
      );
      setSchemas(generated);
    }
  }, [article, author, reviewer]);

  const copySchema = (schemaName: string, schemaContent: any) => {
    navigator.clipboard.writeText(JSON.stringify(schemaContent, null, 2));
    setCopied(schemaName);
    toast.success(`${schemaName} schema copied`);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!schemas) return null;

  const hasErrors = schemas.errors.length > 0;
  const schemaCount = 5; // article + speakable + breadcrumb + organization + localBusiness

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>JSON-LD Schema Preview</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-generated structured data for SEO
            </p>
          </div>
          {hasErrors && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">{schemas.errors.length} validation warning(s)</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasErrors && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Schema Validation Warnings:
            </p>
            <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
              {schemas.errors.map((error, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>{error.field}:</strong> {error.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Generated Schemas</p>
              <p className="text-sm text-muted-foreground">
                {schemaCount} schema types ready for injection
              </p>
            </div>
          </div>
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full">
              <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${open ? 'rotate-180' : ''}`} />
              {open ? "Hide" : "Show"} Schema Details
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Tabs defaultValue="article" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="article">Article</TabsTrigger>
                <TabsTrigger value="speakable">Speakable</TabsTrigger>
                <TabsTrigger value="breadcrumb">Breadcrumb</TabsTrigger>
                <TabsTrigger value="organization">Organization</TabsTrigger>
              </TabsList>

              <TabsContent value="article" className="mt-4">
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-96">
                    {JSON.stringify(schemas.article, null, 2)}
                  </pre>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copySchema("Article", schemas.article)}
                    className="absolute top-2 right-2"
                  >
                    {copied === "Article" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="speakable" className="mt-4">
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-96">
                    {JSON.stringify(schemas.speakable, null, 2)}
                  </pre>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copySchema("Speakable", schemas.speakable)}
                    className="absolute top-2 right-2"
                  >
                    {copied === "Speakable" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="breadcrumb" className="mt-4">
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-96">
                    {JSON.stringify(schemas.breadcrumb, null, 2)}
                  </pre>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copySchema("Breadcrumb", schemas.breadcrumb)}
                    className="absolute top-2 right-2"
                  >
                    {copied === "Breadcrumb" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="organization" className="mt-4">
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-96">
                    {JSON.stringify(schemas.organization, null, 2)}
                  </pre>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copySchema("Organization", schemas.organization)}
                    className="absolute top-2 right-2"
                  >
                    {copied === "Organization" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CollapsibleContent>
        </Collapsible>

        <p className="text-xs text-muted-foreground">
          These schemas will be automatically injected into the article page when published.
        </p>
      </CardContent>
    </Card>
  );
};
