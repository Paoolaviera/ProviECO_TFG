import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CartService } from '../services/cart.service';
import { ApiProduct, ProductService } from '../services/product.service';
import { AuthService } from '../services/auth.service';
import { PROVINCIAS_ESPANA } from '../shared/provincias';
import { Review, ReviewService } from '../services/review.service';

export interface Producto {
  id: number;
  nombre: string;
  origen: string;
  productor: string;
  ownerId?: number;
  categoria?: string;
  precio: number;
  unidad: string;
  disponibilidad: number;
  imagenUrl: string;
  tieneEcoSello: boolean;
  descripcion?: string;
  certificadoUrl?: string;
  qrUrl?: string;
  lote?: string;
  fechaCosecha?: string;
  fincaOrigen?: string;

  // HU16 - Reseñas
  averageRating?: number;
  reviewsCount?: number;
  temporada?: string;
  fechaDisponibleDesde?: string;
  fechaDisponibleHasta?: string;
  permiteReservaFutura?: boolean;
  activo?: boolean;
}

import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  productos: Producto[] = [];
  selectedProducto: Producto | null = null;
  loading = true;
  selectedCategoria = 'Todos';
  selectedProvincia = 'Todas';
  minPrecio: number | null = null;
  maxPrecio: number | null = null;
  cercaDeMiActivo = false;
  searchTerm = '';

  reviews: Review[] = [];
  newRating = 5;
  newComment = '';
  reviewMessage = '';
  reviewError = '';
  successMessage = '';

  readonly categoriasDisponibles = [
    'Todos',
    'Frutas',
    'Verduras',
    'Lacteos',
    'Huevos',
    'Miel',
    'Bebidas',
    'Conservas',
    'Otros',
  ];

  readonly provinciasDisponibles = ['Todas', ...PROVINCIAS_ESPANA];

  errorCertificado = false;
  animatingProductId: number | null = null;

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private reviewService: ReviewService,
    private ngZone: NgZone,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['success'] === 'compra') {
        this.successMessage = 'Compra realizada con éxito. Gracias por confiar en ProviECO.';
        
        // Remove query parameters from URL without reloading
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { success: null },
          queryParamsHandling: 'merge',
        });

        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 5000);
      }
    });

    this.productService.products$.subscribe((data: ApiProduct[]) => {
      this.productos = data.map((item: any) => ({
        id: item.id,
        nombre: item.name,
        origen: item.origin,
        productor: item.ownerName || 'Productor anonimo',
        ownerId: item.ownerId as number,
        categoria: (() => {
          const cat = String(item.categoria || '').trim();
          if (!cat || cat.toLowerCase() === 'otros') {
            const inferred = this.inferirCategoria(item);
            if (inferred !== 'Otros') {
              return inferred;
            }
          }
          return cat || 'Otros';
        })(),
        precio: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
        unidad: item.unit,
        disponibilidad: item.quantity,
        imagenUrl: (() => {
          const url = item.image_url || item.image_url_legacy || '';
          if (!url || url.includes('assets/products/')) {
            return this.productService.getImageForProduct(item.name, item.categoria || this.inferirCategoria(item));
          }
          return url;
        })(),
        tieneEcoSello: item.verification_status === 'VERIFICADO',
        descripcion: item.description || '',
        certificadoUrl: item.certificate_url,
        qrUrl: item.qr_url,
        lote: item.lote,
        fechaCosecha: item.fecha_cosecha,
        fincaOrigen: item.finca_origen,

        // HU16 - Reseñas
        averageRating: Number(item.average_rating || 0),
        reviewsCount: Number(item.reviews_count || 0),

        temporada: item.temporada || 'Todo el año',
        fechaDisponibleDesde: item.fecha_disponible_desde,
        fechaDisponibleHasta: item.fecha_disponible_hasta,
        permiteReservaFutura: !!item.permite_reserva_futura,
        activo: item.activo !== false,
      }));

      this.loading = false;
      this.cdr.detectChanges();
    });

    this.productService.refreshProducts();
  }

  get productosFiltrados(): Producto[] {
    return this.productos.filter((producto) => {
      if (producto.activo === false) return false;

      // Solo mostrar productos validados (VERIFICADO)
      if (!producto.tieneEcoSello) return false;

      const categoriaValida =
        this.selectedCategoria === 'Todos' || producto.categoria === this.selectedCategoria;

      const provinciaValida =
        this.selectedProvincia === 'Todas' || producto.origen === this.selectedProvincia;

      const minValido = this.minPrecio === null || producto.precio >= this.minPrecio;
      const maxValido = this.maxPrecio === null || producto.precio <= this.maxPrecio;

      let searchValido = true;
      if (this.searchTerm.trim() !== '') {
        const term = this.searchTerm.toLowerCase().trim();
        const textoBusqueda =
          `${producto.nombre} ${producto.productor} ${producto.descripcion || ''}`.toLowerCase();
        searchValido = textoBusqueda.includes(term);
      }

      return categoriaValida && provinciaValida && minValido && maxValido && searchValido;
    });
  }

  abrirModal(producto: Producto) {
    this.selectedProducto = producto;
    this.errorCertificado = false;

    this.reviews = [];
    this.newRating = 5;
    this.newComment = '';
    this.reviewMessage = '';
    this.reviewError = '';

    document.body.style.overflow = 'hidden';

    this.cdr.detectChanges();

    setTimeout(() => {
      this.cargarReviews(producto.id);
    }, 0);
  }

  cerrarModal() {
    this.selectedProducto = null;
    this.reviews = [];
    this.reviewMessage = '';
    this.reviewError = '';
    document.body.style.overflow = 'auto';
  }

  verPerfilProductor(ownerId?: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    if (!ownerId) return;

    if (!this.authService.currentUser) {
      alert('Debes iniciar sesión para ver el perfil del productor.');
      this.router.navigate(['/login']);
      return;
    }

    if (this.selectedProducto) {
      this.cerrarModal();
    }
    
    this.router.navigate(['/productor', ownerId]);
  }

  async cargarReviews(productId: number) {
    try {
      const reviews = await this.reviewService.getReviewsByProduct(productId);

      this.ngZone.run(() => {
        this.reviews = reviews;
        this.actualizarMediaLocal();
        this.cdr.detectChanges();
      });
    } catch (err) {
      console.error('Error cargando reseñas', err);

      this.ngZone.run(() => {
        this.reviews = [];
        this.cdr.detectChanges();
      });
    }
  }

  async enviarReview() {
    if (!this.selectedProducto) {
      return;
    }

    this.reviewMessage = '';
    this.reviewError = '';

    try {
      await this.reviewService.createReview(
        this.selectedProducto.id,
        Number(this.newRating),
        this.newComment,
      );

      this.reviewMessage = 'Reseña enviada correctamente.';
      this.newRating = 5;
      this.newComment = '';

      await this.cargarReviews(this.selectedProducto.id);
      this.productService.refreshProducts();
    } catch (err: any) {
      console.error('Error enviando reseña', err);

      if (err?.error?.detail) {
        this.reviewError = err.error.detail;
      } else if (err?.error?.non_field_errors) {
        this.reviewError = 'Ya has escrito una reseña para este producto.';
      } else {
        this.reviewError = 'No se pudo enviar la reseña.';
      }
    }

    this.cdr.detectChanges();
  }

  private actualizarMediaLocal() {
    if (!this.selectedProducto) {
      return;
    }

    this.selectedProducto.reviewsCount = this.reviews.length;

    if (this.reviews.length === 0) {
      this.selectedProducto.averageRating = 0;
    } else {
      const total = this.reviews.reduce((acc, review) => acc + Number(review.rating), 0);
      this.selectedProducto.averageRating = Math.round((total / this.reviews.length) * 10) / 10;
    }

    const productoLista = this.productos.find(
      (producto) => producto.id === this.selectedProducto?.id,
    );

    if (productoLista) {
      productoLista.reviewsCount = this.selectedProducto.reviewsCount;
      productoLista.averageRating = this.selectedProducto.averageRating;
    }
  }

  formatUnidadPrecio(unidad: string): string {
    if (!unidad) {
      return '';
    }

    return unidad.startsWith('EUR/') ? unidad.replace('EUR/', '€/') : `€/${unidad}`;
  }

  actualizarCategoria(categoria: string) {
    this.selectedCategoria = categoria;
  }

  actualizarProvincia(provincia: string) {
    this.selectedProvincia = provincia;
    this.cercaDeMiActivo = false;
  }

  actualizarMinPrecio(value: string) {
    this.minPrecio = value === '' ? null : Number(value);
  }

  actualizarMaxPrecio(value: string) {
    this.maxPrecio = value === '' ? null : Number(value);
  }

  actualizarBusqueda(value: string) {
    this.searchTerm = value;
  }

  limpiarFiltros() {
    this.selectedCategoria = 'Todos';
    this.selectedProvincia = 'Todas';
    this.minPrecio = null;
    this.maxPrecio = null;
    this.cercaDeMiActivo = false;
    this.searchTerm = '';
  }

  aplicarCercaDeMi() {
    const usuario = this.authService.currentUser;

    if (!usuario) {
      alert('Debes iniciar sesión para usar el filtro "Cerca de mí".');
      return;
    }

    if (!usuario.provincia) {
      alert(
        'Tu perfil no tiene una provincia configurada. Completa tu registro para usar esta función.',
      );
      return;
    }

    this.selectedProvincia = usuario.provincia;
    this.cercaDeMiActivo = true;
    this.cdr.detectChanges();
  }

  agregarAlCarrito(producto: Producto, cantidadInput: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const cantidad = parseInt(cantidadInput, 10) || 1;
    this.cartService.addToCart(producto, cantidad);

    this.animatingProductId = producto.id;

    setTimeout(() => {
      this.animatingProductId = null;
      if (this.selectedProducto?.id === producto.id) {
        this.cerrarModal();
      }
    }, 800);
  }

  abrirCertificado(url: string, event: Event) {
    event.preventDefault();
    this.errorCertificado = false;

    this.http.head(url, { observe: 'response' }).subscribe({
      next: () => {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
      error: (err) => {
        if (err.status === 404) {
          this.errorCertificado = true;
          this.cdr.detectChanges();
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      },
    });
  }

  private inferirCategoria(item: ApiProduct): string {
    const textoBase = `${item.name} ${item.description || ''}`.toLowerCase();

    if (
      this.contieneAlguna(textoBase, [
        'manzana',
        'pera',
        'platano',
        'banana',
        'naranja',
        'limon',
        'uva',
        'fruta',
        'fresa',
        'melon',
      ])
    ) {
      return 'Frutas';
    }

    if (
      this.contieneAlguna(textoBase, [
        'lechuga',
        'tomate',
        'pepino',
        'zanahoria',
        'papa',
        'cebolla',
        'col',
        'brocoli',
        'verdura',
        'calabacin',
      ])
    ) {
      return 'Verduras';
    }

    if (
      this.contieneAlguna(textoBase, ['queso', 'leche', 'yogur', 'yogurt', 'mantequilla', 'lacteo'])
    ) {
      return 'Lacteos';
    }

    if (this.contieneAlguna(textoBase, ['huevo', 'huevos'])) {
      return 'Huevos';
    }

    if (this.contieneAlguna(textoBase, ['miel'])) {
      return 'Miel';
    }

    if (
      this.contieneAlguna(textoBase, ['zumo', 'jugo', 'vino', 'bebida', 'infusion', 'cafe', 'te'])
    ) {
      return 'Bebidas';
    }

    if (this.contieneAlguna(textoBase, ['mermelada', 'conserva', 'mojo', 'salsa', 'compota'])) {
      return 'Conservas';
    }

    return 'Otros';
  }

  private contieneAlguna(texto: string, terminos: string[]): boolean {
    return terminos.some((termino) => texto.includes(termino));
  }
}
