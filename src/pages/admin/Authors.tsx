import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Author } from "@/types/blog";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ExternalLink } from "lucide-react";

const Authors = () => {
  const { data: authors, isLoading } = useQuery({
    queryKey: ["authors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authors")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as Author[];
    },
  });

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Authors</h1>
            <p className="text-muted-foreground">
              Manage content authors and their credentials
            </p>
          </div>
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Add New Author
          </Button>
        </div>

        {/* Authors List */}
        <div className="grid gap-6 md:grid-cols-2">
          {isLoading ? (
            <Card className="col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading authors...
              </CardContent>
            </Card>
          ) : authors?.length === 0 ? (
            <Card className="col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                No authors yet. Create your first author to get started.
              </CardContent>
            </Card>
          ) : (
            authors?.map((author) => (
              <Card key={author.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <Avatar className="h-20 w-20 border-2 border-primary/20">
                      <AvatarImage src={author.photo_url} alt={author.name} />
                      <AvatarFallback className="text-xl">
                        {author.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{author.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {author.job_title}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {author.years_experience} years
                        </Badge>
                      </div>

                      <p className="text-sm text-foreground/80 line-clamp-2">
                        {author.bio}
                      </p>

                      {/* Credentials */}
                      <div className="flex flex-wrap gap-2">
                        {author.credentials.slice(0, 2).map((cred, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {cred}
                          </Badge>
                        ))}
                        {author.credentials.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{author.credentials.length - 2} more
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" variant="outline">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                        <a
                          href={author.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto"
                        >
                          <Button size="sm" variant="ghost">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            LinkedIn
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Authors;
