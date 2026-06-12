import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';

export interface ApiProduct {
  id: number;
  name: string;
  origin: string;
  price: number | string;
  unit: string;
  description: string;
  quantity: number;
  image?: File | string | null;
  image_url_legacy?: string;
  certificate?: File | string | null;
  certificate_url?: string;
  verification_status?: string;
  ownerId: number | string;
  ownerName?: string;
  ownerEmail?: string;
  image_url?: string;
  qr_url?: string;
  lote?: string;
  fecha_cosecha?: string;
  finca_origen?: string;
}

type TextPayloadKey = Exclude<keyof ApiProduct, 'image' | 'certificate'>;

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  // Backend local para que Angular funcione en tu Mac
  private localBackendUrl = 'http://127.0.0.1:8000';

  // Backend público para enlaces que tenga que abrir el móvil
  private publicBackendUrl = 'https://cheek-dallying-mollusk.ngrok-free.dev';

  // La app usa el backend local
  private backendUrl = this.localBackendUrl;
  private apiUrl = `${this.backendUrl}/api/productos/`;

  private ngrokHeaders = new HttpHeaders({
    'ngrok-skip-browser-warning': 'true',
  });

  private productsSubject = new BehaviorSubject<ApiProduct[]>([]);
  public products$ = this.productsSubject.asObservable();

  constructor(private http: HttpClient) {}

  async refreshProducts(): Promise<void> {
    try {
      const products = await firstValueFrom(
        this.http.get<ApiProduct[]>(this.apiUrl, {
          headers: this.ngrokHeaders,
        }),
      );

      const fixedProducts = products.map((product) => {
        const fixedImageUrl = this.fixMediaUrl(
          String(product.image_url || product.image || product.image_url_legacy || ''),
        );

        return {
          ...product,
          image: fixedImageUrl,
          image_url: fixedImageUrl,
          certificate_url: this.fixMediaUrl(product.certificate_url || ''),
          qr_url: this.fixMediaUrl(product.qr_url || ''),
        };
      });

      this.productsSubject.next(fixedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  getTrazabilidadProducto(id: number | string): Observable<ApiProduct> {
    return this.http.get<ApiProduct>(`${this.apiUrl}${id}/trazabilidad/`, {
      headers: this.ngrokHeaders,
    });
  }

  async createProduct(payload: Partial<ApiProduct>): Promise<ApiProduct> {
    const formData = this.buildFormData(payload);

    const newProduct = await firstValueFrom(
      this.http.post<ApiProduct>(this.apiUrl, formData, {
        headers: this.ngrokHeaders,
      }),
    );

    await this.refreshProducts();
    return newProduct;
  }

  async updateProduct(id: number | string, payload: Partial<ApiProduct>): Promise<ApiProduct> {
    const formData = this.buildFormData(payload);

    const updatedProduct = await firstValueFrom(
      this.http.patch<ApiProduct>(`${this.apiUrl}${id}/`, formData, {
        headers: this.ngrokHeaders,
      }),
    );

    await this.refreshProducts();
    return updatedProduct;
  }

  async deleteProduct(id: number | string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.apiUrl}${id}/`, {
        headers: this.ngrokHeaders,
      }),
    );

    await this.refreshProducts();
  }

  private fixMediaUrl(url: string): string {
    if (!url) {
      return '';
    }

    // Limpiamos espacios por si vienen de la API
    url = url.trim();

    // Si ya viene desde 127, lo dejamos igual
    if (url.startsWith('http://127.0.0.1:8000')) {
      return url;
    }

    // Si viene con localhost, lo pasamos a 127
    if (url.startsWith('http://localhost:8000')) {
      return url.replace('http://localhost:8000', this.localBackendUrl);
    }

    // Si viene con ngrok, lo pasamos a local para que se vea bien en Angular
    if (url.startsWith('https://cheek-dallying-mollusk.ngrok-free.dev')) {
      return url.replace('https://cheek-dallying-mollusk.ngrok-free.dev', this.localBackendUrl);
    }

    if (url.startsWith('http://cheek-dallying-mollusk.ngrok-free.dev')) {
      return url.replace('http://cheek-dallying-mollusk.ngrok-free.dev', this.localBackendUrl);
    }

    // Si viene como /media/archivo
    if (url.startsWith('/media/')) {
      return `${this.localBackendUrl}${url}`;
    }

    // Si viene como media/archivo
    if (url.startsWith('media/')) {
      return `${this.localBackendUrl}/${url}`;
    }

    // Si viene como productos/archivo, qrs/archivo, qr/archivo o certificates/archivo
    if (
      url.startsWith('productos/') ||
      url.startsWith('qrs/') ||
      url.startsWith('qr/') ||
      url.startsWith('certificates/') ||
      url.startsWith('certificados/')
    ) {
      return `${this.localBackendUrl}/media/${url}`;
    }

    return url;
  }

  private buildFormData(payload: Partial<ApiProduct>): FormData {
    const fd = new FormData();

    for (const [key, value] of Object.entries(payload)) {
      if (key === 'image' || key === 'certificate') {
        if (value instanceof File) {
          fd.append(key, value, value.name);
        } else if (value === null) {
          fd.append(key, '');
        }
      } else if (value !== undefined && value !== null) {
        fd.append(key as TextPayloadKey, String(value));
      }
    }

    return fd;
  }
}
