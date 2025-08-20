import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Shield, 
  RefreshCw,
  Download,
  Eye,
  Calendar,
  User,
  Activity,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Types
interface AuditLogEntry {
  id: string;
  action: string;
  old_value: any;
  new_value: any;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
  admin: {
    username: string;
    email: string;
  } | null;
  target_user: {
    username: string;
    email: string;
  } | null;
}

interface SystemStats {
  roleStatistics: {
    total: number;
    byRole: Record<string, number>;
    bySource: Record<string, number>;
  };
  recentActivity: AuditLogEntry[];
  superAdmin: {
    username: string;
    email: string;
    created_at: string;
    last_login: string;
  } | null;
  systemInfo: {
    timestamp: string;
    version: string;
  };
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const AdminAuditLog: React.FC = () => {
  const { token } = useAuth();
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [limit, setLimit] = useState(50);

  const getAuthToken = () => token;

  const loadAuditLog = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      if (adminFilter && adminFilter !== 'all') {
        queryParams.append('admin_id', adminFilter);
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/user-management/audit-log?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAuditLog(data.auditLog);
      } else {
        toast.error("Failed to load audit log");
      }
    } catch (error) {
      console.error('Error loading audit log:', error);
      toast.error("Error loading audit log");
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/user-management/system-stats`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSystemStats(data.data);
      } else {
        toast.error("Failed to load system statistics");
      }
    } catch (error) {
      console.error('Error loading system stats:', error);
      toast.error("Error loading system statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLog();
    loadSystemStats();
  }, [limit, adminFilter]);

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'role_change': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user_created': return 'bg-green-100 text-green-800 border-green-200';
      case 'super_admin_login': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'kos_admin_login': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'local_admin_login': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatActionName = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredAuditLog = auditLog.filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.admin?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.target_user?.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Audit Log</h1>
          <p className="text-muted-foreground">Monitor all administrative actions and system activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadAuditLog(); loadSystemStats(); }} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : systemStats?.roleStatistics?.total || 0}
                </p>
              </div>
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Actions</p>
                <p className="text-2xl font-bold">{auditLog.length}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Super Admin</p>
                <p className="text-sm font-bold">
                  {statsLoading ? "..." : systemStats?.superAdmin?.username || "N/A"}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Version</p>
                <p className="text-sm font-bold">
                  {statsLoading ? "..." : systemStats?.systemInfo?.version || "1.0.0"}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      {systemStats?.roleStatistics && (
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(systemStats.roleStatistics.byRole).map(([role, count]) => (
                <div key={role} className="text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground capitalize">{role}s</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, admins, or users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="role_change">Role Changes</SelectItem>
                <SelectItem value="user_created">User Created</SelectItem>
                <SelectItem value="super_admin_login">Super Admin Login</SelectItem>
                <SelectItem value="kos_admin_login">KOS Admin Login</SelectItem>
                <SelectItem value="local_admin_login">Local Admin Login</SelectItem>
              </SelectContent>
            </Select>
            <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
              <SelectTrigger className="w-full md:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 entries</SelectItem>
                <SelectItem value="50">50 entries</SelectItem>
                <SelectItem value="100">100 entries</SelectItem>
                <SelectItem value="200">200 entries</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log ({filteredAuditLog.length} entries)</CardTitle>
          <CardDescription>Complete log of all administrative actions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Target User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeColor(entry.action)}>
                          {formatActionName(entry.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.admin ? (
                          <div>
                            <p className="font-medium">{entry.admin.username}</p>
                            <p className="text-sm text-muted-foreground">{entry.admin.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.target_user ? (
                          <div>
                            <p className="font-medium">{entry.target_user.username}</p>
                            <p className="text-sm text-muted-foreground">{entry.target_user.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {entry.old_value && entry.new_value && (
                            <p className="text-sm">
                              <span className="text-red-600">{JSON.stringify(entry.old_value)}</span>
                              {" → "}
                              <span className="text-green-600">{JSON.stringify(entry.new_value)}</span>
                            </p>
                          )}
                          {entry.reason && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Reason:</strong> {entry.reason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.ip_address || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAuditLog.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No audit log entries found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuditLog;
