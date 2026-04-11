import { get, post, put, del } from './api';
import { ApiResponse, Document, DocumentStats, DocumentType, DocumentStatus } from '../types';
import api from './api';

export async function getDocuments(params?: { clientId?: string; type?: string }): Promise<ApiResponse<Document[]>> {
  return get('/documents', { params });
}

export async function generateDocument(data: {
  clientId: string;
  type: DocumentType;
  name?: string;
}): Promise<ApiResponse<Document>> {
  return post('/documents/generate', data);
}

export async function generateAMLPackage(clientId: string): Promise<ApiResponse<Document>> {
  return post('/documents/generate-package', { clientId });
}

export async function uploadDocument(
  file: File,
  data: {
    clientId: string;
    type: string;
    name?: string;
    description?: string;
  }
): Promise<ApiResponse<Document>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clientId', data.clientId);
  formData.append('type', data.type);
  if (data.name) formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);

  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function verifyDocument(
  id: string,
  data: {
    status: DocumentStatus;
    notes?: string;
  }
): Promise<ApiResponse<Document>> {
  return put(`/documents/${id}/verify`, data);
}

export async function downloadDocument(id: string): Promise<Blob> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/documents/${id}/download`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });
  if (!response.ok) throw new Error('Download failed');
  return response.blob();
}

export async function deleteDocument(id: string): Promise<ApiResponse<void>> {
  return del(`/documents/${id}`);
}

export async function getDocumentStats(): Promise<ApiResponse<DocumentStats>> {
  return get('/documents/stats');
}
