import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, UserMinus, Trash2, Search } from "lucide-react";
import { format } from "date-fns";

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role?: 'admin' | 'editor' | 'viewer';
  granted_at?: string;
  granted_by?: string;
  notes?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [actionType, setActionType] = useState<'grant' | 'revoke' | 'delete' | null>(null);
  const [notes, setNotes] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetchUsers();

    // Set up realtime subscription
    const channel = supabase
      .channel('user-roles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles'
      }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with their roles
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles: UserWithRole[] = authUsers.map(user => {
        const userRole = roles?.find(r => r.user_id === user.id);
        return {
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
          role: userRole?.role,
          granted_at: userRole?.granted_at,
          granted_by: userRole?.granted_by,
          notes: userRole?.notes
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      if (actionType === 'delete') {
        // Delete user
        const { error } = await supabase.auth.admin.deleteUser(selectedUser.id);
        if (error) throw error;
        toast.success('User deleted successfully');
      } else {
        // Grant or revoke role
        const { error } = await supabase.functions.invoke('manage-user-role', {
          body: {
            action: actionType,
            userId: selectedUser.id,
            role: 'admin',
            notes: notes || undefined
          }
        });

        if (error) throw error;
        
        toast.success(
          actionType === 'grant' 
            ? 'Admin role granted successfully' 
            : 'Admin role revoked successfully'
        );
      }

      fetchUsers();
      setShowDialog(false);
      setSelectedUser(null);
      setActionType(null);
      setNotes("");
    } catch (error: any) {
      console.error('Error performing action:', error);
      toast.error(error.message || 'Failed to perform action');
    }
  };

  const openDialog = (user: UserWithRole, action: 'grant' | 'revoke' | 'delete') => {
    setSelectedUser(user);
    setActionType(action);
    setShowDialog(true);
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingUsers = filteredUsers.filter(u => !u.role);
  const adminUsers = filteredUsers.filter(u => u.role === 'admin');

  const UserTable = ({ users: tableUsers, showActions }: { users: UserWithRole[], showActions: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tableUsers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No users found
            </TableCell>
          </TableRow>
        ) : (
          tableUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>{format(new Date(user.created_at), 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                {user.role ? (
                  <Badge variant="default">Admin</Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </TableCell>
              {showActions && (
                <TableCell className="text-right space-x-2">
                  {user.role ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(user, 'revoke')}
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDialog(user, 'delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => openDialog(user, 'grant')}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Grant Admin
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDialog(user, 'delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage admin access and user accounts
          </p>
        </div>
        <Badge variant="outline" className="text-lg py-2 px-4">
          {pendingUsers.length} Pending
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>View and manage all user accounts</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingUsers.length})
              </TabsTrigger>
              <TabsTrigger value="admins">
                Admins ({adminUsers.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All Users ({filteredUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <UserTable users={pendingUsers} showActions={true} />
              )}
            </TabsContent>

            <TabsContent value="admins">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <UserTable users={adminUsers} showActions={true} />
              )}
            </TabsContent>

            <TabsContent value="all">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <UserTable users={filteredUsers} showActions={true} />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'grant' && 'Grant Admin Access'}
              {actionType === 'revoke' && 'Revoke Admin Access'}
              {actionType === 'delete' && 'Delete User Account'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'grant' && `Grant admin access to ${selectedUser?.email}?`}
              {actionType === 'revoke' && `Revoke admin access from ${selectedUser?.email}? They will lose access to the admin panel immediately.`}
              {actionType === 'delete' && `Permanently delete ${selectedUser?.email}? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          
          {actionType !== 'delete' && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add a note about this action..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'delete' ? 'destructive' : 'default'}
              onClick={handleAction}
            >
              {actionType === 'grant' && 'Grant Access'}
              {actionType === 'revoke' && 'Revoke Access'}
              {actionType === 'delete' && 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
