"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

/**
 * Audit Logs Table Component
 * Displays system activity logs
 */
interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  description: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface LogsTableProps {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
}

export function LogsTable({ logs, total, page, totalPages }: LogsTableProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.user.username}</p>
                      <p className="text-xs text-muted-foreground">{log.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.resource}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {log.description || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.ipAddress || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, total)} of {total} logs
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => {
                const params = new URLSearchParams();
                params.set("page", String(page - 1));
                router.push(`/dashboard/logs?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => {
                const params = new URLSearchParams();
                params.set("page", String(page + 1));
                router.push(`/dashboard/logs?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

