import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminActionLog, AdminContactMessage, AdminService, AdminUser } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { ApiProduct } from '../services/product.service';

type AdminTab = 'usuarios' | 'productos' | 'verificaciones' | 'consultas' | 'logs';

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-admin.html',
  styleUrl: './panel-admin.css',
})
export class PanelAdmin implements OnInit {
  protected activeTab: AdminTab = 'usuarios';
  protected loading = true;
  protected actionLoading = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected users: AdminUser[] = [];
  protected products: ApiProduct[] = [];
  protected contacts: AdminContactMessage[] = [];
  protected logs: AdminActionLog[] = [];
  protected currentUserId: number | string | null = null;

  protected readonly tabs: { id: AdminTab; label: string }[] = [
    { id: 'usuarios', label: 'Usuarios' },
    { id: 'productos', label: 'Productos' },
    { id: 'verificaciones', label: 'Verificaciones' },
    { id: 'consultas', label: 'Consultas' },
    { id: 'logs', label: 'Logs' },
  ];

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin) {
      this.router.navigate([this.authService.currentUser ? '/perfil' : '/login']);
      return;
    }

    this.currentUserId = this.authService.currentUser?.id ?? null;
    this.loadPanelData();
  }

  protected get pendingProducts(): ApiProduct[] {
    return this.products.filter((product) => product.verification_status === 'PENDIENTE');
  }

  protected get activeUsersCount(): number {
    return this.users.filter((user) => user.is_active).length;
  }

  protected get pendingProductsCount(): number {
    return this.pendingProducts.length;
  }

  protected setTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.clearMessages();
  }

  protected toggleUserStatus(user: AdminUser): void {
    this.clearMessages();
    this.actionLoading = true;

    this.adminService.updateUserStatus(user.id, !user.is_active).subscribe({
      next: (updatedUser) => {
        this.users = this.users.map((item) => item.id === updatedUser.id ? updatedUser : item);
        this.successMessage = updatedUser.is_active
          ? 'Cuenta activada correctamente.'
          : 'Cuenta desactivada correctamente.';
        this.reloadLogs();
        this.finishAction();
      },
      error: (error) => this.handleActionError(error, 'No se pudo actualizar la cuenta.'),
    });
  }

  protected deleteUser(user: AdminUser): void {
    const confirmed = window.confirm(`Vas a eliminar la cuenta de ${user.email}. Esta accion no se puede deshacer.`);

    if (!confirmed) {
      return;
    }

    this.clearMessages();
    this.actionLoading = true;

    this.adminService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter((item) => item.id !== user.id);
        this.successMessage = 'Cuenta eliminada correctamente.';
        this.reloadLogs();
        this.finishAction();
      },
      error: (error) => this.handleActionError(error, 'No se pudo eliminar la cuenta.'),
    });
  }

  protected promoteContactUser(contact: AdminContactMessage): void {
    const user = this.findUserByEmail(contact.email);

    if (!user) {
      this.errorMessage = 'No hay ninguna cuenta registrada con ese correo.';
      return;
    }

    this.clearMessages();
    this.actionLoading = true;

    this.adminService.updateUserRole(user.id, 'PRODUCTOR').subscribe({
      next: (updatedUser) => {
        this.users = this.users.map((item) => item.id === updatedUser.id ? updatedUser : item);
        this.successMessage = `${updatedUser.email} ahora es productor.`;
        this.reloadLogs();
        this.finishAction();
      },
      error: (error) => this.handleActionError(error, 'No se pudo cambiar el cliente a productor.'),
    });
  }

  protected updateVerification(product: ApiProduct, status: string): void {
    this.clearMessages();
    this.actionLoading = true;

    this.adminService.updateProductVerification(product.id, status).subscribe({
      next: (updatedProduct) => {
        this.products = this.products.map((item) => item.id === updatedProduct.id ? updatedProduct : item);
        this.successMessage = 'Estado de verificacion actualizado.';
        this.reloadLogs();
        this.finishAction();
      },
      error: (error) => this.handleActionError(error, 'No se pudo actualizar el producto.'),
    });
  }

  protected deleteProduct(product: ApiProduct): void {
    const confirmed = window.confirm(`Vas a eliminar "${product.name}". Esta accion no se puede deshacer.`);

    if (!confirmed) {
      return;
    }

    this.clearMessages();
    this.actionLoading = true;

    this.adminService.deleteProduct(product.id).subscribe({
      next: () => {
        this.products = this.products.filter((item) => item.id !== product.id);
        this.successMessage = 'Producto eliminado correctamente.';
        this.reloadLogs();
        this.finishAction();
      },
      error: (error) => this.handleActionError(error, 'No se pudo eliminar el producto.'),
    });
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'Sin registro';
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected formatMoney(value: number | string): string {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return `${value} EUR`;
    }

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(numericValue);
  }

  protected statusClass(status?: string): string {
    return `status-badge ${(status || 'PENDIENTE').toLowerCase()}`;
  }

  protected roleLabel(user: AdminUser): string {
    if (user.is_superuser || user.is_staff) {
      return 'ADMIN';
    }

    return user.rol;
  }

  protected findUserByEmail(email: string): AdminUser | undefined {
    return this.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  protected canPromoteContact(contact: AdminContactMessage): boolean {
    const user = this.findUserByEmail(contact.email);

    return contact.motivo === 'Quiero ser productor' && !!user && user.rol === 'CLIENTE';
  }

  protected isCurrentUser(user: AdminUser): boolean {
    return String(user.id) === String(this.currentUserId);
  }

  private loadPanelData(): void {
    this.loading = true;

    forkJoin({
      users: this.adminService.getUsers(),
      products: this.adminService.getProducts(),
      contacts: this.adminService.getContacts(),
      logs: this.adminService.getLogs(),
    }).subscribe({
      next: ({ users, products, contacts, logs }) => {
        this.users = users;
        this.products = products;
        this.contacts = contacts;
        this.logs = logs;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.handleActionError(error, 'No se pudo cargar el panel de administracion.');
      },
    });
  }

  private reloadLogs(): void {
    this.adminService.getLogs().subscribe({
      next: (logs) => {
        this.logs = logs;
        this.cdr.detectChanges();
      },
    });
  }

  private finishAction(): void {
    this.actionLoading = false;
    this.cdr.detectChanges();
  }

  private handleActionError(error: any, fallback: string): void {
    this.actionLoading = false;
    this.errorMessage = error.error?.detail || fallback;
    this.cdr.detectChanges();
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
