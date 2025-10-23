import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LazyRichTextEditor } from "@/components/LazyRichTextEditor";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { countWords, getWordCountStatus } from "@/lib/articleUtils";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ContentSectionProps {
  speakableAnswer: string;
  detailedContent: string;
  onSpeakableAnswerChange: (value: string) => void;
  onDetailedContentChange: (value: string) => void;
  errors?: Record<string, string>;
}

export const ContentSection = ({
  speakableAnswer,
  detailedContent,
  onSpeakableAnswerChange,
  onDetailedContentChange,
  errors = {},
}: ContentSectionProps) => {
  const speakableWords = countWords(speakableAnswer);
  const speakableStatus = getWordCountStatus(speakableWords, 40, 60);

  const contentText = detailedContent.replace(/<[^>]*>/g, ' ').trim();
  const contentWords = countWords(contentText);
  const contentStatus = getWordCountStatus(contentWords, 1500, 2500);
  
  const citationMarkerCount = (detailedContent.match(/\[CITATION_NEEDED\]/g) || []).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {citationMarkerCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Citation Markers Present</AlertTitle>
            <AlertDescription>
              Your content contains {citationMarkerCount} [CITATION_NEEDED] marker{citationMarkerCount !== 1 ? 's' : ''}. 
              Use the Citation Replacement tool below or manually remove them before saving.
            </AlertDescription>
          </Alert>
        )}
        <div>
          <Label htmlFor="speakableAnswer">Speakable Answer (40-60 words optimal) *</Label>
          <Textarea
            id="speakableAnswer"
            value={speakableAnswer}
            onChange={(e) => onSpeakableAnswerChange(e.target.value)}
            placeholder="Write a conversational, action-oriented summary that voice assistants can read..."
            rows={4}
            className={errors.speakableAnswer ? "border-red-500" : ""}
          />
          <div className="flex items-center justify-between mt-1">
            <p className={`text-xs ${speakableStatus.color}`}>
              {speakableWords} words - {speakableStatus.message}
            </p>
          </div>
          {errors.speakableAnswer && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.speakableAnswer}
            </p>
          )}
        </div>

        <div>
          <Label>Detailed Content (1500-2500 words target) *</Label>
          <LazyRichTextEditor
            content={detailedContent}
            onChange={onDetailedContentChange}
            placeholder="Write your detailed article content here..."
          />
          <p className={`text-xs mt-1 ${contentStatus.color}`}>
            {contentWords} words - {contentStatus.message}
          </p>
          {errors.detailedContent && (
            <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.detailedContent}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
