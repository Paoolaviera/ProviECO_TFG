import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface TrazabilidadProducto {
  id: number;
  nombre: string;
  origen: string;
  lote: string | null;
  finca_origen: string | null;
  fecha_cosecha: string | null;
  certificado: string | null;
  productor: string;
}

@Component({
  selector: 'app-trazabilidad',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './trazabilidad.html',
  styleUrl: './trazabilidad.css',
})
export class TrazabilidadComponent implements OnInit {
  producto: TrazabilidadProducto | null = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    console.log('ENTRANDO EN TRAZABILIDAD COMPONENT');

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.producto = null;
      this.error = 'Producto no válido.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    const apiUrl = `/api/productos/${id}/trazabilidad/`;

    console.log('URL API TRAZABILIDAD:', apiUrl);

    this.http.get<any>(apiUrl).subscribe({
      next: (data) => {
        console.log('Datos recibidos:', data);

        this.producto = {
          id: data.id,
          nombre: data.nombre || data.name || 'Producto sin nombre',
          origen: data.origen || data.origin || 'Origen no especificado',
          lote: data.lote ?? null,
          finca_origen: data.finca_origen ?? null,
          fecha_cosecha: data.fecha_cosecha ?? null,
          certificado: data.certificado || data.certificate_url || null,
          productor: data.productor || data.ownerName || 'Productor no especificado',
        };

        this.error = '';
        this.loading = false;

        console.log('Producto preparado para mostrar:', this.producto);
        console.log('Loading:', this.loading);

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando trazabilidad:', error);

        this.producto = null;
        this.error = 'No se pudo cargar la trazabilidad del producto.';
        this.loading = false;

        this.cdr.detectChanges();
      },
    });
  }
}
