import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { PROVINCIAS_ESPANA } from '../shared/provincias';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class RegistroComponent {
  passwordVisible = false;
  passwordConfirmVisible = false;
  submitting = false;
  errorMessage = '';

  readonly provincias = PROVINCIAS_ESPANA;

  private fb = inject(FormBuilder);

  registerForm = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    passwordConfirm: ['', Validators.required],
    provincia: ['', Validators.required],
    terms: [false, Validators.requiredTrue]
  });

  constructor(private authService: AuthService, private router: Router) {}

  togglePassword(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  togglePasswordConfirm(): void {
    this.passwordConfirmVisible = !this.passwordConfirmVisible;
  }

  isInvalid(controlName: string): boolean {
    const control = this.registerForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.errorMessage = 'Revisa los campos marcados antes de continuar.';
      return;
    }

    const { password, passwordConfirm } = this.registerForm.value;
    if (password !== passwordConfirm) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      this.registerForm.get('passwordConfirm')?.setErrors({ mismatch: true });
      this.registerForm.get('passwordConfirm')?.markAsTouched();
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const userData = {
      ...this.registerForm.value,
      rol: 'CLIENTE'
    };

    this.authService.register(userData).subscribe({
      next: () => {
        // Automatically login after register
        this.authService.login({ email: userData.email, password: userData.password }).subscribe({
          next: () => {
            this.router.navigate(['/catalogo']);
          },
          error: () => {
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = 'Hubo un error al registrar tu cuenta. Puede que el email ya esté en uso.';
        console.error(err);
      }
    });
  }
}
