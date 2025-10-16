import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthorsTable } from "@/components/AuthorsTable";
import { CategoriesTable } from "@/components/CategoriesTable";
import { ArticlesTable } from "@/components/ArticlesTable";
import { Database, Users, FolderOpen, FileText } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <Database className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Blog CMS</h1>
              <p className="text-muted-foreground">
                AI-Optimized Content Management System
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="articles" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="authors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Authors
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4">
            <ArticlesTable />
          </TabsContent>

          <TabsContent value="authors" className="space-y-4">
            <AuthorsTable />
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoriesTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
