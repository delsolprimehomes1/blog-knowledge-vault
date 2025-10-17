import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, FileText, Variable } from 'lucide-react';

export const MasterPromptEditor = () => {
  const [prompt, setPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  
  useEffect(() => {
    loadPrompt();
  }, []);
  
  const loadPrompt = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('content_settings')
      .select('setting_value, updated_at')
      .eq('setting_key', 'master_content_prompt')
      .single();
    
    if (error) {
      console.error('Error loading master prompt:', error);
      toast.error('Failed to load master prompt');
    } else if (data) {
      setPrompt(data.setting_value);
      setLastUpdated(data.updated_at);
    }
    setIsLoading(false);
  };
  
  const handleSave = async () => {
    if (prompt.trim().length < 100) {
      toast.error('Master prompt is too short');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('content_settings')
      .update({ 
        setting_value: prompt,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('setting_key', 'master_content_prompt');
    
    if (error) {
      console.error('Error saving master prompt:', error);
      toast.error('Failed to save master prompt');
    } else {
      toast.success('Master prompt saved successfully');
      await loadPrompt();
    }
    setIsSaving(false);
  };
  
  const wordCount = prompt.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = prompt.length;
  const variableCount = (prompt.match(/\{\{[^}]+\}\}/g) || []).length;
  
  const availableVariables = [
    'headline', 
    'targetKeyword', 
    'searchIntent', 
    'contentAngle', 
    'funnelStage', 
    'targetAudience', 
    'language'
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Master Content Prompt
        </CardTitle>
        <CardDescription>
          Define the voice, tone, structure, and quality standards for AI-generated content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Badge variant="outline">{wordCount} words</Badge>
            <Badge variant="outline">{charCount} chars</Badge>
            <Badge variant="outline">{variableCount} variables</Badge>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={30}
          className="font-mono text-sm"
          placeholder="Paste your master prompt here..."
        />
        
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={loadPrompt} disabled={isSaving}>
            Reset to Saved
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
        
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Variable className="h-4 w-4" />
            Available Variables
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            These variables will be automatically replaced during content generation:
          </p>
          <div className="flex flex-wrap gap-2">
            {availableVariables.map(v => (
              <Badge key={v} variant="secondary" className="font-mono text-xs">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
