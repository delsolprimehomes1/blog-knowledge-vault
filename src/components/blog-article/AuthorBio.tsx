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
    <Card className="my-12 md:my-16 border-2 border-transparent bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-900/60 backdrop-blur-lg shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-blue-500/5 opacity-50"></div>
      <CardContent className="p-6 md:p-8 relative">
        {/* Top Badges Bar */}
        {(author.is_expert_verified || author.is_licensed_professional || author.rating) && (
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-white/20">
            {author.is_expert_verified && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1.5 shadow-md animate-fade-in-up">
                <ShieldCheck className="h-3.5 w-3.5" />
                Expert Verified
              </Badge>
            )}
            {author.is_licensed_professional && (
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 gap-1.5 shadow-md animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <Award className="h-3.5 w-3.5" />
                Licensed Professional
              </Badge>
            )}
            {author.rating && (
              <Badge variant="outline" className="gap-1.5 backdrop-blur-md bg-white/60 border-white/40 shadow-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                {renderRating(author.rating)}
                Rating
              </Badge>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 flex-shrink-0 ring-4 ring-primary/10 shadow-lg hover:ring-primary/20 transition-all duration-300">
            <AvatarImage src={author.photo_url} alt={author.name} />
            <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-primary to-accent text-white">
              {author.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            {/* Introduction Line */}
            <div>
              <p className="text-sm md:text-base text-muted-foreground mb-2">
                Content reviewed and verified by{" "}
                {author.credentials && author.credentials.length > 0 && (
                  <span className="font-semibold text-primary">
                    {author.credentials[0]}-Accredited Property Specialist
                  </span>
                )}
              </p>
              <h3 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
                — {author.name}
              </h3>
              <p className="text-base md:text-lg font-semibold text-primary">{author.job_title}</p>
            </div>

            {/* Experience Statement */}
            {author.years_experience > 0 && (
              <p className="text-sm md:text-base leading-relaxed text-muted-foreground">
                Over {author.years_experience} years of combined experience within our founding team
              </p>
            )}

            {/* Bio */}
            <p className="text-sm md:text-base leading-relaxed">{author.bio}</p>

            {/* Credentials as Inline Badges */}
            {author.credentials && author.credentials.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {author.credentials.map((cred, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs backdrop-blur-md bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    {cred}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {author.linkedin_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="backdrop-blur-md bg-white/60 border-primary/30 hover:bg-primary/10 hover:border-primary transition-all shadow-md"
                >
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
              <Button 
                variant="default" 
                size="sm"
                className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:scale-105 transition-all shadow-md"
              >
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
