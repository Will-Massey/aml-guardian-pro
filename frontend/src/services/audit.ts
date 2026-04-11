import { get } from './api';
import { ApiResponse, AuditLog, AuditStats } from '../types';

export async function getAuditLogs(params?: {
  clientId?: string;
  entityType?: string;
  action?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<{ logs: AuditLog[]; meta: { page: number; limit: number; total: number; pages: number } }>> {
  return get('/audit', { params });
}

export async function getAuditStats(): Promise<ApiResponse<AuditStats>> {
  return get('/audit/stats');
}
