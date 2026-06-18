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
  qr_url: string | null;
  productor: string;
  order_id?: number | null;
  fecha_entrega_prevista?: string | null;
  centro_destinatario?: string | null;
  estado_suministro?: string | null;
  respuesta_productor?: string | null;
  frecuencia?: string | null;
  tipo_pedido?: string | null;
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

    const orderId = this.route.snapshot.queryParamMap.get('order_id');
    let apiUrl = `/api/productos/${id}/trazabilidad/`;
    if (orderId) {
      apiUrl += `?order_id=${orderId}`;
    }

    console.log('URL API TRAZABILIDAD:', apiUrl);

    this.http.get<any>(apiUrl).subscribe({
      next: (data) => {
        console.log('Datos recibidos:', data);

        this.producto = {
          id: data.id,
          nombre: data.nombre || data.name || 'Producto sin nombre',
          origen: data.origen || data.origin || 'Provincia no especificada',
          lote: data.lote ?? null,
          finca_origen: data.finca_origen ?? null,
          fecha_cosecha: data.fecha_cosecha ?? null,
          certificado: data.certificado || data.certificate_url || null,
          qr_url: data.qr_url || null,
          productor: data.productor || data.ownerName || 'Productor no especificado',
          order_id: data.order_id ?? null,
          fecha_entrega_prevista: data.fecha_entrega_prevista ?? null,
          centro_destinatario: data.centro_destinatario ?? null,
          estado_suministro: data.estado_suministro ?? null,
          respuesta_productor: data.respuesta_productor ?? null,
          frecuencia: data.frecuencia ?? null,
          tipo_pedido: data.tipo_pedido ?? null,
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

  protected getTimelineSteps(): { title: string; desc: string; completed: boolean; current: boolean }[] {
    if (!this.producto || !this.producto.estado_suministro) return [];

    const status = this.producto.estado_suministro;
    const isCancelled = status === 'CANCELADO';

    const steps = [
      {
        title: 'Planificación Registrada',
        desc: 'El centro solicitó el suministro planificado.',
        completed: true,
        current: status === 'PENDIENTE'
      },
      {
        title: 'Aceptado por Productor',
        desc: this.producto.respuesta_productor 
          ? `Confirmado. Nota: "${this.producto.respuesta_productor}"`
          : 'El productor local validó la disponibilidad y reservó la cosecha.',
        completed: ['ACEPTADO', 'EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO'].includes(status),
        current: status === 'ACEPTADO'
      },
      {
        title: 'En Preparación',
        desc: 'Lavado, calibrado y empaquetado ecológico.',
        completed: ['EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO'].includes(status),
        current: status === 'EN_PREPARACION'
      },
      {
        title: 'En Reparto',
        desc: 'Transporte a temperatura controlada (suministro local).',
        completed: ['EN_REPARTO', 'ENTREGADO'].includes(status),
        current: status === 'EN_REPARTO'
      },
      {
        title: 'Entregado en Destino',
        desc: 'Cargado en las cocinas del centro de restauración.',
        completed: status === 'ENTREGADO',
        current: status === 'ENTREGADO'
      }
    ];

    if (isCancelled) {
      steps.push({
        title: 'Pedido Cancelado',
        desc: this.producto.respuesta_productor 
          ? `Cancelación. Motivo: "${this.producto.respuesta_productor}"`
          : 'Suministro cancelado por motivos logísticos o de cultivo.',
        completed: true,
        current: true
      });
    }

    return steps;
  }
}
