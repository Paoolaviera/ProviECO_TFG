import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { CartService } from '../services/cart.service';

// Usamos la misma estructura del catálogo, pero le añadimos una descripción
export interface Producto {
  id: number;
  nombre: string;
  origen: string;
  productor: string;
  precio: number;
  unidad: string;
  disponibilidad: number;
  imagenUrl: string;
  tieneEcoSello: boolean;
  descripcion?: string;
  certificadoUrl?: string;
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
    this.http.get<any>(`http://localhost:8000/api/productos/${id}/`).subscribe({
      next: (item) => {
        this.producto = {
          id: item.id,
          nombre: item.name,
          origen: item.origin,
          productor: item.ownerName || 'Productor Anónimo',
          precio: parseFloat(item.price),
          unidad: item.unit,
          disponibilidad: item.quantity,
          imagenUrl: item.image_url || item.image_url_legacy || 'assets/images/placeholder.png',
          tieneEcoSello: item.verification_status === 'VERIFICADO',
          descripcion: item.description || '',
          certificadoUrl: item.certificate_url || ''
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
