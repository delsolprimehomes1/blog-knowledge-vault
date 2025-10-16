import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Author } from "@/types/blog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink } from "lucide-react";

export const AuthorsTable = () => {
  const { data: authors, isLoading } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Author[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authors</CardTitle>
          <CardDescription>Loading authors...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authors</CardTitle>
        <CardDescription>Manage your content authors and their credentials</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {authors?.map((author) => (
            <div key={author.id} className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
              <Avatar className="h-16 w-16">
                <AvatarImage src={author.photo_url} alt={author.name} />
                <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{author.name}</h3>
                    <p className="text-sm text-muted-foreground">{author.job_title}</p>
                  </div>
                  <Badge variant="secondary">{author.years_experience} years</Badge>
                </div>
                <p className="text-sm text-foreground/80 line-clamp-2">{author.bio}</p>
                <div className="flex flex-wrap gap-2">
                  {author.credentials.map((cred, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {cred}
                    </Badge>
                  ))}
                </div>
                <a
                  href={author.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  LinkedIn Profile
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
