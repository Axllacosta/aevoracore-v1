import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { UserResponse } from '../models/user.model';
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly api = inject(ApiService);
  login(body: LoginRequest) {
    return this.api.post<LoginResponse, LoginRequest>('/auth/login', body);
  }
  me() {
    return this.api.get<UserResponse>('/auth/me');
  }
}
