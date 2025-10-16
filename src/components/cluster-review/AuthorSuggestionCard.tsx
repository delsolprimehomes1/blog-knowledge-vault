import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface AuthorData {
  id: string;
  name: string;
  job_title: string;
  photo_url: string;
  bio: string;
  credentials: string[];
  years_experience: number;
}

interface AuthorSuggestionCardProps {
  author: AuthorData;
  reasoning: string;
  confidence: number;
  onAccept: () => void;
  label: string;
}

export const AuthorSuggestionCard = ({ 
  author, 
  reasoning, 
  confidence, 
  onAccept,
  label
}: AuthorSuggestionCardProps) => {
  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-3">{label}</h4>
      <div className="flex gap-4">
        <img 
          src={author.photo_url} 
          alt={author.name}
          className="w-16 h-16 rounded-full object-cover shrink-0"
        />
        <div className="flex-1 space-y-2">
          <div>
            <h5 className="font-semibold">{author.name}</h5>
            <p className="text-sm text-muted-foreground">{author.job_title}</p>
          </div>
          <p className="text-sm">{reasoning}</p>
          <div className="flex items-center gap-2">
            <Progress value={confidence} className="flex-1" />
            <span className="text-xs font-medium">{confidence}%</span>
          </div>
          <Button onClick={onAccept} size="sm" className="w-full">
            ✓ Accept
          </Button>
        </div>
      </div>
    </Card>
  );
};
