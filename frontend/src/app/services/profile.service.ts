import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Address {
  id?: number;
  label: string;
  address_line: string;
  city: string;
  provincia: string;
  postal_code: string;
  address_type: 'ENTREGA' | 'RECOGIDA';
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  font_size: 'normal' | 'large' | 'x-large';
  notifications_enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly apiUrl = 'http://localhost:8000/api/users/me';

  constructor(private http: HttpClient) {}

  // ── Addresses ──────────────────────────────────────────────
  getAddresses(): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.apiUrl}/addresses/`);
  }

  createAddress(address: Partial<Address>): Observable<Address> {
    return this.http.post<Address>(`${this.apiUrl}/addresses/`, address);
  }

  updateAddress(id: number, address: Partial<Address>): Observable<Address> {
    return this.http.patch<Address>(`${this.apiUrl}/addresses/${id}/`, address);
  }

  deleteAddress(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/addresses/${id}/`);
  }

  // ── Preferences ────────────────────────────────────────────
  getPreferences(): Observable<UserPreferences> {
    return this.http.get<UserPreferences>(`${this.apiUrl}/preferences/`);
  }

  updatePreferences(prefs: Partial<UserPreferences>): Observable<UserPreferences> {
    return this.http.patch<UserPreferences>(`${this.apiUrl}/preferences/`, prefs);
  }

  // ── Password ───────────────────────────────────────────────
  changePassword(newPassword: string, confirmPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password/`, {
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
  }
}
