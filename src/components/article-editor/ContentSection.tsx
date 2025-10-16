import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LazyRichTextEditor } from "@/components/LazyRichTextEditor";
import { AlertCircle } from "lucide-react";
import { countWords, getWordCountStatus } from "@/lib/articleUtils";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
