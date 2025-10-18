import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Mail, Star, ShieldCheck, Award } from "lucide-react";
import { Author } from "@/types/blog";

interface AuthorBioProps {
  author: Author;
}

export const AuthorBio = ({ author }: AuthorBioProps) => {
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="font-semibold">{rating.toFixed(1)}★</span>
      </div>
    );
  };

  return (
    <Card className="my-12 border-2">
      <CardContent className="p-6">
        {/* Top Badges Bar */}
        {(author.is_expert_verified || author.is_licensed_professional || author.rating) && (
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b">
            {author.is_expert_verified && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Expert Verified
              </Badge>
            )}
            {author.is_licensed_professional && (
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 gap-1.5">
                <Award className="h-3.5 w-3.5" />
                Licensed Professional
              </Badge>
            )}
            {author.rating && (
              <Badge variant="outline" className="gap-1.5">
                {renderRating(author.rating)}
                Rating
              </Badge>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-6">
          <Avatar className="h-32 w-32 flex-shrink-0 border-2 border-primary/20">
            <AvatarImage src={author.photo_url} alt={author.name} />
            <AvatarFallback className="text-2xl bg-primary/10">
              {author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            {/* Introduction Line */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Content reviewed and verified by{" "}
                {author.credentials && author.credentials.length > 0 && (
                  <span className="font-medium">
                    {author.credentials[0]}-Accredited Property Specialist
                  </span>
                )}
              </p>
              <h3 className="text-2xl font-bold mb-1">— {author.name}</h3>
              <p className="text-base font-medium text-primary">{author.job_title}</p>
            </div>

            {/* Experience Statement */}
            {author.years_experience > 0 && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Over {author.years_experience} years of combined experience within our founding team
              </p>
            )}

            {/* Bio */}
            <p className="text-sm leading-relaxed">{author.bio}</p>

            {/* Credentials as Inline Badges */}
            {author.credentials && author.credentials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {author.credentials.map((cred, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {cred}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {author.linkedin_url && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={author.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Contact {author.name.split(" ")[0]}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
