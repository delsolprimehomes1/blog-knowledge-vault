import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, ExternalLink, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CitationHealthDashboard() {
  const [healthData, setHealthData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    dead: 0,
    redirected: 0,
    sslError: 0,
    timeout: 0
  });

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      const { data, error } = await supabase
        .from('external_citation_health')
        .select('*')
        .order('last_checked_at', { ascending: false });

      if (error) throw error;

      setHealthData(data || []);
      
      const total = data?.length || 0;
      const active = data?.filter(d => d.status === 'active').length || 0;
      const dead = data?.filter(d => d.status === 'dead').length || 0;
      const redirected = data?.filter(d => d.status === 'redirected').length || 0;
      const sslError = data?.filter(d => d.status === 'ssl_error').length || 0;
      const timeout = data?.filter(d => d.status === 'timeout').length || 0;
      
      setStats({ total, active, dead, redirected, sslError, timeout });
    } catch (error) {
      console.error('Error loading health data:', error);
      toast.error('Failed to load citation health data');
    } finally {
      setIsLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('verify-citation-health');
      if (error) throw error;
      
      toast.success('Health check complete! Reloading data...');
      await loadHealthData();
    } catch (error) {
      console.error('Error running health check:', error);
      toast.error('Failed to run health check');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'dead':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Dead</Badge>;
      case 'redirected':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1" /> Redirected</Badge>;
      case 'ssl_error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> SSL Error</Badge>;
      case 'timeout':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1" /> Timeout</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const findReplacement = async (url: string, source: string) => {
    try {
      toast.info('Finding replacement...');
      const { error } = await supabase.functions.invoke('find-replacement-citations', {
        body: { deadUrl: url, originalSource: source, language: 'es', articleContext: '' }
      });
      if (error) throw error;
      toast.success('Replacement suggestions added!');
    } catch (error) {
      console.error('Error finding replacement:', error);
      toast.error('Failed to find replacement');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Citation Health Dashboard</h1>
            <p className="text-muted-foreground">Monitor the health of all external citations</p>
          </div>
          <Button onClick={runHealthCheck} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Checking...' : 'Run Health Check'}
          </Button>
        </div>

        <div className="grid grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Dead</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.dead}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Redirected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.redirected}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">SSL Error</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.sslError}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Timeout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.timeout}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Citations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead>Gov Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthData.map((citation) => (
                    <TableRow key={citation.id}>
                      <TableCell className="font-medium">{citation.source_name}</TableCell>
                      <TableCell className="max-w-md truncate">
                        <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          {citation.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>{getStatusBadge(citation.status)}</TableCell>
                      <TableCell>{citation.response_time_ms ? `${citation.response_time_ms}ms` : 'N/A'}</TableCell>
                      <TableCell>
                        {citation.last_checked_at ? new Date(citation.last_checked_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        {citation.is_government_source && <Badge variant="default">🔒 Gov</Badge>}
                      </TableCell>
                      <TableCell>
                        {citation.status === 'dead' && (
                          <Button size="sm" variant="outline" onClick={() => findReplacement(citation.url, citation.source_name)}>
                            Find Replacement
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
