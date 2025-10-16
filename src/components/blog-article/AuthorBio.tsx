import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Linkedin, Mail } from "lucide-react";
import { Author } from "@/types/blog";

interface AuthorBioProps {
  author: Author;
}

export const AuthorBio = ({ author }: AuthorBioProps) => {
  return (
    <Card className="my-12">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <Avatar className="h-32 w-32 flex-shrink-0">
            <AvatarImage src={author.photo_url} alt={author.name} />
            <AvatarFallback className="text-2xl">{author.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-2xl font-bold">{author.name}</h3>
              <p className="text-muted-foreground">{author.job_title}</p>
              {author.years_experience && (
                <p className="text-sm text-muted-foreground">
                  {author.years_experience} years of experience
                </p>
              )}
            </div>

            <p className="text-sm leading-relaxed">{author.bio}</p>

            {author.credentials && author.credentials.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Credentials:</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  {author.credentials.map((cred, index) => (
                    <li key={index}>{cred}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
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
