import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Language = 'en' | 'es' | 'de' | 'nl' | 'fr' | 'pl' | 'sv' | 'da' | 'hu';

type StepStatus = 'pending' | 'running' | 'complete';

interface GenerationStep {
  id: string;
  name: string;
  message: string;
  status: StepStatus;
}

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
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<GenerationStep[]>([]);

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
    setProgress(0);
    
    // Initialize steps
    const initialSteps: GenerationStep[] = [
      { id: 'structure', name: 'Generating article structure', message: '3 TOFU, 2 MOFU, 1 BOFU', status: 'pending' },
      { id: 'tofu1', name: 'Creating TOFU Article 1', message: 'Generating content...', status: 'pending' },
      { id: 'tofu2', name: 'Creating TOFU Article 2', message: 'Generating content...', status: 'pending' },
      { id: 'tofu3', name: 'Creating TOFU Article 3', message: 'Generating content...', status: 'pending' },
      { id: 'mofu1', name: 'Creating MOFU Article 1', message: 'Generating content...', status: 'pending' },
      { id: 'mofu2', name: 'Creating MOFU Article 2', message: 'Generating content...', status: 'pending' },
      { id: 'bofu', name: 'Creating BOFU Article', message: 'Generating content...', status: 'pending' },
      { id: 'images', name: 'Generating images', message: 'Creating visuals for all articles', status: 'pending' },
      { id: 'internal', name: 'Finding internal links', message: 'Connecting articles across cluster', status: 'pending' },
      { id: 'external', name: 'Finding external sources', message: 'Researching authoritative citations', status: 'pending' },
      { id: 'linking', name: 'Linking funnel progression', message: 'Creating conversion pathways', status: 'pending' },
    ];
    
    setSteps(initialSteps);
    
    try {
      // Simulate step-by-step generation
      for (let i = 0; i < initialSteps.length; i++) {
        // Update current step to running
        setSteps(prev => prev.map((step, idx) => 
          idx === i ? { ...step, status: 'running' } : step
        ));
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
        
        // Update current step to complete
        setSteps(prev => prev.map((step, idx) => 
          idx === i ? { ...step, status: 'complete' } : step
        ));
        
        // Update progress
        setProgress(((i + 1) / initialSteps.length) * 100);
      }
      
      toast.success("Cluster generation complete! (Demo mode)");
      
      console.log("Generated cluster with:", {
        topic,
        language,
        targetAudience,
        primaryKeyword,
      });
    } catch (error) {
      console.error("Error generating cluster:", error);
      toast.error("Failed to generate cluster");
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
      }, 2000);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 max-w-4xl space-y-6">
        {!isGenerating ? (
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
                Generate Complete Cluster (6 Articles)
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Loader2 className="h-6 w-6 animate-spin" />
                Generating Your Content Cluster...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Overall Progress</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              {/* Step-by-Step Status */}
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      step.status === 'complete' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : step.status === 'running'
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {step.status === 'complete' ? (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : step.status === 'running' ? (
                        <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{step.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {progress === 100 && (
                <div className="text-center pt-4">
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    ✅ Cluster generation complete!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClusterGenerator;
