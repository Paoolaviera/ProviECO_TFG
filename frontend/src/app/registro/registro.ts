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
    terms: [false, Validators.requiredTrue],
    rol: ['CLIENTE', Validators.required],
    telefono: [''],
    direccion: [''],
    nombre_centro: [''],
    tipo_centro: [''],
    persona_responsable: [''],
    observaciones_centro: ['']
  });

  selectedFile: File | null = null;

  constructor(private authService: AuthService, private router: Router) {
    this.registerForm.get('rol')?.valueChanges.subscribe(() => {
      this.onRolChange();
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onRolChange() {
    const rol = this.registerForm.get('rol')?.value;
    const fieldsToValidate = ['nombre_centro', 'tipo_centro', 'persona_responsable', 'telefono', 'direccion'];
    
    if (rol === 'RESTAURACION') {
      fieldsToValidate.forEach(field => {
        this.registerForm.get(field)?.setValidators([Validators.required]);
        this.registerForm.get(field)?.updateValueAndValidity();
      });
    } else {
      fieldsToValidate.forEach(field => {
        this.registerForm.get(field)?.clearValidators();
        this.registerForm.get(field)?.updateValueAndValidity();
      });
    }
  }

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

    const emailVal = this.registerForm.value.email;
    const passVal = this.registerForm.value.password;

    let payload: any;
    if (this.registerForm.get('rol')?.value === 'RESTAURACION') {
      const formData = new FormData();
      Object.keys(this.registerForm.value).forEach(key => {
        const val = (this.registerForm.value as any)[key];
        if (val !== null && val !== undefined) {
          formData.append(key, val);
        }
      });
      if (this.selectedFile) {
        formData.append('documento_centro', this.selectedFile);
      }
      payload = formData;
    } else {
      payload = { ...this.registerForm.value };
    }

    this.authService.register(payload).subscribe({
      next: () => {
        // Automatically login after register
        this.authService.login({ email: emailVal, password: passVal }).subscribe({
          next: () => {
            const userRol = this.authService.currentUser?.rol;
            if (userRol === 'RESTAURACION') {
              this.router.navigate(['/restauracion']);
            } else {
              this.router.navigate(['/catalogo']);
            }
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
