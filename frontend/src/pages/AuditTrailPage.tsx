import { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  History, 
  User, 
  FileText, 
  Shield, 
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  LogIn,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { getAuditLogs } from '../services/audit';
import { AuditLog, AuditAction } from '../types';
import { format } from 'date-fns';

const ACTION_ICONS: Record<AuditAction, typeof History> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  VIEW: Eye,
  GENERATE: FileText,
  EXPORT: Download,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  APPROVE: CheckCircle,
  REJECT: XCircle,
  UPLOAD: Upload,
  DOWNLOAD: Download,
};

const ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  VIEW: 'bg-gray-100 text-gray-800',
  GENERATE: 'bg-purple-100 text-purple-800',
  EXPORT: 'bg-indigo-100 text-indigo-800',
  LOGIN: 'bg-gray-100 text-gray-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  APPROVE: 'bg-green-100 text-green-800',
  REJECT: 'bg-red-100 text-red-800',
  UPLOAD: 'bg-blue-100 text-blue-800',
  DOWNLOAD: 'bg-indigo-100 text-indigo-800',
};

export function AuditTrailPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<AuditAction | ''>('');
  const limit = 20;

  const { data, isLoading } = useQuery(
    ['auditLogs', page, filter],
    () => getAuditLogs({ page, limit, action: filter || undefined }),
    { keepPreviousData: true }
  );

  const logs = data?.data?.logs || [];
  const meta = data?.data?.meta;

  const getActionIcon = (action: AuditAction) => {
    const Icon = ACTION_ICONS[action] || History;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">
            Complete history of all system activities
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter by Action:</span>
          </div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as AuditAction | '');
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="VIEW">View</option>
            <option value="UPLOAD">Upload</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${ACTION_COLORS[log.action]}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[log.action]}`}>
                            {log.action}
                          </span>
                          <span className="text-sm text-gray-500">{log.entityType}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mt-1">
                        {log.description || `${log.action} ${log.entityType}`}
                      </p>
                      {log.user && (
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <User className="w-3 h-3 mr-1" />
                          {log.user.firstName} {log.user.lastName} ({log.user.email})
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.pages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {meta.pages} ({meta.total} total)
                </span>
                <button
                  onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                  disabled={page === meta.pages}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
