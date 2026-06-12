import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService, UserPreferences } from '../services/auth.service';
import { OrderService } from '../services/order.service';
import { ProfileService, Address } from '../services/profile.service';
import { PROVINCIAS_ESPANA } from '../shared/provincias';

@Component({
  selector: 'app-perfil',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
  encapsulation: ViewEncapsulation.None,
})
export class Perfil implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly profileService = inject(ProfileService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiUrl = 'http://localhost:8000/api/users/me/';

  protected loading = false;
  protected accessDenied = false;
  protected editing = false;
  protected saving = false;
  protected successMessage = '';
  protected errorMessage = '';
  protected activeSection = 'Mi Perfil';
  protected orders: any[] = [];
  protected sales: any[] = [];
  protected loadingOrders = false;
  protected expandedItemId: number | string | null = null;

  protected subscriptions: any[] = [];
  protected loadingSubscriptions = false;
  protected creatingSubscription = false;
  protected showNewSubscriptionForm = false;

  // ── Addresses ──────────────────────────────────────────────
  protected addresses: Address[] = [];
  protected loadingAddresses = false;
  protected showAddressForm = false;
  protected editingAddressId: number | null = null;
  protected deletingAddressId: number | null = null;

  // ── Settings ───────────────────────────────────────────────
  protected preferences: UserPreferences = {
    theme: 'light',
    font_size: 'normal',
    notifications_enabled: true,
  };
  protected savingPreference = false;
  protected preferenceSaved = false;
  protected savingPassword = false;
  protected passwordSuccess = '';
  protected passwordError = '';
  protected savingAccountData = false;

  protected readonly sidebarItems = [
    'Mi Perfil',
    'Mis Pedidos',
    'Mis Suscripciones',
    'Direcciones',
    'Ajustes',
    'Cerrar Sesión',
  ];

  protected readonly provincias = PROVINCIAS_ESPANA;

  protected user: UserProfile = {
    id: '',
    nombre: 'Usuario EcoMarket',
    email: 'email@ejemplo.com',
    rol: 'cliente',
    telefono: '',
    direccion: '',
    provincia: '',
  };

  protected readonly profileForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.maxLength(20)]],
    direccion: ['', [Validators.maxLength(160)]],
    provincia: [''],
  });

  protected readonly subscriptionForm = this.fb.nonNullable.group({
    size: ['MEDIUM', [Validators.required]],
    frequency: ['WEEKLY', [Validators.required]],
    delivery_day: ['MONDAY', [Validators.required]],
  });

  protected readonly addressForm = this.fb.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(60)]],
    address_line: ['', [Validators.required, Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    provincia: ['', [Validators.required]],
    postal_code: ['', [Validators.required, Validators.maxLength(10)]],
    address_type: ['ENTREGA' as 'ENTREGA' | 'RECOGIDA'],
    is_default: [false],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    new_password: ['', [Validators.required, Validators.minLength(6)]],
    confirm_password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly accountForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
  });

  async ngOnInit(): Promise<void> {
    const session = this.authService.currentUser;

    if (!session) {
      this.accessDenied = true;
      this.loading = false;
      return;
    }

    this.user = {
      id: session.id,
      nombre: session.name || 'Usuario EcoMarket',
      email: session.email || 'email@ejemplo.com',
      rol: session.rol || 'cliente',
      telefono: '',
      direccion: '',
      provincia: session.provincia || '',
    };

    this.syncFormWithUser();
    this.syncAccountForm();
    this.loadUserDetails();
    this.loadPreferences();
  }

  protected get avatarInitials(): string {
    const parts = this.user.nombre
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'UE';
  }

  protected get roleLabel(): string {
    switch (this.user.rol) {
      case 'productor':
        return 'Cuenta de productor';
      case 'cliente':
        return 'Cuenta de cliente';
      default:
        return 'Cuenta EcoMarket';
    }
  }

  protected get displayPhone(): string {
    return this.user.telefono?.trim() || 'No especificado';
  }

  protected get displayAddress(): string {
    return this.user.direccion?.trim() || 'Añade una dirección principal';
  }

  protected beginEdit(): void {
    this.clearMessages();
    this.editing = true;
    this.syncFormWithUser();
  }

  protected cancelEdit(): void {
    this.editing = false;
    this.clearMessages();
    this.syncFormWithUser();
  }

  protected async saveProfile(): Promise<void> {
    this.clearMessages();

    if (this.profileForm.invalid || !this.user.id) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const payload = {
      nombre: this.profileForm.controls.nombre.value.trim(),
      email: this.profileForm.controls.email.value.trim(),
      telefono: this.profileForm.controls.telefono.value.trim(),
      direccion: this.profileForm.controls.direccion.value.trim(),
      provincia: this.profileForm.controls.provincia.value,
    };

    this.saving = true;

    try {
      const updatedUser = await firstValueFrom(
        this.http.patch<any>(this.apiUrl, {
          first_name: payload.nombre.split(' ')[0] || '',
          last_name: payload.nombre.split(' ').slice(1).join(' ') || '',
          email: payload.email,
          telefono: payload.telefono,
          direccion: payload.direccion,
          provincia: payload.provincia,
        }),
      );

      this.user = {
        ...this.user,
        nombre: updatedUser.first_name + ' ' + updatedUser.last_name,
        email: updatedUser.email,
        telefono: updatedUser.telefono,
        direccion: updatedUser.direccion,
        provincia: updatedUser.provincia,
      };

      this.authService.updateSession({
        name: this.user.nombre,
        email: this.user.email,
        provincia: this.user.provincia,
      });

      this.syncFormWithUser();
      this.syncAccountForm();
      this.editing = false;
      this.successMessage = 'Perfil actualizado correctamente.';
    } catch {
      this.errorMessage =
        'No se pudo guardar el perfil. Comprueba que el backend de Django esté funcionando.';
    } finally {
      this.saving = false;
    }
  }

  protected handleSidebarAction(item: string): void {
    this.clearMessages();
    this.expandedItemId = null;

    if (item === 'Cerrar Sesión') {
      this.authService.logout();
      this.accessDenied = true;
      this.editing = false;
      return;
    }

    if (item === 'Mi Perfil') {
      this.activeSection = 'Mi Perfil';
      this.editing = false;
      return;
    }

    if (item === 'Mis Pedidos') {
      this.activeSection = 'Mis Pedidos';
      this.editing = false;
      this.loadOrdersOrSales();
      return;
    }

    if (item === 'Mis Suscripciones') {
      this.activeSection = 'Mis Suscripciones';
      this.editing = false;
      this.loadSubscriptions();
      return;
    }

    if (item === 'Direcciones') {
      this.activeSection = 'Direcciones';
      this.editing = false;
      this.loadAddresses();
      return;
    }

    if (item === 'Ajustes') {
      this.activeSection = 'Ajustes';
      this.editing = false;
      this.syncAccountForm();
      this.passwordForm.reset();
      this.passwordSuccess = '';
      this.passwordError = '';
      return;
    }

    this.successMessage = `La sección "${item}" estará disponible en futuras versiones.`;
  }

  protected toggleExpandedItem(id: number | string): void {
    this.expandedItemId = this.expandedItemId === id ? null : id;
  }

  protected translateStatus(status: string): string {
    switch (status) {
      case 'PAID':
        return 'Pagado';
      case 'PENDING_PAYMENT':
        return 'Pendiente';
      case 'FAILED':
        return 'Fallido';
      default:
        return status;
    }
  }

  private loadSubscriptions(): void {
    this.loadingSubscriptions = true;
    this.orderService.getSubscriptions().subscribe({
      next: (data) => {
        this.subscriptions = data;
        this.loadingSubscriptions = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar las suscripciones.';
        this.loadingSubscriptions = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected async submitSubscription(): Promise<void> {
    this.clearMessages();
    if (this.subscriptionForm.invalid) return;

    this.creatingSubscription = true;
    try {
      const data = this.subscriptionForm.getRawValue();
      await firstValueFrom(this.orderService.createSubscription(data));
      this.successMessage = 'Suscripción creada correctamente. Te hemos enviado un email.';
      this.showNewSubscriptionForm = false;
      this.subscriptionForm.reset({ size: 'MEDIUM', frequency: 'WEEKLY', delivery_day: 'MONDAY' });
      this.loadSubscriptions();
    } catch {
      this.errorMessage = 'Error al crear la suscripción.';
    } finally {
      this.creatingSubscription = false;
      this.cdr.detectChanges();
    }
  }

  protected async updateSubscriptionStatus(subId: number, status: string): Promise<void> {
    this.clearMessages();
    try {
      await firstValueFrom(this.orderService.updateSubscriptionStatus(subId, status));
      this.successMessage = 'Suscripción actualizada correctamente.';
      this.loadSubscriptions();
    } catch {
      this.errorMessage = 'Error al actualizar la suscripción.';
      this.cdr.detectChanges();
    }
  }

  // ── Addresses ──────────────────────────────────────────────

  protected loadAddresses(): void {
    this.loadingAddresses = true;
    this.profileService.getAddresses().subscribe({
      next: (data) => {
        this.addresses = data;
        this.loadingAddresses = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar las direcciones.';
        this.loadingAddresses = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected openAddressForm(): void {
    this.editingAddressId = null;
    this.addressForm.reset({
      label: '',
      address_line: '',
      city: '',
      provincia: '',
      postal_code: '',
      address_type: 'ENTREGA',
      is_default: false,
    });
    this.showAddressForm = true;
  }

  protected editAddress(addr: Address): void {
    this.editingAddressId = addr.id!;
    this.addressForm.patchValue({
      label: addr.label,
      address_line: addr.address_line,
      city: addr.city,
      provincia: addr.provincia,
      postal_code: addr.postal_code,
      address_type: addr.address_type,
      is_default: addr.is_default,
    });
    this.showAddressForm = true;
  }

  protected cancelAddressForm(): void {
    this.showAddressForm = false;
    this.editingAddressId = null;
  }

  protected saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    const data = this.addressForm.getRawValue();

    if (this.editingAddressId) {
      this.profileService.updateAddress(this.editingAddressId, data).subscribe({
        next: () => {
          this.showAddressForm = false;
          this.editingAddressId = null;
          this.successMessage = 'Dirección actualizada correctamente.';
          this.loadAddresses();
        },
        error: () => {
          this.errorMessage = 'Error al actualizar la dirección.';
        },
      });
    } else {
      this.profileService.createAddress(data).subscribe({
        next: () => {
          this.showAddressForm = false;
          this.successMessage = 'Dirección añadida correctamente.';
          this.loadAddresses();
        },
        error: () => {
          this.errorMessage = 'Error al crear la dirección.';
        },
      });
    }
  }

  protected deleteAddress(id: number): void {
    this.deletingAddressId = id;
    // Small delay for animation
    setTimeout(() => {
      this.profileService.deleteAddress(id).subscribe({
        next: () => {
          this.addresses = this.addresses.filter((a) => a.id !== id);
          this.deletingAddressId = null;
          this.successMessage = 'Dirección eliminada.';
          this.cdr.detectChanges();
        },
        error: () => {
          this.deletingAddressId = null;
          this.errorMessage = 'Error al eliminar la dirección.';
          this.cdr.detectChanges();
        },
      });
    }, 350);
  }

  protected setDefaultAddress(id: number): void {
    this.profileService.updateAddress(id, { is_default: true }).subscribe({
      next: () => {
        this.loadAddresses();
        this.successMessage = 'Dirección predeterminada actualizada.';
      },
      error: () => {
        this.errorMessage = 'Error al actualizar la dirección predeterminada.';
      },
    });
  }

  // ── Settings — Account Data ────────────────────────────────

  protected saveAccountData(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.clearMessages();
    this.savingAccountData = true;

    const nombre = this.accountForm.controls.nombre.value.trim();
    const email = this.accountForm.controls.email.value.trim();

    this.http
      .patch<any>(this.apiUrl, {
        first_name: nombre.split(' ')[0] || '',
        last_name: nombre.split(' ').slice(1).join(' ') || '',
        email: email,
      })
      .subscribe({
        next: (updatedUser) => {
          this.user = {
            ...this.user,
            nombre: (updatedUser.first_name + ' ' + updatedUser.last_name).trim(),
            email: updatedUser.email,
          };
          this.authService.updateSession({
            name: this.user.nombre,
            email: this.user.email,
          });
          this.syncFormWithUser();
          this.savingAccountData = false;
          this.successMessage = 'Datos de cuenta actualizados correctamente.';
          this.cdr.detectChanges();
        },
        error: () => {
          this.savingAccountData = false;
          this.errorMessage = 'Error al actualizar los datos de la cuenta.';
          this.cdr.detectChanges();
        },
      });
  }

  // ── Settings — Password ────────────────────────────────────

  protected changePassword(): void {
    this.passwordSuccess = '';
    this.passwordError = '';

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const newPwd = this.passwordForm.controls.new_password.value;
    const confirmPwd = this.passwordForm.controls.confirm_password.value;

    if (newPwd !== confirmPwd) {
      this.passwordError = 'Las contraseñas no coinciden.';
      return;
    }

    this.savingPassword = true;
    this.profileService.changePassword(newPwd, confirmPwd).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordSuccess = 'Contraseña actualizada correctamente.';
        this.passwordForm.reset();
        this.cdr.detectChanges();
      },
      error: () => {
        this.savingPassword = false;
        this.passwordError = 'Error al cambiar la contraseña.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Settings — Preferences ─────────────────────────────────

  protected loadPreferences(): void {
    this.profileService.getPreferences().subscribe({
      next: (prefs) => {
        this.preferences = prefs;
        this.authService.savePreferencesLocally(prefs);
        this.cdr.detectChanges();
      },
      error: () => {
        // Use defaults; non-critical
      },
    });
  }

  protected toggleTheme(): void {
    const newTheme = this.preferences.theme === 'light' ? 'dark' : 'light';
    this.updatePreference('theme', newTheme);
  }

  protected setFontSize(size: 'normal' | 'large' | 'x-large'): void {
    this.updatePreference('font_size', size);
  }

  protected toggleNotifications(): void {
    this.updatePreference('notifications_enabled', !this.preferences.notifications_enabled);
  }

  private updatePreference(key: string, value: any): void {
    this.savingPreference = true;
    this.preferenceSaved = false;

    const payload: any = {};
    payload[key] = value;

    this.profileService.updatePreferences(payload).subscribe({
      next: (updated) => {
        this.preferences = updated;
        this.authService.savePreferencesLocally(updated);
        this.savingPreference = false;
        this.preferenceSaved = true;
        this.cdr.detectChanges();

        // Hide saved indicator after a moment
        setTimeout(() => {
          this.preferenceSaved = false;
          this.cdr.detectChanges();
        }, 1500);
      },
      error: () => {
        this.savingPreference = false;
        this.errorMessage = 'Error al guardar la preferencia.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Private helpers ────────────────────────────────────────

  private loadOrdersOrSales(): void {
    this.loadingOrders = true;
    if (this.user.rol === 'productor') {
      this.orderService.getProducerSales().subscribe({
        next: (data) => {
          this.sales = data;
          this.loadingOrders = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'No se pudieron cargar las ventas.';
          this.loadingOrders = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.orderService.getMyOrders().subscribe({
        next: (data) => {
          this.orders = data;
          this.loadingOrders = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'No se pudieron cargar los pedidos.';
          this.loadingOrders = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  private loadUserDetails(): void {
    this.clearMessages();

    this.http.get<any>(this.apiUrl).subscribe({
      next: (remoteUser) => {
        this.user = {
          ...this.user,
          nombre: remoteUser.first_name
            ? remoteUser.first_name + ' ' + remoteUser.last_name
            : remoteUser.username,
          email: remoteUser.email,
          rol: remoteUser.rol,
          telefono: remoteUser.telefono || '',
          direccion: remoteUser.direccion || '',
          provincia: remoteUser.provincia || '',
        };
        this.syncFormWithUser();
        this.syncAccountForm();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage =
          'No se pudieron cargar los detalles completos del perfil. Se muestran los datos de la sesion local.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private syncFormWithUser(): void {
    this.profileForm.reset({
      nombre: this.user.nombre || '',
      email: this.user.email || '',
      telefono: this.user.telefono || '',
      direccion: this.user.direccion || '',
      provincia: this.user.provincia || '',
    });
  }

  private syncAccountForm(): void {
    this.accountForm.reset({
      nombre: this.user.nombre || '',
      email: this.user.email || '',
    });
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}

interface Session {
  id: number | string;
  name: string;
  email?: string;
  rol?: string;
}

interface UserProfile {
  id: number | string;
  nombre: string;
  email: string;
  rol: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
}
