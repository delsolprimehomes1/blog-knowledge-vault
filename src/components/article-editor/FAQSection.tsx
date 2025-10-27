import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, Plus, Trash2, ChevronUp, ChevronDown, Code, Sparkles } from "lucide-react";
import { FAQEntity } from "@/types/blog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FAQSectionProps {
  faqEntities: FAQEntity[];
  onFaqEntitiesChange: (entities: FAQEntity[]) => void;
  headline: string;
  detailedContent: string;
  metaDescription: string;
  language: string;
}

export const FAQSection = ({
  faqEntities,
  onFaqEntitiesChange,
  headline,
  detailedContent,
  metaDescription,
  language,
}: FAQSectionProps) => {
  const [isEnabled, setIsEnabled] = useState(faqEntities.length > 0);
  const [showSchema, setShowSchema] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      onFaqEntitiesChange([]);
    } else if (faqEntities.length === 0) {
      onFaqEntitiesChange([{ question: "", answer: "" }]);
    }
  };

  const addQuestion = () => {
    if (faqEntities.length < 1) {
      onFaqEntitiesChange([{ question: "", answer: "" }]);
    }
  };

  const updateQuestion = (index: number, field: keyof FAQEntity, value: string) => {
    const updated = [...faqEntities];
    updated[index] = { ...updated[index], [field]: value };
    onFaqEntitiesChange(updated);
  };

  const removeQuestion = (index: number) => {
    onFaqEntitiesChange(faqEntities.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= faqEntities.length) return;

    const updated = [...faqEntities];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onFaqEntitiesChange(updated);
  };

  const handleAutoGenerate = async () => {
    if (!headline || !detailedContent) {
      toast({
        title: "Missing Content",
        description: "Please add a headline and content before generating FAQs",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-article-faqs', {
        body: {
          articles: [{
            headline,
            detailed_content: detailedContent,
            meta_description: metaDescription,
            language,
          }]
        }
      });

      if (error) throw error;

      if (data?.results?.[0]?.faq_entities) {
        onFaqEntitiesChange(data.results[0].faq_entities);
        setIsEnabled(true);
        toast({
          title: "FAQs Generated",
          description: `Successfully generated ${data.results[0].faq_entities.length} Q&A pairs`,
        });
      } else {
        throw new Error("No FAQs generated");
      }
    } catch (error) {
      console.error("Error generating FAQs:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate FAQs",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqEntities
        .filter(faq => faq.question && faq.answer)
        .map(faq => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>FAQ Section (Recommended)</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add 1 FAQ that directly answers the question in your article title - optimized for AI and voice assistants
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoGenerate}
              disabled={isGenerating || !headline || !detailedContent}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? "Generating..." : "Auto-generate FAQs"}
            </Button>
            <div className="flex items-center gap-2">
              <Label htmlFor="faq-toggle">Enable FAQ Schema</Label>
              <Switch
                id="faq-toggle"
                checked={isEnabled}
                onCheckedChange={handleToggle}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      {isEnabled && (
        <CardContent className="space-y-4">
          {faqEntities.map((faq, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Question {index + 1}</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveQuestion(index, "up")}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveQuestion(index, "down")}
                    disabled={index === faqEntities.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Question *</Label>
                <Input
                  value={faq.question}
                  onChange={(e) => updateQuestion(index, "question", e.target.value)}
                  placeholder="What is the property buying process in Costa del Sol?"
                />
              </div>

              <div>
                <Label>Answer * (150-250 words, optimized for AI/voice assistants)</Label>
                <Textarea
                  value={faq.answer}
                  onChange={(e) => updateQuestion(index, "answer", e.target.value)}
                  placeholder="Provide a comprehensive answer that directly addresses the question in your article title..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {faq.answer.split(/\s+/).filter(w => w).length} words
                  {faq.answer.split(/\s+/).filter(w => w).length < 150 && " (aim for 150-250 words)"}
                </p>
              </div>
            </div>
          ))}

          {faqEntities.length === 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          )}

          {faqEntities.length > 0 && (
            <Collapsible open={showSchema} onOpenChange={setShowSchema}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full">
                  <Code className="h-4 w-4 mr-2" />
                  {showSchema ? "Hide" : "Preview"} FAQPage Schema
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(generateSchema(), null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}

          <p className="text-sm text-muted-foreground">
            {faqEntities.length === 1 ? "1 FAQ added (matches article title)" : "Add 1 FAQ that answers your article title"}
          </p>
        </CardContent>
      )}
    </Card>
  );
};
