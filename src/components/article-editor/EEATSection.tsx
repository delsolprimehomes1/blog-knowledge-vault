import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Author } from "@/types/blog";

interface EEATSectionProps {
  authors: Author[] | undefined;
  authorId: string;
  reviewerId: string;
  datePublished: string;
  dateModified: string;
  readTime: number;
  onAuthorChange: (value: string) => void;
  onReviewerChange: (value: string) => void;
  errors: Record<string, string>;
}

export const EEATSection = ({
  authors,
  authorId,
  reviewerId,
  datePublished,
  dateModified,
  readTime,
  onAuthorChange,
  onReviewerChange,
  errors,
}: EEATSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>E-E-A-T Attribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="author">Author *</Label>
          <Select value={authorId} onValueChange={onAuthorChange}>
            <SelectTrigger className={errors.authorId ? "border-red-500" : ""}>
              <SelectValue placeholder="Select author" />
            </SelectTrigger>
            <SelectContent>
              {authors?.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={author.photo_url} alt={author.name} />
                      <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{author.name}</span>
                      <span className="text-xs text-muted-foreground">{author.job_title}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.authorId && (
            <p className="text-sm text-red-600 mt-1">{errors.authorId}</p>
          )}
        </div>

        <div>
          <Label htmlFor="reviewer">Reviewer (Optional)</Label>
          <Select value={reviewerId || "none"} onValueChange={(value) => onReviewerChange(value === "none" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select reviewer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {authors?.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={author.photo_url} alt={author.name} />
                      <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{author.name}</span>
                      <span className="text-xs text-muted-foreground">{author.job_title}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Date Published</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {datePublished ? new Date(datePublished).toLocaleDateString() : "Not published yet"}
            </p>
          </div>
          <div>
            <Label>Date Modified</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {dateModified ? new Date(dateModified).toLocaleDateString() : "Not modified"}
            </p>
          </div>
          <div>
            <Label>Read Time</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {readTime || 0} minutes
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
