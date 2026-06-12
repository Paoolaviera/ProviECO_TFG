import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap, Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface SessionData {
  id: number | string;
  name: string;
  email: string;
  rol: string;
  provincia?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  font_size: 'normal' | 'large' | 'x-large';
  notifications_enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api/users';
  private sessionSubject = new BehaviorSubject<SessionData | null>(this.getSessionFromStorage());
  public session$ = this.sessionSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Apply saved preferences on service init (page reload)
    this.applyStoredPreferences();
  }

  private getSessionFromStorage(): SessionData | null {
    try {
      const data = localStorage.getItem('ecomarket_session');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  get currentUser(): SessionData | null {
    return this.sessionSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('ecomarket_token');
  }

  get isAdmin(): boolean {
    const user = this.currentUser;
    return !!user && (user.rol === 'ADMIN' || !!user.is_staff || !!user.is_superuser);
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login/`, credentials).pipe(
      tap(response => {
        if (response.access && response.user) {
          localStorage.setItem('ecomarket_token', response.access);
          localStorage.setItem('ecomarket_session', JSON.stringify(response.user));
          this.sessionSubject.next(response.user);

          // Save and apply preferences from login response
          if (response.preferences) {
            localStorage.setItem('ecomarket_preferences', JSON.stringify(response.preferences));
            this.applyPreferences(response.preferences);
          }
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register/`, userData);
  }

  logout(): void {
    localStorage.removeItem('ecomarket_token');
    localStorage.removeItem('ecomarket_session');
    localStorage.removeItem('ecomarket_preferences');
    this.sessionSubject.next(null);
    this.clearPreferences();
    this.router.navigate(['/login']);
  }

  updateSession(newData: Partial<SessionData>): void {
    const currentSession = this.currentUser;
    if (currentSession) {
      const updatedSession = { ...currentSession, ...newData };
      localStorage.setItem('ecomarket_session', JSON.stringify(updatedSession));
      this.sessionSubject.next(updatedSession);
    }
  }

  /**
   * Limpia la sesión almacenada sin redirigir al login.
   * Se usa al arrancar la app para garantizar un inicio limpio.
   */
  silentLogout(): void {
    localStorage.removeItem('ecomarket_token');
    localStorage.removeItem('ecomarket_session');
    localStorage.removeItem('ecomarket_preferences');
    this.sessionSubject.next(null);
    this.clearPreferences();
  }

  // ── Preferences management ─────────────────────────────────

  applyPreferences(prefs: UserPreferences): void {
    // Theme
    if (prefs.theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    }

    // Font size
    document.body.classList.remove('font-large', 'font-x-large');
    if (prefs.font_size === 'large') {
      document.body.classList.add('font-large');
    } else if (prefs.font_size === 'x-large') {
      document.body.classList.add('font-x-large');
    }
  }

  savePreferencesLocally(prefs: UserPreferences): void {
    localStorage.setItem('ecomarket_preferences', JSON.stringify(prefs));
    this.applyPreferences(prefs);
  }

  private applyStoredPreferences(): void {
    try {
      const stored = localStorage.getItem('ecomarket_preferences');
      if (stored) {
        const prefs: UserPreferences = JSON.parse(stored);
        this.applyPreferences(prefs);
      }
    } catch {
      // Ignore parse errors
    }
  }

  private clearPreferences(): void {
    document.body.classList.remove('dark-mode', 'font-large', 'font-x-large');
    document.documentElement.classList.remove('dark-mode');
  }
}

