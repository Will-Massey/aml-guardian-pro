import { get } from './api';
import { ApiResponse, CHSearchResult, CHCompanyProfile } from '../types';

export async function searchCompanies(query: string): Promise<ApiResponse<CHSearchResult[]>> {
  return get('/ch/search', { params: { q: query } });
}

export async function getCompanyDetails(number: string): Promise<ApiResponse<any>> {
  return get(`/ch/company/${number}`);
}

export async function getCompanyOfficers(number: string): Promise<ApiResponse<any[]>> {
  return get(`/ch/company/${number}/officers`);
}

export async function getCompanyPSCs(number: string): Promise<ApiResponse<any[]>> {
  return get(`/ch/company/${number}/psc`);
}

export async function getFullCompanyProfile(number: string): Promise<ApiResponse<CHCompanyProfile>> {
  return get(`/ch/company/${number}/full`);
}
