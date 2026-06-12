import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './contacto.html',
  styleUrl: './contacto.css',
})
export class Contacto {
  contactoForm = new FormGroup({
    nombre: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    motivo: new FormControl('Información general'),
    mensaje: new FormControl('', Validators.required),
  });

  selectedFile: File | null = null;

  successMessage = '';
  errorMessage = '';
  submitting = false;

  constructor(private http: HttpClient) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onSubmit() {
    if (this.contactoForm.valid) {
      this.submitting = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = new FormData();

      formData.append('nombre', this.contactoForm.value.nombre || '');
      formData.append('email', this.contactoForm.value.email || '');
      formData.append('motivo', this.contactoForm.value.motivo || '');
      formData.append('mensaje', this.contactoForm.value.mensaje || '');

      if (this.selectedFile) {
        formData.append('certificado', this.selectedFile);
      }

      this.http.post('http://localhost:8000/api/users/contact/', formData).subscribe({
        next: () => {
          this.submitting = false;
          this.successMessage =
            '¡Formulario enviado correctamente! Nos pondremos en contacto contigo pronto.';

          this.contactoForm.reset({ motivo: 'Información general' });
          this.selectedFile = null;

          setTimeout(() => {
            this.successMessage = '';
          }, 4000);
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage =
            err.error?.email?.[0] ||
            err.error?.non_field_errors?.[0] ||
            'Hubo un error al enviar el mensaje. Por favor, intentalo mas tarde.';
          console.error(err);
        },
      });
    }
  }
}
