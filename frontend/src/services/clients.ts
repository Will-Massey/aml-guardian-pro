import { get, post, put, del } from './api';
import { ApiResponse, Client, ClientStats } from '../types';

export async function getClients(params?: { riskLevel?: string; search?: string }): Promise<ApiResponse<Client[]>> {
  return get('/clients', { params });
}

export async function getClient(id: string): Promise<ApiResponse<Client>> {
  return get(`/clients/${id}`);
}

export async function createClient(data: {
  companyNumber?: string;
  manualEntry?: boolean;
  companyName?: string;
  registeredAddress?: any;
  businessDescription?: string;
  sicCodes?: string[];
}): Promise<ApiResponse<Client>> {
  return post('/clients', data);
}

export async function updateClient(id: string, data: Partial<Client>): Promise<ApiResponse<Client>> {
  return put(`/clients/${id}`, data);
}

export async function deleteClient(id: string): Promise<ApiResponse<void>> {
  return del(`/clients/${id}`);
}

export async function getClientStats(): Promise<ApiResponse<ClientStats>> {
  return get('/clients/stats');
}

export async function generatePortalLink(clientId: string): Promise<ApiResponse<{ portalUrl: string; token: string; expiresAt: string }>> {
  return post(`/clients/${clientId}/portal-link`);
}

export async function revokePortalAccess(clientId: string): Promise<ApiResponse<void>> {
  return del(`/clients/${clientId}/portal-link`);
}
