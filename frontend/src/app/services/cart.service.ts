import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Producto } from '../catalogo/catalogo';
import { AuthService } from './auth.service';

export interface CartItem {
  id?: number;
  producto: Producto;
  cantidad: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  private apiUrl = 'http://localhost:8000/api/cart/';

  public cart$ = this.cartSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
  ) {
    this.authService.session$.subscribe((session) => {
      if (session) {
        this.loadCart();
      } else {
        this.clearCartLocal();
      }
    });
  }

  async loadCart() {
    try {
      const items: any[] = await firstValueFrom(this.http.get<any[]>(this.apiUrl));

      console.log('CARRITO BACKEND:', items);

      this.cartItems = items.map((item) => {
        const producto =
          item.producto_detalles || item.product_details || item.producto || item.product;

        return {
          id: item.id,
          producto: {
            ...producto,
            id: producto?.id,
            nombre: producto?.nombre || producto?.name || producto?.titulo || '',
            precio: Number(producto?.precio || producto?.price || 0),
            unidad: producto?.unidad || producto?.unit || '',
            imagenUrl: producto?.imagenUrl || producto?.image_url || producto?.image_url_legacy || 'assets/images/placeholder.png',
          },
          cantidad: Number(item.cantidad || item.quantity || 1),
        };
      });

      this.cartSubject.next([...this.cartItems]);
    } catch (err) {
      console.error('Error loading cart', err);
    }
  }

  async addToCart(producto: Producto, cantidad: number) {
    if (!this.authService.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const existingItem = this.cartItems.find((item) => item.producto.id === producto.id);

    try {
      if (existingItem) {
        const newCantidad = existingItem.cantidad + cantidad;
        await firstValueFrom(
          this.http.patch(`${this.apiUrl}${existingItem.id}/`, { cantidad: newCantidad }),
        );
        existingItem.cantidad = newCantidad;
      } else {
        const newItem = await firstValueFrom(
          this.http.post<any>(this.apiUrl, { producto: producto.id, cantidad }),
        );
        this.cartItems.push({
          id: newItem.id,
          producto: producto,
          cantidad: newItem.cantidad,
        });
      }
      this.cartSubject.next([...this.cartItems]);
    } catch (err) {
      console.error('Error adding to cart', err);
    }
  }

  async removeFromCart(productoId: number) {
    const item = this.cartItems.find((item) => item.producto.id === productoId);
    if (item && item.id) {
      try {
        await firstValueFrom(this.http.delete(`${this.apiUrl}${item.id}/`));
        this.cartItems = this.cartItems.filter((i) => i.producto.id !== productoId);
        this.cartSubject.next([...this.cartItems]);
      } catch (err) {
        console.error('Error removing from cart', err);
      }
    }
  }

  async updateQuantity(productoId: number, cantidad: number) {
    const item = this.cartItems.find((item) => item.producto.id === productoId);
    if (item) {
      if (cantidad <= 0) {
        await this.removeFromCart(productoId);
      } else {
        try {
          await firstValueFrom(this.http.patch(`${this.apiUrl}${item.id}/`, { cantidad }));
          item.cantidad = cantidad;
          this.cartSubject.next([...this.cartItems]);
        } catch (err) {
          console.error('Error updating quantity', err);
        }
      }
    }
  }

  getCartTotal(): number {
    return this.cartItems.reduce((total, item) => {
      const precio = Number(item.producto?.precio || 0);
      const cantidad = Number(item.cantidad || 0);
      return total + precio * cantidad;
    }, 0);
  }

  getCartCount(): number {
    return this.cartItems.reduce((count, item) => count + item.cantidad, 0);
  }

  clearCartLocal() {
    this.cartItems = [];
    this.cartSubject.next([...this.cartItems]);
  }

  async generateRecipe(): Promise<{ recipe_html: string }> {
    return firstValueFrom(
      this.http.post<{ recipe_html: string }>(`${this.apiUrl}generate_recipe/`, {})
    );
  }
}
