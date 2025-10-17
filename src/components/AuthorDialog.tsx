import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { Author } from "@/types/blog";
import { useState } from "react";

const authorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  job_title: z.string().min(1, "Job title is required").max(100),
  bio: z.string().min(1, "Bio is required").max(500),
  photo_url: z.string().url("Must be a valid URL"),
  linkedin_url: z.string().url("Must be a valid URL"),
  years_experience: z.coerce.number().min(0, "Must be 0 or greater").max(99),
});

type AuthorFormValues = z.infer<typeof authorSchema>;

interface AuthorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  author?: Author | null;
  onSubmit: (data: AuthorFormValues & { credentials: string[] }) => Promise<void>;
  isLoading?: boolean;
}

export const AuthorDialog = ({ open, onOpenChange, author, onSubmit, isLoading }: AuthorDialogProps) => {
  const [credentials, setCredentials] = useState<string[]>(author?.credentials || []);
  const [credentialInput, setCredentialInput] = useState("");

  const form = useForm<AuthorFormValues>({
    resolver: zodResolver(authorSchema),
    defaultValues: {
      name: author?.name || "",
      job_title: author?.job_title || "",
      bio: author?.bio || "",
      photo_url: author?.photo_url || "",
      linkedin_url: author?.linkedin_url || "",
      years_experience: author?.years_experience || 0,
    },
  });

  const handleSubmit = async (data: AuthorFormValues) => {
    await onSubmit({ ...data, credentials });
    form.reset();
    setCredentials([]);
    setCredentialInput("");
  };

  const addCredential = () => {
    if (credentialInput.trim() && !credentials.includes(credentialInput.trim())) {
      setCredentials([...credentials, credentialInput.trim()]);
      setCredentialInput("");
    }
  };

  const removeCredential = (cred: string) => {
    setCredentials(credentials.filter((c) => c !== cred));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{author ? "Edit Author" : "Add New Author"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Content Writer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief biography..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Credentials</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add credential"
                  value={credentialInput}
                  onChange={(e) => setCredentialInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCredential();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addCredential}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {credentials.map((cred) => (
                  <Badge key={cred} variant="secondary">
                    {cred}
                    <button
                      type="button"
                      onClick={() => removeCredential(cred)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="photo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/photo.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkedin_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://linkedin.com/in/username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="years_experience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : author ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
