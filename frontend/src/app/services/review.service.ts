import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Review {
  id: number;
  user: number;
  userName: string;
  product: number;
  productName: string;
  producerName: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ProducerProfile {
  id: number;
  name: string;
  email: string;
  provincia: string;
  date_joined: string;
  average_rating: number;
  total_reviews: number;
  total_products: number;
  products: any[];
  reviews: Review[];
}

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private apiUrl = 'http://127.0.0.1:8000/api/reviews/';
  private usersApiUrl = 'http://127.0.0.1:8000/api/users/';

  constructor(private http: HttpClient) {}

  getReviewsByProduct(productId: number): Promise<Review[]> {
    return firstValueFrom(this.http.get<Review[]>(`${this.apiUrl}?product=${productId}`));
  }

  getReviewsByProducer(producerId: number): Promise<Review[]> {
    return firstValueFrom(this.http.get<Review[]>(`${this.apiUrl}?producer=${producerId}`));
  }

  getProducerProfile(producerId: number): Promise<ProducerProfile> {
    return firstValueFrom(
      this.http.get<ProducerProfile>(`${this.usersApiUrl}producers/${producerId}/`),
    );
  }

  createReview(productId: number, rating: number, comment: string): Promise<Review> {
    return firstValueFrom(
      this.http.post<Review>(this.apiUrl, {
        product: productId,
        rating,
        comment,
      }),
    );
  }
}
