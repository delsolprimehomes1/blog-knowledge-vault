import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

type Language = 'en' | 'es' | 'de' | 'nl' | 'fr' | 'pl' | 'sv' | 'da' | 'hu';

const languageOptions = [
  { value: 'en', label: '🇬🇧 English', name: 'English' },
  { value: 'es', label: '🇪🇸 Spanish', name: 'Spanish' },
  { value: 'de', label: '🇩🇪 German', name: 'German' },
  { value: 'nl', label: '🇳🇱 Dutch', name: 'Dutch' },
  { value: 'fr', label: '🇫🇷 French', name: 'French' },
  { value: 'pl', label: '🇵🇱 Polish', name: 'Polish' },
  { value: 'sv', label: '🇸🇪 Swedish', name: 'Swedish' },
  { value: 'da', label: '🇩🇰 Danish', name: 'Danish' },
  { value: 'hu', label: '🇭🇺 Hungarian', name: 'Hungarian' },
];

const ClusterGenerator = () => {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [targetAudience, setTargetAudience] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    // Validation
    if (!topic.trim()) {
      toast.error("Please enter a cluster topic");
      return;
    }
    if (!targetAudience.trim()) {
      toast.error("Please enter a target audience");
      return;
    }
    if (!primaryKeyword.trim()) {
      toast.error("Please enter a primary keyword");
      return;
    }

    setIsGenerating(true);
    
    try {
      // TODO: Implement cluster generation logic
      toast.success("Cluster generation started! This feature is coming soon.");
      
      console.log("Generating cluster with:", {
        topic,
        language,
        targetAudience,
        primaryKeyword,
      });
    } catch (error) {
      console.error("Error generating cluster:", error);
      toast.error("Failed to generate cluster");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Sparkles className="h-8 w-8" />
              AI Content Cluster Generator
            </CardTitle>
            <CardDescription className="text-lg">
              Generate 6 interconnected articles with one click
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-base">
                Cluster Topic <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topic"
                type="text"
                placeholder="e.g., Buying property in Costa del Sol"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-base">
                Language <span className="text-destructive">*</span>
              </Label>
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger id="language" className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience" className="text-base">
                Target Audience <span className="text-destructive">*</span>
              </Label>
              <Input
                id="targetAudience"
                type="text"
                placeholder="e.g., International buyers, retirees, investors"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryKeyword" className="text-base">
                Primary Keyword <span className="text-destructive">*</span>
              </Label>
              <Input
                id="primaryKeyword"
                type="text"
                placeholder="e.g., Costa del Sol real estate"
                value={primaryKeyword}
                onChange={(e) => setPrimaryKeyword(e.target.value)}
                className="text-base"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="lg"
              className="w-full text-base"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {isGenerating ? "Generating..." : "Generate Complete Cluster (6 Articles)"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ClusterGenerator;
