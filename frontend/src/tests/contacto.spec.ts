import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { Contacto } from '../app/contacto/contacto';
import { environment } from '../environments/environment';

describe('Contacto', () => {
  let fixture: ComponentFixture<Contacto>;
  let component: Contacto;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contacto],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Contacto);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('envia el motivo de alta como productor al backend', () => {
    component.contactoForm.setValue({
      nombre: 'Cliente Eco',
      email: 'cliente@provieco.test',
      motivo: 'Quiero ser productor',
      mensaje: 'Quiero vender productos ecologicos.',
    });

    component.onSubmit();

    const request = httpMock.expectOne(`${environment.apiUrl}/api/users/contact/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.get('email')).toBe('cliente@provieco.test');
    expect(request.request.body.get('motivo')).toBe('Quiero ser productor');

    request.flush({ id: 1 });
    expect(component.successMessage).toContain('Formulario enviado correctamente');
  });

  it('muestra el error del backend si el email no existe para alta de productor', () => {
    component.contactoForm.setValue({
      nombre: 'Sin Cuenta',
      email: 'sin-cuenta@provieco.test',
      motivo: 'Quiero ser productor',
      mensaje: 'Quiero vender productos ecologicos.',
    });

    component.onSubmit();

    const request = httpMock.expectOne(`${environment.apiUrl}/api/users/contact/`);
    request.flush(
      { email: ['Para solicitar el alta como productor primero debes tener una cuenta registrada.'] },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(component.errorMessage).toContain('primero debes tener una cuenta registrada');
  });
});
