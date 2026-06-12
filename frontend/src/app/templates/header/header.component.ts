import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnInit {
  isMenuOpen = false;

  cartItems: CartItem[] = [];
  cartCount = 0;
  cartTotal = 0;
  isCartDrawerOpen = false;
  bumpCart = false;

  constructor(
    private cartService: CartService,
    public authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.cartService.cart$.subscribe((items) => {
      this.cartItems = items;
      this.cartCount = this.cartService.getCartCount();
      this.cartTotal = this.cartService.getCartTotal();

      if (this.cartCount > 0) {
        this.triggerCartBump();
      }

      // Forzar actualización de la vista para reflejar el cambio inmediatamente
      this.cdr.detectChanges();
    });
  }

  toggleCartDrawer(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    this.isCartDrawerOpen = !this.isCartDrawerOpen;
    if (this.isCartDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }

  updateQuantity(productoId: number, cantidad: number) {
    this.cartService.updateQuantity(productoId, cantidad);
  }

  async removeItem(item: CartItem): Promise<void> {
    const productName = item.producto?.nombre || 'este producto';

    const confirmed = window.confirm(
      `Vas a eliminar "${productName}" del carrito.\n\n¿Seguro que deseas continuar?`,
    );

    if (!confirmed) {
      return;
    }

    if (!item.producto?.id) {
      return;
    }

    await this.cartService.removeFromCart(item.producto.id);
  }

  triggerCartBump() {
    this.bumpCart = true;
    setTimeout(() => {
      this.bumpCart = false;
    }, 300);
  }

  irAConfirmarPedido() {
    this.isCartDrawerOpen = false;
    document.body.style.overflow = 'auto';
    this.router.navigate(['/confirmar-pedido']);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
