import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { CartService } from '../services/cart.service';
import { ProductService } from '../services/product.service';
import { environment } from '../../environments/environment';

// Usamos la misma estructura del catálogo, pero le añadimos una descripción
export interface Producto {
  id: number;
  nombre: string;
  origen: string;
  fincaOrigen?: string;
  productor: string;
  precio: number;
  unidad: string;
  disponibilidad: number;
  imagenUrl: string;
  tieneEcoSello: boolean;
  descripcion?: string;
  certificadoUrl?: string;
  categoria?: string;
  lote?: string;
  fechaCosecha?: string;
}

@Component({
  selector: 'app-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle.html',
  styleUrl: './detalle.css',
})
export class Detalle implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  producto: Producto | undefined;

  loading = true;

  constructor(private http: HttpClient, private cartService: CartService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    const idParam = this.route.snapshot.queryParamMap.get('id');
    const id = idParam ? Number(idParam) : 1;
    this.cargarProducto(id);
  }

  cargarProducto(id: number) {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/api/productos/${id}/`).subscribe({
      next: (item) => {
        const catVal = (() => {
          const cat = String(item.categoria || '').trim();
          if (!cat || cat.toLowerCase() === 'otros') {
            const nm = String(item.name || '').toLowerCase();
            if (nm.includes('tomate') || nm.includes('lechuga') || nm.includes('pepino') || nm.includes('zanahoria') || nm.includes('calabacín') || nm.includes('calabacin') || nm.includes('papa')) {
              return 'Verduras';
            } else if (nm.includes('manzana') || nm.includes('naranja') || nm.includes('platano') || nm.includes('fruta')) {
              return 'Frutas';
            } else if (nm.includes('queso') || nm.includes('leche') || nm.includes('lacteo') || nm.includes('lácteo')) {
              return 'Lacteos';
            } else if (nm.includes('huevo') || nm.includes('huevos')) {
              return 'Huevos';
            } else if (nm.includes('miel')) {
              return 'Miel';
            }
          }
          return cat || 'Otros';
        })();

        this.producto = {
          id: item.id,
          nombre: item.name,
          origen: item.origin,
          fincaOrigen: item.finca_origen,
          productor: item.ownerName || 'Productor Anónimo',
          precio: parseFloat(item.price),
          unidad: item.unit,
          disponibilidad: item.quantity,
          imagenUrl: (() => {
            const url = item.image_url || item.image_url_legacy || '';
            if (!url || url.includes('assets/products/')) {
              return this.productService.getImageForProduct(item.name, catVal);
            }
            return url;
          })(),
          tieneEcoSello: item.verification_status === 'VERIFICADO',
          descripcion: item.description || '',
          certificadoUrl: item.certificate_url || '',
          categoria: catVal,
          lote: item.lote || '',
          fechaCosecha: item.fecha_cosecha || ''
        };
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching product', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  agregarAlCarrito(cantidadInput: string) {
    if (this.producto) {
      const cantidad = parseInt(cantidadInput, 10) || 1;
      this.cartService.addToCart(this.producto, cantidad);
    }
  }
}
