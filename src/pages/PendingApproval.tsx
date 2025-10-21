import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PendingApproval() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
          </div>
          <CardTitle>Access Pending</CardTitle>
          <CardDescription>
            Your admin access is pending approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Thank you for signing up!</p>
            <p className="mt-2">
              An administrator needs to approve your account before you can access the admin panel.
              You'll receive an email once your access is granted.
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
