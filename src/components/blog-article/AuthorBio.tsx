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

  return (
    <Card className="my-12 md:my-16 border border-border bg-card shadow-lg overflow-hidden">
      <CardContent className="p-6 md:p-10">
        {/* Top Badges Bar */}
        {(author.is_expert_verified || author.is_licensed_professional || author.rating) && (
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-6">
            {author.is_expert_verified && (
              <Badge className="bg-green-600 hover:bg-green-600 text-white border-0 gap-1.5 px-3 py-1.5 text-xs font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Expert Verified
              </Badge>
            )}
            {author.is_licensed_professional && (
              <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-0 gap-1.5 px-3 py-1.5 text-xs font-medium">
                <Award className="h-3.5 w-3.5" />
                Licensed Professional
              </Badge>
            )}
            {author.rating && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-500 gap-1.5 px-3 py-1.5 text-xs font-medium">
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                {author.rating.toFixed(1)}★ Rating
              </Badge>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Avatar */}
          <div className="flex justify-center md:justify-start mb-6 md:mb-0">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 ring-2 ring-primary/20 shadow-lg">
              <AvatarImage src={author.photo_url} alt={author.name} className="object-cover" />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {author.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4">
            {/* Name & Title */}
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                {author.name}
              </h3>
              <p className="text-base md:text-lg font-medium text-primary">
                {author.job_title}
              </p>
            </div>

            {/* Experience Statement */}
            {author.years_experience > 0 && (
              <p className="text-sm text-muted-foreground text-center md:text-left">
                Over {author.years_experience} years of combined experience within our founding team
              </p>
            )}

            {/* Bio */}
            <p className="text-sm md:text-base leading-relaxed text-foreground/90 text-center md:text-left">
              {author.bio}
            </p>

            {/* Credentials */}
            {author.credentials && author.credentials.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center md:text-left">
                  Professional Credentials
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {author.credentials.map((cred, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs sm:text-sm bg-muted hover:bg-muted border-0 font-normal py-1.5 px-3 leading-relaxed whitespace-normal text-left max-w-full"
                    >
                      {cred}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {author.linkedin_url && (
                <Button 
                  variant="outline" 
                  size="lg"
                  asChild
                  className="flex-1 min-h-[48px] border-primary/30 hover:bg-primary/5 hover:border-primary"
                >
                  <a
                    href={author.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn Profile
                  </a>
                </Button>
              )}
              <Button 
                variant="default" 
                size="lg"
                className="flex-1 min-h-[48px] bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Agent
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
