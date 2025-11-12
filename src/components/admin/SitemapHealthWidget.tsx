import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCheck2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const SitemapHealthWidget = () => {
  const navigate = useNavigate();

  const { data: latestValidation, isLoading } = useQuery({
    queryKey: ['latest-sitemap-validation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sitemap_validations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
      return data;
    }
  });

  const { data: activeAlerts } = useQuery({
    queryKey: ['sitemap-alerts-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('sitemap_alerts')
        .select('*', { count: 'exact', head: true })
        .is('resolved_at', null);
      
      if (error) throw error;
      return count || 0;
    }
  });

  const getScoreBadge = (score: number) => {
    if (score >= 95) return { variant: "default" as const, label: "A+", icon: CheckCircle2, color: "text-green-600" };
    if (score >= 85) return { variant: "secondary" as const, label: "B", icon: CheckCircle2, color: "text-blue-600" };
    if (score >= 75) return { variant: "secondary" as const, label: "C", icon: AlertCircle, color: "text-yellow-600" };
    return { variant: "destructive" as const, label: "F", icon: AlertCircle, color: "text-red-600" };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5" />
            Sitemap Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!latestValidation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5" />
            Sitemap Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">No validation data yet</p>
          <Button 
            onClick={() => navigate('/admin/sitemap-health')}
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            Run First Validation
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scoreBadge = getScoreBadge(latestValidation.health_score);
  const Icon = scoreBadge.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5" />
          Sitemap Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Health Score</span>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${scoreBadge.color}`} />
            <span className={`text-lg font-bold ${scoreBadge.color}`}>
              {latestValidation.health_score}/100
            </span>
            <Badge variant={scoreBadge.variant}>{scoreBadge.label}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Coverage</span>
          <span className="text-sm font-bold">
            {latestValidation.coverage_percentage}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Active Alerts</span>
          <Badge variant={activeAlerts && activeAlerts > 0 ? "destructive" : "default"}>
            {activeAlerts || 0}
          </Badge>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            Last validated: {new Date(latestValidation.created_at).toLocaleDateString()}
          </p>
          <Button 
            onClick={() => navigate('/admin/sitemap-health')}
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
