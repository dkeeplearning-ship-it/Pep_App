import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Users, 
  UserCheck, 
  Shield, 
  GraduationCap, 
  BookOpen,
  MoreVertical,
  Eye,
  RefreshCw,
  Key,
  Download,
  AlertTriangle,
  History,
  UserPlus,
  Settings
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Types
interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  user_source: 'super_admin' | 'kos' | 'local';
  authenticated_via: 'local' | 'kos-core';
  status: 'active' | 'inactive';
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  last_login: string | null;
  promoted_by: string | null;
  promoted_at: string | null;
  promotion_reason: string | null;
}

interface RoleChangeHistory {
  id: string;
  action: string;
  old_value: { role: string };
  new_value: { role: string };
  reason: string;
  created_at: string;
  admin: {
    username: string;
    email: string;
  };
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const UserRoleManagement: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Role change modal
  const [roleChangeModal, setRoleChangeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  // Role history modal
  const [historyModal, setHistoryModal] = useState(false);
  const [roleHistory, setRoleHistory] = useState<RoleChangeHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Create user modal
  const [createUserModal, setCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "student",
    first_name: "",
    last_name: "",
    reason: ""
  });
  const [createUserLoading, setCreateUserLoading] = useState(false);

  const getAuthToken = () => token;

  const loadUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '20');
      if (searchQuery) queryParams.append('search', searchQuery);
      if (roleFilter && roleFilter !== 'all') queryParams.append('role', roleFilter);
      if (sourceFilter && sourceFilter !== 'all') queryParams.append('user_source', sourceFilter);

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/user-management/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
        setTotalUsers(data.data.pagination.total);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error("Error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchQuery, roleFilter, sourceFilter]);

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || !changeReason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setRoleChangeLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/user-management/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          newRole,
          reason: changeReason
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`User role changed from ${data.changes.oldRole} to ${data.changes.newRole}`);
        setRoleChangeModal(false);
        setSelectedUser(null);
        setNewRole("");
        setChangeReason("");
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to change user role");
      }
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error("Error changing user role");
    } finally {
      setRoleChangeLoading(false);
    }
  };

  const loadRoleHistory = async (userId: string) => {
    try {
      setHistoryLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/user-management/users/${userId}/role-history`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRoleHistory(data.history);
      } else {
        toast.error("Failed to load role history");
      }
    } catch (error) {
      console.error('Error loading role history:', error);
      toast.error("Error loading role history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password || !newUser.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setCreateUserLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/user-management/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("User created successfully");
        setCreateUserModal(false);
        setNewUser({
          username: "",
          email: "",
          password: "",
          role: "student",
          first_name: "",
          last_name: "",
          reason: ""
        });
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create user");
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error("Error creating user");
    } finally {
      setCreateUserLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'teacher': return <GraduationCap className="h-4 w-4" />;
      case 'student': return <BookOpen className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'teacher': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'student': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'kos': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'local': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Role Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateUserModal(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
          <Button variant="outline" onClick={loadUsers} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teachers</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'teacher').length}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'student').length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="kos">KOS</SelectItem>
                <SelectItem value="local">Local</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({totalUsers})</CardTitle>
          <CardDescription>Manage user roles and view user information</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(user.role)}
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {(user.first_name || user.last_name) && (
                          <p className="text-sm text-muted-foreground">
                            {user.first_name} {user.last_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge className={getSourceBadgeColor(user.user_source)}>
                        {user.user_source}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Created: {new Date(user.created_at).toLocaleDateString()}</p>
                      {user.last_login && (
                        <p>Last login: {new Date(user.last_login).toLocaleDateString()}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role);
                            setRoleChangeModal(true);
                          }}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setHistoryModal(true);
                            loadRoleHistory(user.id);
                          }}
                        >
                          <History className="h-4 w-4 mr-2" />
                          Role History
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Role Change Modal */}
      <Dialog open={roleChangeModal} onOpenChange={setRoleChangeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.username} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newRole">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason">Reason for Change</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for role change..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={roleChangeLoading}>
              {roleChangeLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role History Modal */}
      <Dialog open={historyModal} onOpenChange={setHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Role Change History</DialogTitle>
            <DialogDescription>
              Role change history for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : roleHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No role changes found</p>
            ) : (
              roleHistory.map((change) => (
                <div key={change.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        Role changed from {change.old_value.role} to {change.new_value.role}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        By: {change.admin.username} ({change.admin.email})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Date: {new Date(change.created_at).toLocaleString()}
                      </p>
                      {change.reason && (
                        <p className="text-sm mt-2">
                          <strong>Reason:</strong> {change.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={createUserModal} onOpenChange={setCreateUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new local user account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="createReason">Reason for Creation</Label>
              <Textarea
                id="createReason"
                placeholder="Enter reason for creating this user..."
                value={newUser.reason}
                onChange={(e) => setNewUser({...newUser, reason: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={createUserLoading}>
              {createUserLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRoleManagement;
