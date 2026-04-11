import { get } from './api';
import { ApiResponse } from '../types';

export interface DashboardStats {
  totalClients: number;
  recentClients: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  pendingDocuments: number;
  upcomingReviews: number;
  complianceRate: number;
}

export interface ComplianceReport {
  clientsByMonth: any[];
  documentsByStatus: any[];
  riskChanges: number;
  manualOverrides: any[];
}

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return get('/reports/dashboard');
}

export async function getComplianceReport(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<ComplianceReport>> {
  return get('/reports/compliance', { params });
}

export async function getRiskDistribution(): Promise<ApiResponse<any>> {
  return get('/reports/risk-distribution');
}

export async function getDocumentStatusReport(): Promise<ApiResponse<any>> {
  return get('/reports/document-status');
}

export async function exportReport(format: 'json' | 'pdf' | 'excel' = 'json'): Promise<any> {
  return get('/reports/export', { params: { format } });
}
