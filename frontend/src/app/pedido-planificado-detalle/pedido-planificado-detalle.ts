import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../services/order.service';

@Component({
  selector: 'app-pedido-planificado-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pedido-planificado-detalle.html',
  styleUrls: ['./pedido-planificado-detalle.css']
})
export class PedidoPlanificadoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  protected order: any = null;
  protected loading = true;
  protected error = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Identificador de pedido no válido.';
      this.loading = false;
      return;
    }

    this.orderService.getOrderDetail(id).subscribe({
      next: (data) => {
        this.order = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudo cargar el detalle del pedido planificado.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  protected getTimelineSteps(): { title: string; desc: string; completed: boolean; current: boolean }[] {
    if (!this.order) return [];

    const status = this.order.estado_suministro;
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
        desc: this.order.respuesta_productor 
          ? `Confirmado. Nota: "${this.order.respuesta_productor}"`
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
        desc: this.order.respuesta_productor 
          ? `Cancelación. Motivo: "${this.order.respuesta_productor}"`
          : 'Suministro cancelado por motivos logísticos o de cultivo.',
        completed: true,
        current: true
      });
    }

    return steps;
  }

  protected getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente de Aceptación';
      case 'ACEPTADO': return 'Aceptado (Reserva de producción)';
      case 'EN_PREPARACION': return 'En preparación';
      case 'EN_REPARTO': return 'En reparto';
      case 'ENTREGADO': return 'Entregado';
      case 'CANCELADO': return 'Cancelado';
      default: return status || 'Pendiente';
    }
  }

  protected getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'status-pending';
      case 'ACEPTADO':
      case 'EN_PREPARACION':
      case 'EN_REPARTO': return 'status-pending';
      case 'ENTREGADO': return 'status-verified';
      case 'CANCELADO': return 'status-rejected';
      default: return 'status-pending';
    }
  }

  protected formatPrice(price: number | string): string {
    const val = Number(price);
    return isNaN(val) ? String(price) : val.toFixed(2).replace('.', ',');
  }
}
