import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ReviewService, ProducerProfile, Review } from '../services/review.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-perfil-productor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-productor.html',
  styleUrl: './perfil-productor.css',
})
export class PerfilProductor implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reviewService = inject(ReviewService);
  protected readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = true;
  protected error = '';
  protected producer: ProducerProfile | null = null;
  protected activeTab: 'productos' | 'resenas' = 'productos';

  readonly starArray = [1, 2, 3, 4, 5];

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.error = 'ID de productor no válido.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    try {
      this.producer = await this.reviewService.getProducerProfile(Number(idParam));
    } catch (err: any) {
      console.error('Error fetching producer profile', err);
      if (err?.status === 404) {
        this.error = 'Productor no encontrado.';
      } else {
        this.error = 'Error al cargar el perfil del productor.';
      }
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  get avatarInitials(): string {
    if (!this.producer) return 'P';
    const parts = this.producer.name
      .split(' ')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'P';
  }

  get ratingStars(): string {
    if (!this.producer) return '☆☆☆☆☆';
    const full = Math.floor(this.producer.average_rating);
    const half = this.producer.average_rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '★' : '') + '☆'.repeat(empty);
  }

  get memberSince(): string {
    if (!this.producer?.date_joined) return '';
    const date = new Date(this.producer.date_joined);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  setTab(tab: 'productos' | 'resenas'): void {
    this.activeTab = tab;
  }

  getProductRating(product: any): number {
    return Number(product.average_rating || 0);
  }

  getProductReviewsCount(product: any): number {
    return Number(product.reviews_count || 0);
  }

  getProductImageUrl(product: any): string {
    return product.image_url || product.image_url_legacy || 'assets/images/placeholder.png';
  }

  fixMediaUrl(url: string): string {
    if (!url) return '';
    url = url.trim();
    if (url.startsWith('http://127.0.0.1:8000') || url.startsWith('http://localhost:8000')) {
      return url;
    }
    if (url.startsWith('/media/')) {
      return `http://127.0.0.1:8000${url}`;
    }
    if (url.startsWith('media/')) {
      return `http://127.0.0.1:8000/${url}`;
    }
    return url;
  }

  navigateToProduct(productId: number): void {
    this.router.navigate(['/detalle'], { queryParams: { id: productId } });
  }

  goBack(): void {
    this.router.navigate(['/catalogo']);
  }
}
