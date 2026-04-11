import { post, get, put } from './api';
import { 
  ApiResponse, 
  LoginCredentials, 
  RegisterData, 
  AuthTokens, 
  User 
} from '../types';

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export async function login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
  const response = await post<ApiResponse<AuthResponse>>('/auth/login', credentials);
  if (response.data?.tokens) {
    localStorage.setItem('accessToken', response.data.tokens.accessToken);
  }
  return response;
}

export async function register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
  const response = await post<ApiResponse<AuthResponse>>('/auth/register', data);
  if (response.data?.tokens) {
    localStorage.setItem('accessToken', response.data.tokens.accessToken);
  }
  return response;
}

export async function getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
  return get('/auth/me');
}

export async function updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
  return put('/auth/profile', data);
}

export async function changePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse<void>> {
  return post('/auth/change-password', data);
}

export function logout(): void {
  localStorage.removeItem('accessToken');
  window.location.href = '/login';
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('accessToken');
}

export function getToken(): string | null {
  return localStorage.getItem('accessToken');
}
