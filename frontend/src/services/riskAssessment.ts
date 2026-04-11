import { get, post } from './api';
import { ApiResponse, RiskAssessment } from '../types';

export async function getRiskAssessment(id: string): Promise<ApiResponse<RiskAssessment>> {
  return get(`/risk-assessments/${id}`);
}

export async function regenerateRiskAssessment(id: string): Promise<ApiResponse<RiskAssessment>> {
  return post(`/risk-assessments/${id}/regenerate`);
}

export async function overrideRiskAssessment(
  id: string, 
  data: { manualRiskLevel: string; overrideReason: string }
): Promise<ApiResponse<RiskAssessment>> {
  return post(`/risk-assessments/${id}/override`, data);
}

export async function previewRiskAssessment(data: any): Promise<ApiResponse<Partial<RiskAssessment>>> {
  return post('/risk-assessments/preview', data);
}
