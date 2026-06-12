import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiProduct } from './product.service';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  rol: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface AdminActionLog {
  id: number;
  admin: number | null;
  admin_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
  created_at: string;
}

export interface AdminContactMessage {
  id: number;
  nombre: string;
  email: string;
  motivo: string;
  mensaje: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiUrl = 'http://localhost:8000/api/users/admin';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users/`);
  }

  updateUserStatus(userId: number, isActive: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.apiUrl}/users/${userId}/`, {
      is_active: isActive,
    });
  }

  updateUserRole(userId: number, rol: 'CLIENTE' | 'PRODUCTOR'): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.apiUrl}/users/${userId}/`, {
      rol,
    });
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/`);
  }

  getProducts(): Observable<ApiProduct[]> {
    return this.http.get<ApiProduct[]>(`${this.apiUrl}/products/`);
  }

  updateProductVerification(productId: number | string, verificationStatus: string): Observable<ApiProduct> {
    return this.http.patch<ApiProduct>(`${this.apiUrl}/products/${productId}/`, {
      verification_status: verificationStatus,
    });
  }

  deleteProduct(productId: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${productId}/`);
  }

  getLogs(): Observable<AdminActionLog[]> {
    return this.http.get<AdminActionLog[]>(`${this.apiUrl}/logs/`);
  }

  getContacts(): Observable<AdminContactMessage[]> {
    return this.http.get<AdminContactMessage[]>(`${this.apiUrl}/contacts/`);
  }
}
