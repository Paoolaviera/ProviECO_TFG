import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { HeaderComponent } from '../app/templates/header/header.component';
import { AuthService, SessionData } from '../app/services/auth.service';
import { CartItem, CartService } from '../app/services/cart.service';

class AuthServiceMock {
  private sessionSubject = new BehaviorSubject<SessionData | null>(null);
  session$ = this.sessionSubject.asObservable();

  setSession(session: SessionData | null) {
    this.sessionSubject.next(session);
  }
}

class CartServiceMock {
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  cart$ = this.cartSubject.asObservable();
  updateQuantity = vi.fn();
  removeFromCart = vi.fn().mockResolvedValue(undefined);

  setCart(items: CartItem[]) {
    this.cartSubject.next(items);
  }

  getCartCount() {
    return this.cartSubject.value.reduce((total, item) => total + item.cantidad, 0);
  }

  getCartTotal() {
    return this.cartSubject.value.reduce(
      (total, item) => total + Number(item.producto.precio) * item.cantidad,
      0,
    );
  }
}

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;
  let authService: AuthServiceMock;
  let cartService: CartServiceMock;

  beforeEach(async () => {
    authService = new AuthServiceMock();
    cartService = new CartServiceMock();

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: CartService, useValue: cartService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra Panel Administrador para sesiones admin', () => {
    authService.setSession({
      id: 1,
      name: 'Admin',
      email: 'admin@ecomarket.test',
      rol: 'ADMIN',
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const links = Array.from(host.querySelectorAll('a')).map((link) =>
      link.textContent?.trim(),
    );
    expect(links).toContain('Panel Administrador');
    expect(links).not.toContain('Admin');
  });

  it('muestra Panel Administrador para usuarios staff', () => {
    authService.setSession({
      id: 2,
      name: 'Staff',
      email: 'staff@ecomarket.test',
      rol: 'CLIENTE',
      is_staff: true,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Panel Administrador');
  });

  it('muestra Panel Productor para sesiones de productor y no el panel admin', () => {
    authService.setSession({
      id: 3,
      name: 'Productor',
      email: 'productor@ecomarket.test',
      rol: 'PRODUCTOR',
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Panel Productor');
    expect(text).not.toContain('Panel Administrador');
  });

  it('actualiza contador y total del carrito cuando cambian los items', () => {
    cartService.setCart([
      {
        producto: {
          id: 10,
          nombre: 'Tomates',
          origen: 'Las Palmas',
          productor: 'Finca Norte',
          precio: 2.5,
          unidad: 'kg',
          disponibilidad: 20,
          imagenUrl: 'assets/images/placeholder.png',
          tieneEcoSello: true,
        },
        cantidad: 3,
      },
      {
        producto: {
          id: 11,
          nombre: 'Miel',
          origen: 'Tenerife',
          productor: 'Abejas del Teide',
          precio: 6,
          unidad: 'tarro',
          disponibilidad: 8,
          imagenUrl: 'assets/images/placeholder.png',
          tieneEcoSello: true,
        },
        cantidad: 2,
      },
    ]);
    fixture.detectChanges();

    expect(component.cartCount).toBe(5);
    expect(component.cartTotal).toBe(19.5);
    expect(fixture.nativeElement.querySelector('.cart-count').textContent.trim()).toBe('5');
  });

  it('cierra el drawer y navega a confirmar pedido al finalizar compra', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.isCartDrawerOpen = true;
    document.body.style.overflow = 'hidden';

    component.irAConfirmarPedido();

    expect(component.isCartDrawerOpen).toBe(false);
    expect(document.body.style.overflow).toBe('auto');
    expect(navigateSpy).toHaveBeenCalledWith(['/confirmar-pedido']);
  });
});
