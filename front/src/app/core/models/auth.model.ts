import type { UserResponse } from './user.model';

export interface RegisterRequest {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  dni?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  user: UserResponse;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
