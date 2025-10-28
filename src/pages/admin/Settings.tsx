import { AdminLayout } from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterPromptEditor } from "@/components/admin/MasterPromptEditor";
import { BulkExperienceUpdater } from "@/components/admin/BulkExperienceUpdater";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure content generation and system preferences
          </p>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList>
            <TabsTrigger value="content">Content Generation</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="mt-6">
            <div className="space-y-6">
              <MasterPromptEditor />
              <BulkExperienceUpdater />
            </div>
          </TabsContent>
          
          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>
                  General configuration options coming soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This section will include SEO defaults, user permissions, and more.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>
                  Connect third-party services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Integration options will be available in future updates.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Settings;
