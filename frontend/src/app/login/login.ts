import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  email = '';
  password = '';
  passwordVisible = false;
  errorMessage = '';
  submitting = false;
  submitted = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit() {
    this.submitted = true;
    this.email = this.email.trim();

    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, rellena todos los campos.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.errorMessage = 'Introduce un email valido.';
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    this.authService.login({ email: this.email, password: this.password }).pipe(
      finalize(() => {
        // Garantiza reset del estado siempre, e informa a Angular del cambio.
        this.submitting = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (response) => {
        if (response.user && (response.user.rol === 'ADMIN' || response.user.is_staff || response.user.is_superuser)) {
          this.router.navigate(['/admin']);
        } else if (response.user && response.user.rol === 'PRODUCTOR') {
          this.router.navigate(['/panel-productor']);
        } else {
          this.router.navigate(['/perfil']);
        }
      },
      error: (err) => {
        this.errorMessage = 'Email o contraseña incorrectos.';
        console.error('Error al iniciar sesión:', err);
      }
    });
  }
}
