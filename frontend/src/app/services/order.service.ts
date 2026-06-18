import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateOrderRequest {
  delivery_type: 'ADDRESS' | 'PICKUP';
  delivery_address: string;
}

export interface PaymentRequest {
  card_holder: string;
  card_number: string;
  expiry: string;
  cvv: string;
}

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  createOrder(data: CreateOrderRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/checkout/`, data);
  }

  payOrder(orderId: number, data: PaymentRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/${orderId}/pay/`, data);
  }

  getMyOrders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/`);
  }

  getProducerSales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sales/`);
  }

  getSubscriptions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/subscriptions/`);
  }

  createSubscription(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/subscriptions/`, data);
  }

  updateSubscriptionStatus(subId: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/subscriptions/${subId}/`, { status });
  }

  createPlannedOrder(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/planned/`, data);
  }

  updateOrderSupplyStatus(orderId: number, status: string, respuesta_productor?: string): Observable<any> {
    const payload: any = { estado_suministro: status };
    if (respuesta_productor !== undefined) {
      payload.respuesta_productor = respuesta_productor;
    }
    return this.http.patch<any>(`${this.apiUrl}/${orderId}/estado-suministro/`, payload);
  }

  getOrderDetail(orderId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${orderId}/`);
  }

  getEcoBoxes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ecobox/`);
  }

  getEcoBoxDetail(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ecobox/${id}/`);
  }

  createEcoBox(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ecobox/`, data);
  }

  updateEcoBox(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/ecobox/${id}/`, data);
  }

  deleteEcoBox(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/ecobox/${id}/`);
  }

  createOrderFromEcoBox(id: number, data: { fecha_entrega_deseada: string; observaciones?: string; mensaje_centro?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/ecobox/${id}/crear-pedido/`, data);
  }

  getProducerCalendar(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/producer-calendar/`);
  }

  getProducerRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/producer-requests/`);
  }

  acceptProducerRequest(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/producer-requests/${id}/accept/`, {});
  }

  rejectProducerRequest(id: number, data: { observaciones_productor?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/producer-requests/${id}/reject/`, data);
  }
}
