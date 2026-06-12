import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

import { CartItem, CartService } from '../services/cart.service';
import { OrderService } from '../services/order.service';
import { PROVINCIAS_ESPANA } from '../shared/provincias';
import { CIUDADES_POR_PROVINCIA } from '../shared/ciudades';

@Component({
  selector: 'app-confirmar-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './confirmar-pedido.html',
  styleUrl: './confirmar-pedido.css',
})
export class ConfirmarPedidoComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  total = 0;

  deliveryType: 'ADDRESS' | 'PICKUP' = 'ADDRESS';
  deliveryAddress = '';

  // Punto de recogida
  provincias = PROVINCIAS_ESPANA;
  ciudadesDisponibles: string[] = [];
  selectedProvince = '';
  selectedCity = '';

  errorMessage = '';
  loading = false;

  recipeHtml: SafeHtml | null = null;
  recipeLoading = false;
  recipeError = '';

  private cartSub?: Subscription;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) { }

  async ngOnInit(): Promise<void> {
    await this.cartService.loadCart();

    this.cartSub = this.cartService.cart$.subscribe((items: CartItem[]) => {
      this.cartItems = items;
      this.total = this.cartService.getCartTotal();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    if (this.cartSub) {
      this.cartSub.unsubscribe();
    }
  }

  async removeItem(item: CartItem): Promise<void> {
    console.log('Pulsado eliminar del carrito:', item);

    const productName = item.producto?.nombre || 'este producto';

    const confirmed = window.confirm(
      `Vas a eliminar "${productName}" del carrito.\n\n¿Seguro que deseas continuar?`,
    );

    if (!confirmed) {
      return;
    }

    if (!item.producto?.id) {
      this.errorMessage = 'No se pudo eliminar el producto porque no tiene identificador.';
      return;
    }

    await this.cartService.removeFromCart(item.producto.id);

    this.total = this.cartService.getCartTotal();
  }

  async updateQuantity(item: CartItem, cantidad: number): Promise<void> {
    if (!item.producto?.id) {
      this.errorMessage =
        'No se pudo actualizar la cantidad porque el producto no tiene identificador.';
      return;
    }

    const nuevaCantidad = Number(cantidad);

    if (nuevaCantidad <= 0) {
      await this.removeItem(item);
      return;
    }

    await this.cartService.updateQuantity(item.producto.id, nuevaCantidad);

    this.total = this.cartService.getCartTotal();
  }

  onProvinceChange(): void {
    this.selectedCity = '';
    this.deliveryAddress = '';
    if (this.selectedProvince) {
      this.ciudadesDisponibles = CIUDADES_POR_PROVINCIA[this.selectedProvince] || [];
    } else {
      this.ciudadesDisponibles = [];
    }
  }

  onCityChange(): void {
    if (this.selectedProvince && this.selectedCity) {
      this.deliveryAddress = `${this.selectedCity} (${this.selectedProvince})`;
    } else {
      this.deliveryAddress = '';
    }
  }

  confirmOrder(): void {
    this.errorMessage = '';

    if (!this.deliveryAddress.trim()) {
      this.errorMessage = 'Debes introducir una dirección o punto de recogida.';
      return;
    }

    if (this.cartItems.length === 0) {
      this.errorMessage = 'El carrito está vacío.';
      return;
    }

    this.loading = true;

    this.orderService
      .createOrder({
        delivery_type: this.deliveryType,
        delivery_address: this.deliveryAddress,
      })
      .subscribe({
        next: (order) => {
          this.loading = false;
          this.router.navigate(['/pago-pedido', order.id]);
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.detail || 'No se pudo confirmar el pedido.';
        },
      });
  }

  async onGenerateRecipe(): Promise<void> {
    this.recipeError = '';
    this.recipeHtml = null;
    this.recipeLoading = true;
    try {
      const response = await this.cartService.generateRecipe();
      this.recipeHtml = this.sanitizer.bypassSecurityTrustHtml(response.recipe_html);
    } catch (error: any) {
      console.error('Error al generar receta:', error);
      this.recipeError = 'Hubo un problema al contactar con el Chef virtual. Por favor, inténtalo de nuevo.';
    } finally {
      this.recipeLoading = false;
      this.cdr.detectChanges();
    }
  }
}
