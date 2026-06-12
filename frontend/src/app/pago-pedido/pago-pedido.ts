import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { OrderService } from '../services/order.service';
import { CartService } from '../services/cart.service';

@Component({
  selector: 'app-pago-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pago-pedido.html',
  styleUrl: './pago-pedido.css',
})
export class PagoPedidoComponent {
  orderId!: number;

  cardHolder = '';
  cardNumber = '';
  expiry = '';
  cvv = '';

  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private cartService: CartService,
  ) {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
  }

  pay(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const validationError = this.validatePaymentForm();

    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.loading = true;

    this.orderService
      .payOrder(this.orderId, {
        card_holder: this.cardHolder.trim(),
        card_number: this.cleanCardNumber(),
        expiry: this.expiry.trim(),
        cvv: this.cvv.trim(),
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = 'Compra realizada correctamente.';
          this.cartService.clearCartLocal();

          setTimeout(() => {
            this.router.navigate(['/catalogo']);
          }, 2000);
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.detail || 'El pago no se pudo completar.';
        },
      });
  }

  private validatePaymentForm(): string {
    const holder = this.cardHolder.trim();
    const card = this.cleanCardNumber();
    const expiry = this.expiry.trim();
    const cvv = this.cvv.trim();

    if (!holder) {
      return 'Debes introducir el nombre del titular de la tarjeta.';
    }

    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{3,}$/.test(holder)) {
      return 'El nombre del titular solo puede contener letras y espacios.';
    }

    if (!card) {
      return 'Debes introducir el número de tarjeta.';
    }

    if (!/^\d{16}$/.test(card)) {
      return 'El número de tarjeta debe tener exactamente 16 dígitos.';
    }

    if (!expiry) {
      return 'Debes introducir la fecha de caducidad.';
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      return 'La fecha de caducidad debe tener el formato MM/AA. Ejemplo: 12/28.';
    }

    if (this.isExpired(expiry)) {
      return 'La tarjeta está caducada.';
    }

    if (!cvv) {
      return 'Debes introducir el CVV.';
    }

    if (!/^\d{3}$/.test(cvv)) {
      return 'El CVV debe tener exactamente 3 dígitos.';
    }

    return '';
  }

  private cleanCardNumber(): string {
    return this.cardNumber.replace(/\s/g, '');
  }

  private isExpired(expiry: string): boolean {
    const [monthText, yearText] = expiry.split('/');

    const month = Number(monthText);
    const year = Number(`20${yearText}`);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return year < currentYear || (year === currentYear && month < currentMonth);
  }

  formatCardNumber(): void {
    const clean = this.cleanCardNumber().replace(/\D/g, '').slice(0, 16);

    this.cardNumber = clean.replace(/(.{4})/g, '$1 ').trim();
  }

  formatExpiry(): void {
    let clean = this.expiry.replace(/\D/g, '').slice(0, 4);

    if (clean.length >= 3) {
      clean = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    }

    this.expiry = clean;
  }

  formatCvv(): void {
    this.cvv = this.cvv.replace(/\D/g, '').slice(0, 3);
  }
}
