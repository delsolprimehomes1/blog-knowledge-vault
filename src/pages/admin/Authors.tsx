import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Author } from "@/types/blog";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, ExternalLink, Star, ShieldCheck, Award } from "lucide-react";
import { useState } from "react";
import { AuthorDialog } from "@/components/AuthorDialog";
import { toast } from "@/hooks/use-toast";

const Authors = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [deleteAuthorId, setDeleteAuthorId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("authors").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authors"] });
      toast({ title: "Author created successfully" });
      setIsDialogOpen(false);
      setSelectedAuthor(null);
    },
    onError: (error: any) => {
      toast({ title: "Error creating author", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("authors").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authors"] });
      toast({ title: "Author updated successfully" });
      setIsDialogOpen(false);
      setSelectedAuthor(null);
    },
    onError: (error: any) => {
      toast({ title: "Error updating author", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("authors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authors"] });
      toast({ title: "Author deleted successfully" });
      setDeleteAuthorId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error deleting author", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = async (data: any) => {
    if (selectedAuthor) {
      await updateMutation.mutateAsync({ id: selectedAuthor.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const openCreateDialog = () => {
    setSelectedAuthor(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (author: Author) => {
    setSelectedAuthor(author);
    setIsDialogOpen(true);
  };

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
          <Button size="lg" onClick={openCreateDialog}>
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
                          {/* Trust Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {author.is_expert_verified && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-[10px] py-0 h-5">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Expert
                              </Badge>
                            )}
                            {author.is_licensed_professional && (
                              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-[10px] py-0 h-5">
                                <Award className="h-3 w-3 mr-1" />
                                Licensed
                              </Badge>
                            )}
                            {author.rating && (
                              <Badge variant="outline" className="text-[10px] py-0 h-5">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                                {author.rating.toFixed(1)}
                              </Badge>
                            )}
                          </div>
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
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(author)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteAuthorId(author.id)}>
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

        <AuthorDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          author={selectedAuthor}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        <AlertDialog open={!!deleteAuthorId} onOpenChange={() => setDeleteAuthorId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Author</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this author? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteAuthorId && deleteMutation.mutate(deleteAuthorId)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Authors;
