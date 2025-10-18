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
    <Card className="my-16 md:my-20 border-2 border-transparent bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-900/90 dark:to-gray-900/70 backdrop-blur-xl shadow-2xl hover:shadow-[0_20px_60px_rgba(42,58,50,0.2)] transition-all duration-500 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-blue-500/5 opacity-50"></div>
      <CardContent className="p-8 md:p-12 relative">
        {/* Top Badges Bar */}
        {(author.is_expert_verified || author.is_licensed_professional || author.rating) && (
          <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-white/20">
            {author.is_expert_verified && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-2 shadow-md animate-fade-in-up px-4 py-2 text-sm">
                <ShieldCheck className="h-4 w-4" />
                Expert Verified
              </Badge>
            )}
            {author.is_licensed_professional && (
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-md animate-fade-in-up px-4 py-2 text-sm" style={{ animationDelay: '0.1s' }}>
                <Award className="h-4 w-4" />
                Licensed Professional
              </Badge>
            )}
            {author.rating && (
              <Badge variant="outline" className="gap-2 backdrop-blur-md bg-white/60 border-white/40 shadow-md animate-fade-in-up px-4 py-2" style={{ animationDelay: '0.2s' }}>
                {renderRating(author.rating)}
                Rating
              </Badge>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-10">
          <div className="relative flex-shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary to-accent rounded-full opacity-75 blur-sm"></div>
            <Avatar className="relative h-32 w-32 md:h-40 md:w-40 ring-4 ring-gradient-to-br from-primary to-accent shadow-2xl hover:scale-105 transition-transform duration-300">
              <AvatarImage src={author.photo_url} alt={author.name} />
              <AvatarFallback className="text-3xl md:text-4xl bg-gradient-to-br from-primary to-accent text-white">
                {author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 space-y-5">
            {/* Introduction Line */}
            <div>
              <p className="text-base md:text-lg text-muted-foreground mb-3">
                Content reviewed and verified by{" "}
                {author.credentials && author.credentials.length > 0 && (
                  <span className="font-semibold text-primary">
                    {author.credentials[0]}-Accredited Property Specialist
                  </span>
                )}
              </p>
              <h3 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-primary/80 bg-clip-text text-transparent">
                — {author.name}
              </h3>
              <p className="text-lg md:text-xl font-semibold text-primary">{author.job_title}</p>
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
            <div className="flex gap-3 pt-4">
              {author.linkedin_url && (
                <Button 
                  variant="outline" 
                  size="default" 
                  asChild
                  className="backdrop-blur-md bg-white/60 border-primary/30 hover:bg-primary/10 hover:border-primary transition-all shadow-md hover:shadow-lg"
                >
                  <a
                    href={author.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="h-5 w-5 mr-2" />
                    LinkedIn
                  </a>
                </Button>
              )}
              <Button 
                variant="default" 
                size="default"
                className="bg-gradient-to-r from-primary to-accent hover:shadow-xl hover:scale-105 transition-all shadow-lg active:scale-95 px-6"
              >
                <Mail className="h-5 w-5 mr-2" />
                Contact Agent
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
