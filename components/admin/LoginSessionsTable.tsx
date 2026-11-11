'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Monitor, Smartphone, Tablet, Globe, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface DeviceInfo {
  platform?: string;
  browser?: string;
  os?: string;
  device?: string;
  isMobile?: boolean;
  isTablet?: boolean;
  isDesktop?: boolean;
}

interface LoginSession {
  id: string;
  user_id: string;
  device_id: string;
  device_info: DeviceInfo;
  user_agent: string | null;
  created_at: string;
  user?: {
    email: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface LoginSessionsTableProps {
  sessions: LoginSession[];
}

export function LoginSessionsTable({ sessions }: LoginSessionsTableProps) {
  const [filteredSessions, setFilteredSessions] = useState(sessions);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const applyFilters = () => {
    let filtered = sessions;

    if (searchEmail) {
      filtered = filtered.filter((session) =>
        session.user?.email?.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    if (selectedPlatform !== 'all') {
      filtered = filtered.filter((session) => {
        const platform = session.device_info?.platform?.toLowerCase() || '';
        return platform.includes(selectedPlatform.toLowerCase());
      });
    }

    setFilteredSessions(filtered);
    setCurrentPage(1);
  };

  useState(() => {
    applyFilters();
  });

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  const getDeviceIcon = (deviceInfo: DeviceInfo) => {
    if (deviceInfo.isMobile) {
      return <Smartphone className="h-4 w-4 text-blue-600" />;
    }
    if (deviceInfo.isTablet) {
      return <Tablet className="h-4 w-4 text-purple-600" />;
    }
    if (deviceInfo.isDesktop) {
      return <Monitor className="h-4 w-4 text-green-600" />;
    }
    return <Globe className="h-4 w-4 text-gray-600" />;
  };

  const getDeviceTypeLabel = (deviceInfo: DeviceInfo) => {
    if (deviceInfo.isMobile) return 'Mobile';
    if (deviceInfo.isTablet) return 'Tablet';
    if (deviceInfo.isDesktop) return 'Desktop';
    return 'Unknown';
  };

  const getPlatformBadge = (platform: string | undefined) => {
    if (!platform) return 'bg-gray-100 text-gray-800';
    const lower = platform.toLowerCase();
    if (lower.includes('ios') || lower.includes('iphone') || lower.includes('ipad')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (lower.includes('android')) {
      return 'bg-green-100 text-green-800';
    }
    if (lower.includes('windows')) {
      return 'bg-cyan-100 text-cyan-800';
    }
    if (lower.includes('mac')) {
      return 'bg-purple-100 text-purple-800';
    }
    if (lower.includes('linux')) {
      return 'bg-orange-100 text-orange-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login Sessions</CardTitle>
          <CardDescription>No data Login Sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No data yet Login Sessions made to the system
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login Sessions</CardTitle>
        <CardDescription>
          All sign-in history ({filteredSessions.length} items)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Search by email</Label>
            <Input
              type="text"
              placeholder="Enter email..."
              value={searchEmail}
              onChange={(e) => {
                setSearchEmail(e.target.value);
                setTimeout(applyFilters, 0);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Filter by platform</Label>
            <Select
              value={selectedPlatform}
              onValueChange={(value) => {
                setSelectedPlatform(value);
                setTimeout(applyFilters, 0);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
                <SelectItem value="windows">Windows</SelectItem>
                <SelectItem value="mac">macOS</SelectItem>
                <SelectItem value="linux">Linux</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Users</TableHead>
                <TableHead>Device ID</TableHead>
                <TableHead>Device type</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Browser</TableHead>
                <TableHead>TimeSign in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      {session.profiles ? (
                        <>
                          <p className="font-medium">
                            {session.profiles.first_name} {session.profiles.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.user?.email || 'N/A'}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm">{session.user?.email || 'N/A'}</p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {session.device_id.substring(0, 12)}...
                    </code>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(session.device_info)}
                      <span className="text-sm">{getDeviceTypeLabel(session.device_info)}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPlatformBadge(
                        session.device_info?.platform
                      )}`}
                    >
                      {session.device_info?.platform || session.device_info?.os || 'N/A'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm">{session.device_info?.browser || 'N/A'}</span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(session.created_at), 'dd MMM yyyy HH:mm', {
                          locale: th,
                        })}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredSessions.length)} of{' '}
              {filteredSessions.length} items
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
