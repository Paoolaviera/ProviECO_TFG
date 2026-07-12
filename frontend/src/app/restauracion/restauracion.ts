import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { ProductService, ApiProduct } from '../services/product.service';
import { OrderService } from '../services/order.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


interface BasketItem {
  product: ApiProduct;
  quantity: number;
}

@Component({
  selector: 'app-restauracion',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './restauracion.html',
  styleUrls: ['./restauracion.css']
})
export class RestauracionComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly Number = Number;
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  // User and validation state
  protected accessDenied = false;
  protected isValidated = false;
  protected loading = true;
  protected submitting = false;
  protected successMessage = '';
  protected errorMessage = '';

  // Tab navigation state
  protected activeTab: 'catalogo' | 'ecoboxes' | 'previsiones' = 'catalogo';

  // Products and filtering
  protected products: ApiProduct[] = [];
  protected searchTerm = '';
  protected selectedCategoria = 'Todos';
  protected soloReservaFutura = true; // Default to true for restoration

  // Categories list
  protected readonly categorias = [
    'Todos', 'Frutas', 'Verduras', 'Lacteos', 'Huevos', 'Miel', 'Bebidas', 'Conservas', 'Otros'
  ];

  // Basket for planned order (temporary planning)
  protected basket: BasketItem[] = [];
  protected fechaEntregaDeseada = '';
  protected observaciones = '';

  // Multiple EcoBoxes state
  protected ecoBoxes: any[] = [];
  protected loadingEcoBoxes = false;
  protected showEcoBoxFormModal = false;
  protected isEditingEcoBox = false;
  protected currentEcoBoxId: number | null = null;
  protected ecoBoxForm = {
    nombre: '',
    descripcion: '',
    numero_comensales: 100,
    frecuencia: 'SEMANAL',
    observaciones: ''
  };

  // Order from EcoBox modal state
  protected showOrderModal = false;
  protected selectedEcoBoxForOrder: any = null;
  protected orderForm = {
    fecha_entrega_deseada: '',
    mensaje_centro: ''
  };

  // Previous planned orders list
  protected plannedOrders: any[] = [];
  protected loadingOrders = true;

  // Selected product details modal
  protected selectedProducto: ApiProduct | null = null;

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (!user || (user.rol !== 'RESTAURACION' && !user.is_staff && !user.is_superuser)) {
      this.accessDenied = true;
      this.loading = false;
      return;
    }

    // Check center validation status initially
    this.isValidated = user.estado_validacion_centro === 'VALIDADO';

    // Fetch fresh user validation state from backend
    this.http.get<any>(`${environment.apiUrl}/users/me/`).subscribe({
      next: (remoteUser) => {
        this.isValidated = remoteUser.estado_validacion_centro === 'VALIDADO';
        this.authService.updateSession({
          estado_validacion_centro: remoteUser.estado_validacion_centro,
          observaciones_validacion_admin: remoteUser.observaciones_validacion_admin,
          nombre_centro: remoteUser.nombre_centro,
          tipo_centro: remoteUser.tipo_centro,
          persona_responsable: remoteUser.persona_responsable,
        });
      },
      error: (err) => {
        console.error('Error fetching fresh user validation state:', err);
      }
    });

    this.productService.products$.subscribe((allProducts) => {
      this.products = allProducts;
      this.loading = false;
    });

    this.productService.refreshProducts();
    this.loadPlannedOrders();
    this.loadEcoBoxes();
  }

  loadPlannedOrders(): void {
    this.loadingOrders = true;
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        this.plannedOrders = orders.filter((o) => o.tipo_pedido === 'PEDIDO_PLANIFICADO' || o.tipo_pedido === 'PLANIFICADO_RESTAURACION');
        this.loadingOrders = false;
      },
      error: (err) => {
        console.error('Error loading planned orders:', err);
        this.loadingOrders = false;
      }
    });
  }

  loadEcoBoxes(): void {
    this.loadingEcoBoxes = true;
    this.orderService.getEcoBoxes().subscribe({
      next: (data) => {
        this.ecoBoxes = data;
        this.loadingEcoBoxes = false;
      },
      error: (err) => {
        console.error('Error loading EcoBoxes:', err);
        this.loadingEcoBoxes = false;
      }
    });
  }

  // Filtered products
  protected get filteredProducts(): ApiProduct[] {
    return this.products.filter((p) => {
      if (p.activo === false) return false;

      // Solo mostrar productos validados (VERIFICADO)
      if (p.verification_status !== 'VERIFICADO') return false;

      // Category filter
      const matchesCategory = this.selectedCategoria === 'Todos' || p.categoria === this.selectedCategoria;

      // Future reserve filter
      const matchesReserva = !this.soloReservaFutura || p.permite_reserva_futura;

      // Search term filter
      const matchesSearch = p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                            (p.origin && p.origin.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
                            (p.ownerName && p.ownerName.toLowerCase().includes(this.searchTerm.toLowerCase()));

      return matchesCategory && matchesReserva && matchesSearch;
    });
  }

  // Add product to planned basket
  addToBasket(product: ApiProduct, quantityStr: string): void {
    const qty = parseInt(quantityStr, 10);
    if (isNaN(qty) || qty <= 0) {
      alert('Por favor, indica una cantidad válida.');
      return;
    }

    const existingIndex = this.basket.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      this.basket[existingIndex].quantity += qty;
    } else {
      this.basket.push({ product, quantity: qty });
    }
  }

  // Remove from basket
  removeFromBasket(productId: number): void {
    this.basket = this.basket.filter((item) => item.product.id !== productId);
  }

  // Calculate basket total
  get basketTotal(): number {
    return this.basket.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);
  }

  // Clear basket
  clearBasket(): void {
    this.basket = [];
  }

  // Submit planned order from temporary basket
  submitPlannedOrder(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.isValidated) {
      this.errorMessage = 'Su cuenta de restauración debe estar VALIDADA para realizar esta acción.';
      return;
    }

    if (this.basket.length === 0) {
      this.errorMessage = 'El cesto de planificación está vacío.';
      return;
    }

    if (!this.fechaEntregaDeseada) {
      this.errorMessage = 'Debes seleccionar una fecha de entrega deseada.';
      return;
    }

    this.submitting = true;

    const payload = {
      items: this.basket.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity
      })),
      fecha_entrega_deseada: this.fechaEntregaDeseada,
      observaciones: this.observaciones
    };

    this.orderService.createPlannedOrder(payload).subscribe({
      next: () => {
        this.successMessage = '¡Pedido planificado registrado con éxito! Pendiente de confirmación por el productor.';
        this.basket = [];
        this.fechaEntregaDeseada = '';
        this.observaciones = '';
        this.submitting = false;
        this.loadPlannedOrders();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err.error?.detail || 'Hubo un error al registrar el pedido planificado.';
        console.error(err);
      }
    });
  }

  // EcoBox Modal CRUD actions
  openCreateEcoBoxModal(): void {
    if (!this.isValidated) {
      alert('Su cuenta de restauración debe estar VALIDADA para crear plantillas EcoBox.');
      return;
    }
    this.isEditingEcoBox = false;
    this.currentEcoBoxId = null;
    this.ecoBoxForm = {
      nombre: '',
      descripcion: '',
      numero_comensales: 100,
      frecuencia: 'SEMANAL',
      observaciones: ''
    };
    this.showEcoBoxFormModal = true;
  }

  openEditEcoBoxModal(box: any): void {
    if (!this.isValidated) {
      alert('Su cuenta de restauración debe estar VALIDADA para editar plantillas EcoBox.');
      return;
    }
    this.isEditingEcoBox = true;
    this.currentEcoBoxId = box.id;
    this.ecoBoxForm = {
      nombre: box.nombre,
      descripcion: box.descripcion || '',
      numero_comensales: box.numero_comensales || 100,
      frecuencia: box.frecuencia || 'SEMANAL',
      observaciones: box.observaciones || ''
    };
    // Map items from EcoBox to basket for editing, or keep separate. 
    // It's clean to copy items to active basket so they can edit products using catalog!
    this.basket = box.items.map((item: any) => {
      const foundProduct = this.products.find(p => p.id === item.product);
      return {
        product: foundProduct || {
          id: item.product,
          name: item.product_name,
          price: item.precio_historico || 0,
          unit: 'unidades',
          categoria: 'Otros',
          permite_reserva_futura: true,
          activo: true
        } as ApiProduct,
        quantity: item.quantity
      };
    });
    this.showEcoBoxFormModal = true;
  }

  closeEcoBoxModal(): void {
    this.showEcoBoxFormModal = false;
  }

  saveEcoBox(): void {
    if (!this.isValidated) {
      alert('Su cuenta de restauración debe estar VALIDADA para guardar plantillas EcoBox.');
      return;
    }

    if (this.basket.length === 0) {
      alert('La EcoBox debe tener al menos un producto en la cesta.');
      return;
    }

    const payload = {
      ...this.ecoBoxForm,
      fecha_inicio: new Date().toISOString().split('T')[0],
      items: this.basket.map(item => ({
        producto: item.product.id,
        cantidad: item.quantity,
        unidad: item.product.unit || 'kg',
        observaciones: ''
      }))
    };

    console.log("Payload EcoBox enviado:", payload);

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const handleSuccess = (msg: string) => {
      this.successMessage = msg;
      this.showEcoBoxFormModal = false;
      this.basket = [];
      this.ecoBoxForm = {
        nombre: '',
        descripcion: '',
        numero_comensales: 100,
        frecuencia: 'SEMANAL',
        observaciones: ''
      };
      this.loadEcoBoxes();
      this.activeTab = 'ecoboxes';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleError = (err: any, defaultMsg: string) => {
      console.error("Error al guardar EcoBox:", err);
      if (err && err.error) {
        console.error("Respuesta backend:", err.error);
      }
      
      if (err && err.error && typeof err.error === 'object' && err.error !== null) {
        const details = Object.entries(err.error)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        this.errorMessage = `${defaultMsg} Detalles: ${details}`;
      } else if (err && err.error && err.error.detail) {
        this.errorMessage = `${defaultMsg} ${err.error.detail}`;
      } else {
        this.errorMessage = defaultMsg;
      }
    };

    if (this.isEditingEcoBox && this.currentEcoBoxId) {
      this.orderService.updateEcoBox(this.currentEcoBoxId, payload)
        .pipe(finalize(() => this.submitting = false))
        .subscribe({
          next: () => handleSuccess(`EcoBox "${this.ecoBoxForm.nombre}" actualizada con éxito.`),
          error: (err) => handleError(err, 'No se pudo actualizar la EcoBox.')
        });
    } else {
      this.orderService.createEcoBox(payload)
        .pipe(finalize(() => this.submitting = false))
        .subscribe({
          next: () => handleSuccess('EcoBox guardada correctamente'),
          error: (err) => handleError(err, 'No se pudo guardar la EcoBox.')
        });
    }
  }

  deleteEcoBox(id: number): void {
    if (!this.isValidated) {
      alert('Su cuenta de restauración debe estar VALIDADA para eliminar plantillas EcoBox.');
      return;
    }

    if (!confirm('¿Está seguro de que desea eliminar esta plantilla EcoBox?')) return;
    this.orderService.deleteEcoBox(id).subscribe({
      next: () => {
        this.successMessage = 'EcoBox eliminada con éxito.';
        this.loadEcoBoxes();
      },
      error: (err) => {
        this.errorMessage = 'No se pudo eliminar la EcoBox.';
        console.error(err);
      }
    });
  }

  // Order from EcoBox methods
  openOrderFromEcoBoxModal(box: any): void {
    if (!this.isValidated) {
      alert('Su cuenta de restauración debe estar VALIDADA para planificar pedidos.');
      return;
    }
    this.selectedEcoBoxForOrder = box;
    this.orderForm = {
      fecha_entrega_deseada: '',
      mensaje_centro: ''
    };
    this.showOrderModal = true;
  }

  closeOrderModal(): void {
    this.showOrderModal = false;
    this.selectedEcoBoxForOrder = null;
  }

  submitOrderFromEcoBox(): void {
    if (!this.selectedEcoBoxForOrder) return;
    if (!this.orderForm.fecha_entrega_deseada) {
      alert('Debe indicar la fecha de entrega deseada.');
      return;
    }

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.orderService.createOrderFromEcoBox(this.selectedEcoBoxForOrder.id, {
      fecha_entrega_deseada: this.orderForm.fecha_entrega_deseada,
      mensaje_centro: this.orderForm.mensaje_centro
    })
      .pipe(finalize(() => this.submitting = false))
      .subscribe({
        next: () => {
          this.successMessage = 'Pedido planificado generado correctamente';
          this.showOrderModal = false;
          this.selectedEcoBoxForOrder = null;
          this.orderForm = {
            fecha_entrega_deseada: '',
            mensaje_centro: ''
          };
          this.loadPlannedOrders();
          this.activeTab = 'previsiones';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err) => {
          console.error('Error al generar pedido planificado:', err);
          if (err && err.error) {
            console.error('Respuesta backend:', err.error);
          }
          
          if (err && err.error && typeof err.error === 'object' && err.error !== null) {
            const details = Object.entries(err.error)
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
              .join(' | ');
            this.errorMessage = `No se pudo generar el pedido planificado. Detalles: ${details}`;
          } else if (err && err.error && err.error.detail) {
            this.errorMessage = `No se pudo generar el pedido planificado: ${err.error.detail}`;
          } else {
            this.errorMessage = 'No se pudo generar el pedido planificado.';
          }
        }
      });
  }

  // Tab-3 Aggregated Needs (Forecasting)
  protected get aggregatedNeeds(): { product: any; totalQuantity: number; totalCost: number }[] {
    const map = new Map<number, { product: any; totalQuantity: number }>();
    this.ecoBoxes.forEach(box => {
      box.items.forEach((item: any) => {
        const prodId = item.product;
        const qty = Number(item.quantity);
        if (map.has(prodId)) {
          map.get(prodId)!.totalQuantity += qty;
        } else {
          const foundProd = this.products.find(p => p.id === prodId) || {
            name: item.product_name || `Producto #${prodId}`,
            price: item.precio_historico || 0,
            unit: 'unidades'
          };
          map.set(prodId, { product: foundProd, totalQuantity: qty });
        }
      });
    });
    return Array.from(map.values()).map(entry => ({
      product: entry.product,
      totalQuantity: entry.totalQuantity,
      totalCost: entry.totalQuantity * Number(entry.product.price || 0)
    }));
  }

  // Tab-3 Upcoming Deliveries
  protected get upcomingDeliveries(): any[] {
    const today = new Date();
    today.setHours(0,0,0,0);
    return this.plannedOrders.filter(order => {
      if (order.estado_suministro === 'CANCELADO' || order.estado_suministro === 'ENTREGADO') return false;
      if (!order.fecha_entrega_deseada) return false;
      const delDate = new Date(order.fecha_entrega_deseada);
      return delDate >= today;
    }).sort((a,b) => new Date(a.fecha_entrega_deseada).getTime() - new Date(b.fecha_entrega_deseada).getTime());
  }

  // View details modal
  openDetails(product: ApiProduct): void {
    this.selectedProducto = product;
  }

  closeDetails(): void {
    this.selectedProducto = null;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente de aceptación';
      case 'PARCIALMENTE_ACEPTADO': return 'Parcialmente aceptado';
      case 'CONFIRMADO': return 'Confirmado';
      case 'EN_PREPARACION': return 'En preparación';
      case 'EN_REPARTO': return 'En reparto';
      case 'ENTREGADO': return 'Entregado';
      case 'RECHAZADO': return 'Rechazado';
      case 'RECHAZADO_PARCIAL': return 'Rechazado parcialmente';
      case 'CANCELADO': return 'Cancelado';
      default: return status || 'Pendiente';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'status-pending';
      case 'PARCIALMENTE_ACEPTADO': return 'status-pending';
      case 'CONFIRMADO': return 'status-verified';
      case 'EN_PREPARACION':
      case 'EN_REPARTO': return 'status-pending'; // Yellow/Orange
      case 'ENTREGADO': return 'status-verified'; // Green
      case 'RECHAZADO':
      case 'RECHAZADO_PARCIAL':
      case 'CANCELADO': return 'status-rejected'; // Red
      default: return 'status-pending';
    }
  }

  getItemStatusLabel(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente';
      case 'ACEPTADO': return 'Aceptada';
      case 'RECHAZADO': return 'Rechazada';
      case 'EN_PREPARACION': return 'En preparación';
      case 'ENTREGADO': return 'Entregada';
      default: return status || 'Pendiente';
    }
  }

  getItemStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'status-pending';
      case 'ACEPTADO': return 'status-verified';
      case 'RECHAZADO': return 'status-rejected';
      case 'EN_PREPARACION': return 'status-pending';
      case 'ENTREGADO': return 'status-verified';
      default: return 'status-pending';
    }
  }

  getFutureDates(startDateStr: string, frecuencia: string): string[] {
    if (!startDateStr || !frecuencia || frecuencia.toUpperCase() === 'UNICO') return [];
    const dates: string[] = [];
    const start = new Date(startDateStr);
    const frec = frecuencia.toUpperCase();
    
    let current = new Date(start);
    for (let i = 1; i <= 3; i++) {
      if (frec === 'SEMANAL') {
        current.setDate(current.getDate() + 7);
      } else if (frec === 'QUINCENAL') {
        current.setDate(current.getDate() + 15);
      } else if (frec === 'MENSUAL') {
        current.setMonth(current.getMonth() + 1);
      } else {
        break;
      }
      dates.push(current.toISOString().split('T')[0]);
    }
    return dates;
  }

  get totalCosteEstimado(): number {
    return this.pedidosYEntregasPlanificadas.reduce((sum, item) => sum + (item.coste || 0), 0);
  }

  get productosReservadosCount(): number {
    const set = new Set<string>();
    this.pedidosYEntregasPlanificadas.forEach(p => {
      p.productos.forEach((prod: any) => set.add(prod.nombre.toLowerCase()));
    });
    return set.size;
  }

  get proximasEntregasCount(): number {
    return this.proximasEntregasReales.length;
  }

  get pedidosYEntregasPlanificadas(): any[] {
    const list: any[] = [
      {
        pedido: 'Pedido planificado #3',
        origen: 'PLANTILLA A · EcoBox quincenal',
        fechaPrevista: '25/06/2026',
        estado: 'CONFIRMADO',
        coste: 64.50,
        productos: [
          { nombre: 'Manzanas', cantidad: '10 kg', productor: 'Finca San Lorenzo', precioUnitario: 1.80, precioUnitarioStr: '1,80 €/kg', subtotal: 18.00 },
          { nombre: 'Lechuga romana', cantidad: '20 unidades', productor: 'EcoHuerta del Norte', precioUnitario: 1.20, precioUnitarioStr: '1,20 €/unidad', subtotal: 24.00 },
          { nombre: 'Papas del país', cantidad: '15 kg', productor: 'Finca San Lorenzo', precioUnitario: 1.50, precioUnitarioStr: '1,50 €/kg', subtotal: 22.50 }
        ]
      }
    ];

    const activeOrders = this.plannedOrders.filter(o => o.estado_suministro !== 'CANCELADO' && o.estado_suministro !== 'ENTREGADO');
    activeOrders.forEach(order => {
      if (order.id === 3) return;

      const productsList = order.items.map((item: any) => {
        const qty = Number(item.quantity || 0);
        const price = Number(
          item.unit_price !== undefined ? item.unit_price : (
            item.unitPrice !== undefined ? item.unitPrice : (
              item.precio_unitario !== undefined ? item.precio_unitario : (
                item.precioUnitario !== undefined ? item.precioUnitario : (
                  item.precio !== undefined ? item.precio : (
                    item.price !== undefined ? item.price : (
                      item.precio_kg !== undefined ? item.precio_kg : (
                        item.precioKg !== undefined ? item.precioKg : (
                          item.precio_historico !== undefined ? item.precio_historico : (
                            item.precioEstimado !== undefined ? item.precioEstimado : (
                              item.precio_estimado !== undefined ? item.precio_estimado : 0
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        );
        const sub = qty * price;
        const unit = item.product_unit || item.unidad || 'uds';
        return {
          nombre: item.product_name || item.nombre || 'Producto',
          cantidad: `${qty} ${unit}`,
          unidad: unit,
          productor: item.ownerName || item.productor || 'Productor Local',
          precioUnitario: price,
          precioUnitarioStr: `${price.toFixed(2).replace('.', ',')} €/${unit}`,
          subtotal: sub
        };
      });

      const d = new Date(order.fecha_entrega_deseada);
      const formattedDate = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

      let origen = 'Pedido planificado individual';
      if (order.ecobox_nombre) {
        if (order.ecobox_nombre.toLowerCase() === 'miel') {
          origen = 'Reserva planificada · Miel artesanal';
        } else {
          origen = `${order.ecobox_nombre} · EcoBox ${order.ecobox_frecuencia || 'semanal'}`;
        }
      } else if (order.frecuencia && order.frecuencia.toUpperCase() !== 'UNICO') {
        origen = `EcoBox ${order.frecuencia.toLowerCase()}`;
      }

      list.push({
        pedido: `Pedido planificado #${order.id}`,
        origen: origen,
        fechaPrevista: formattedDate,
        estado: order.estado_suministro,
        coste: Number(order.total || 0),
        productos: productsList
      });
    });

    return list;
  }

  get proximasEntregasReales(): any[] {
    const list = [
      {
        id: 3,
        fecha: '2026-06-25',
        pedido: 'Pedido planificado #3',
        origen: 'PLANTILLA A · EcoBox quincenal',
        estado: 'CONFIRMADO',
        total: 64.50,
        items: [
          { product_name: 'Manzanas', quantity: '10 kg', estado_productor: 'ACEPTADO' },
          { product_name: 'Lechuga romana', quantity: '20 unidades', estado_productor: 'ACEPTADO' },
          { product_name: 'Papas del país', quantity: '15 kg', estado_productor: 'ACEPTADO' }
        ]
      }
    ];

    this.upcomingDeliveries.forEach(del => {
      if (del.id === 3) return;
      
      const itemsList = del.items.map((item: any) => ({
        product_name: item.product_name,
        quantity: `${item.quantity} ${item.product_unit || 'uds'}`,
        estado_productor: item.estado_productor
      }));

      let origen = 'Pedido planificado individual';
      if (del.ecobox_nombre) {
        if (del.ecobox_nombre.toLowerCase() === 'miel') {
          origen = 'Reserva planificada · Miel artesanal';
        } else {
          origen = `${del.ecobox_nombre} · EcoBox ${del.ecobox_frecuencia || 'semanal'}`;
        }
      } else if (del.frecuencia && del.frecuencia.toUpperCase() !== 'UNICO') {
        origen = `EcoBox ${del.frecuencia.toLowerCase()}`;
      }

      list.push({
        id: del.id,
        fecha: del.fecha_entrega_deseada,
        pedido: `Pedido planificado #${del.id}`,
        origen: origen,
        estado: del.estado_suministro,
        total: del.total,
        items: itemsList
      });
    });

    return list;
  }

  formatPrice(price: number | string): string {
    const val = Number(price);
    return isNaN(val) ? String(price) : val.toFixed(2).replace('.', ',');
  }

  descargarPDF(entry: any): void {
    const doc = new jsPDF();

    // Colores de marca ProviECO
    const primaryColor: [number, number, number] = [39, 174, 96]; // #27ae60 (verde principal)
    const textColor: [number, number, number] = [44, 62, 80];    // #2c3e50 (gris oscuro)

    // Cabecera del documento
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('ProviECO', 14, 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    doc.text('Provisión local, gestión sostenible', 14, 25);

    // Título del reporte
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('Resumen de planificación de suministro', 14, 40);

    // Línea separadora
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 43, 196, 43);

    // Datos del centro y pedido
    const user = this.authService.currentUser;
    const centro = user?.nombre_centro || 'centro';
    const responsable = user?.persona_responsable || 'María Gómez';
    
    let tipoCentro = user?.tipo_centro || 'Colegio';
    if (tipoCentro.toUpperCase() === 'COLEGIO') {
      tipoCentro = 'Colegio';
    } else {
      tipoCentro = tipoCentro.charAt(0).toUpperCase() + tipoCentro.slice(1).toLowerCase();
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    doc.text('Centro:', 14, 52);
    doc.setFont('Helvetica', 'normal');
    doc.text(centro, 45, 52);

    doc.setFont('Helvetica', 'bold');
    doc.text('Responsable:', 14, 58);
    doc.setFont('Helvetica', 'normal');
    doc.text(responsable, 45, 58);

    doc.setFont('Helvetica', 'bold');
    doc.text('Tipo de centro:', 14, 64);
    doc.setFont('Helvetica', 'normal');
    doc.text(tipoCentro, 45, 64);

    doc.setFont('Helvetica', 'bold');
    doc.text('Pedido:', 14, 70);
    doc.setFont('Helvetica', 'normal');
    doc.text(entry.pedido || 'Pedido planificado', 45, 70);

    doc.setFont('Helvetica', 'bold');
    doc.text('Origen:', 14, 76);
    doc.setFont('Helvetica', 'normal');
    doc.text(entry.origen || 'EcoBox / pedido planificado', 45, 76);

    doc.setFont('Helvetica', 'bold');
    doc.text('Fecha prevista de entrega:', 14, 82);
    doc.setFont('Helvetica', 'normal');
    doc.text(entry.fechaPrevista || 'Fecha no definida', 65, 82);

    doc.setFont('Helvetica', 'bold');
    doc.text('Estado:', 14, 88);
    doc.setFont('Helvetica', 'normal');
    doc.text(entry.estado ? this.getStatusLabel(entry.estado) : 'Estado no definido', 45, 88);

    // Mapear datos de productos para la tabla
    let tableBody: any[] = [];
    let sumSubtotal = 0;

    if (!entry.productos || entry.productos.length === 0) {
      tableBody = [[{ content: 'No hay productos asociados a esta planificación', colSpan: 5, styles: { halign: 'center' } }]];
    } else {
      tableBody = entry.productos.map((p: any) => {
        // Obtener precio unitario comprobando múltiples posibles campos
        const price = Number(
          p.precioUnitario !== undefined ? p.precioUnitario : (
            p.unitPrice !== undefined ? p.unitPrice : (
              p.precio_unitario !== undefined ? p.precio_unitario : (
                p.precioUnitarioStr !== undefined && p.precioUnitarioStr ? Number(p.precioUnitarioStr.replace(/[^\d.,]/g, '').replace(',', '.')) : (
                  p.precio !== undefined ? p.precio : (
                    p.price !== undefined ? p.price : (
                      p.precio_kg !== undefined ? p.precio_kg : (
                        p.precioKg !== undefined ? p.precioKg : (
                          p.precio_historico !== undefined ? p.precio_historico : (
                            p.precioEstimado !== undefined ? p.precioEstimado : (
                              p.precio_estimado !== undefined ? p.precio_estimado : 0
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        );

        // Extraer cantidad numérica
        const cantStr = p.cantidad || '0';
        let qtyNum = 0;
        if (typeof cantStr === 'number') {
          qtyNum = cantStr;
        } else if (typeof cantStr === 'string') {
          const match = cantStr.match(/^[\d.,]+/);
          if (match) {
            qtyNum = Number(match[0].replace(',', '.'));
          }
        }

        // Calcular subtotal si no viene explícitamente o si es 0
        let sub = Number(p.subtotal || 0);
        if (sub === 0) {
          sub = qtyNum * price;
        }

        sumSubtotal += sub;

        // Determinar la unidad y precioUnitarioStr
        const unit = p.unidad || (typeof cantStr === 'string' ? cantStr.replace(/^[\d.,\s]*/, '') : 'uds') || 'uds';
        const precioUnitarioStr = p.precioUnitarioStr || `${this.formatPrice(price)} €/${unit}`;

        return [
          p.nombre || 'Producto sin nombre',
          p.productor || 'Productor Local',
          p.cantidad || '0',
          precioUnitarioStr,
          `${this.formatPrice(sub)} €`
        ];
      });
    }

    // Generar la tabla con autoTable
    autoTable(doc, {
      startY: 95,
      head: [['Producto', 'Productor', 'Cantidad', 'Precio unitario', 'Subtotal']],
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        font: 'Helvetica',
        fontSize: 10
      },
      columnStyles: {
        4: { halign: 'right' }
      }
    });

    // Calcular la posición vertical para el pie
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Calcular total estimado
    let totalEstimado = sumSubtotal;
    if (totalEstimado === 0 && entry.coste !== undefined) {
      totalEstimado = Number(entry.coste);
    }

    // Resumen económico
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('Resumen económico', 14, finalY);

    doc.setFontSize(11);
    doc.text('Total estimado:', 14, finalY + 7);
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${this.formatPrice(totalEstimado)} €`, 48, finalY + 7);

    // Nota de descargo de responsabilidad
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(127, 140, 141);
    const noticeText = 'Documento generado automáticamente por ProviECO. Este resumen tiene carácter informativo y sirve como apoyo para la planificación interna del centro.';
    const splitNotice = doc.splitTextToSize(noticeText, 180);
    doc.text(splitNotice, 14, finalY + 22);

    // Descargar PDF con nombre dinámico normalizado
    const cleanCentroName = (centro || 'centro').replace(/\s+/g, '_');
    const cleanPedidoName = (entry.pedido || 'Pedido_planificado').replace(/\s+/g, '_');
    doc.save(`resumen_pedido_${cleanCentroName}_${cleanPedidoName}.pdf`);
  }
}
