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

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private apiUrl = 'http://localhost:8000/orders';

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
}
