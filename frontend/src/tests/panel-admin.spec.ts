import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PanelAdmin } from '../app/panel-admin/panel-admin';
import { AdminService } from '../app/services/admin.service';
import { AuthService } from '../app/services/auth.service';

class AuthServiceMock {
  currentUser = {
    id: 99,
    name: 'Admin',
    email: 'admin@ecomarket.test',
    rol: 'ADMIN',
  };

  get isAdmin() {
    return true;
  }
}

describe('PanelAdmin', () => {
  let fixture: ComponentFixture<PanelAdmin>;
  let adminService: any;

  beforeEach(async () => {
    adminService = {
      getUsers: vi.fn().mockReturnValue(of([
        {
          id: 1,
          username: 'cliente',
          email: 'cliente@ecomarket.test',
          first_name: 'Cliente',
          last_name: 'Eco',
          full_name: 'Cliente Eco',
          rol: 'CLIENTE',
          is_active: true,
          is_staff: false,
          is_superuser: false,
          date_joined: '2026-05-18T10:00:00Z',
          last_login: null,
        },
      ])),
      getProducts: vi.fn().mockReturnValue(of([])),
      getContacts: vi.fn().mockReturnValue(of([
        {
          id: 10,
          nombre: 'Cliente Eco',
          email: 'cliente@ecomarket.test',
          motivo: 'Quiero ser productor',
          mensaje: 'Quiero vender productos ecologicos.',
          created_at: '2026-05-18T11:00:00Z',
        },
      ])),
      getLogs: vi.fn().mockReturnValue(of([])),
      updateUserRole: vi.fn().mockReturnValue(of({
        id: 1,
        username: 'cliente',
        email: 'cliente@ecomarket.test',
        first_name: 'Cliente',
        last_name: 'Eco',
        full_name: 'Cliente Eco',
        rol: 'PRODUCTOR',
        is_active: true,
        is_staff: false,
        is_superuser: false,
        date_joined: '2026-05-18T10:00:00Z',
        last_login: null,
      })),
    };

    await TestBed.configureTestingModule({
      imports: [PanelAdmin],
      providers: [
        provideRouter([]),
        { provide: AdminService, useValue: adminService },
        { provide: AuthService, useClass: AuthServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelAdmin);
    fixture.detectChanges();
  });

  it('muestra el encabezado como Panel Administrador', () => {
    expect(fixture.nativeElement.textContent).toContain('Panel Administrador');
  });

  it('lista consultas y permite cambiar un cliente a productor', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.admin-tabs button')) as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.trim() === 'Consultas')?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cliente Eco');
    expect(fixture.nativeElement.textContent).toContain('Quiero ser productor');

    const promoteButton = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((button: any) => button.textContent?.trim() === 'Cambiar a productor') as HTMLButtonElement;
    promoteButton.click();
    fixture.detectChanges();

    expect(adminService.updateUserRole).toHaveBeenCalledWith(1, 'PRODUCTOR');
    expect(fixture.nativeElement.textContent).toContain('cliente@ecomarket.test ahora es productor.');
  });
});
