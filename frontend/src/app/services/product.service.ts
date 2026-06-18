import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  observaciones_admin?: string;
  ownerId: number | string;
  ownerName?: string;
  ownerEmail?: string;
  image_url?: string;
  qr_url?: string;
  lote?: string;
  fecha_cosecha?: string;
  finca_origen?: string;
  categoria?: string;
  temporada?: string;
  fecha_disponible_desde?: string;
  fecha_disponible_hasta?: string;
  permite_reserva_futura?: boolean;
  activo?: boolean;
}

type TextPayloadKey = Exclude<keyof ApiProduct, 'image' | 'certificate'>;

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  // Backend local para que Angular funcione en tu Mac
  private localBackendUrl = environment.apiUrl;

  // Backend público para enlaces que tenga que abrir el móvil
  private publicBackendUrl = environment.apiUrl;

  // La app usa el backend local
  private backendUrl = environment.apiUrl;
  private apiUrl = `${this.backendUrl}/api/productos/`;

  private ngrokHeaders = new HttpHeaders({
    'ngrok-skip-browser-warning': 'true',
  });

  private productsSubject = new BehaviorSubject<ApiProduct[]>([]);
  public products$ = this.productsSubject.asObservable();

  constructor(private http: HttpClient) {}

  public getDefaultImageForCategory(category?: string): string {
    const cat = String(category || '').trim().toLowerCase();
    if (cat.includes('fruta')) {
      return 'assets/products/manzanas.jpg';
    }
    if (cat.includes('verdura')) {
      return 'assets/products/calabacines.jpg';
    }
    if (cat.includes('lacteo') || cat.includes('lácteo')) {
      return 'assets/products/queso.jpg';
    }
    if (cat.includes('huevo')) {
      return 'assets/products/huevos.jpg';
    }
    if (cat.includes('miel')) {
      return 'assets/products/miel.jpg';
    }
    return 'assets/products/producto-local.jpg';
  }

  public getImageForProduct(name?: string, category?: string): string {
    const nm = String(name || '').trim().toLowerCase();

    if (nm.includes('tomate')) {
      return 'assets/products/tomates.jpg';
    }
    if (nm.includes('lechuga')) {
      return 'assets/products/lechuga.jpg';
    }
    if (nm.includes('pepino')) {
      return 'assets/products/pepino.jpg';
    }
    if (nm.includes('huevo')) {
      return 'assets/products/huevos.jpg';
    }
    if (nm.includes('queso')) {
      return 'assets/products/queso.jpg';
    }
    if (nm.includes('papa') || nm.includes('patata')) {
      return 'assets/products/papas.jpg';
    }
    if (nm.includes('zanahoria')) {
      return 'assets/products/zanahorias.jpg';
    }
    if (nm.includes('calabacín') || nm.includes('calabacin')) {
      return 'assets/products/calabacines.jpg';
    }
    if (nm.includes('naranja')) {
      return 'assets/products/naranjas.jpg';
    }
    if (nm.includes('miel')) {
      return 'assets/products/miel.jpg';
    }
    if (nm.includes('manzana')) {
      return 'assets/products/manzanas.jpg';
    }

    return this.getDefaultImageForCategory(category);
  }

  async refreshProducts(): Promise<void> {
    try {
      const products = await firstValueFrom(
        this.http.get<ApiProduct[]>(this.apiUrl, {
          headers: this.ngrokHeaders,
        }),
      );

      const fixedProducts = products.map((product) => {
        let fixedImageUrl = this.fixMediaUrl(
          String(product.image_url || product.image || product.image_url_legacy || ''),
        );

        let cat = String(product.categoria || '').trim();
        if (!cat || cat.toLowerCase() === 'otros') {
          const nm = String(product.name || '').toLowerCase();
          if (nm.includes('tomate') || nm.includes('lechuga') || nm.includes('pepino') || nm.includes('zanahoria') || nm.includes('calabacín') || nm.includes('calabacin') || nm.includes('papa')) {
            cat = 'Verduras';
          } else if (nm.includes('manzana') || nm.includes('naranja') || nm.includes('platano') || nm.includes('fruta')) {
            cat = 'Frutas';
          } else if (nm.includes('queso') || nm.includes('leche') || nm.includes('lacteo') || nm.includes('lácteo')) {
            cat = 'Lacteos';
          } else if (nm.includes('huevo') || nm.includes('huevos')) {
            cat = 'Huevos';
          } else if (nm.includes('miel')) {
            cat = 'Miel';
          }
        }

        if (!fixedImageUrl || fixedImageUrl.includes('assets/products/')) {
          fixedImageUrl = this.getImageForProduct(product.name, cat);
        }

        return {
          ...product,
          categoria: cat || 'Otros',
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

    // Si ya viene con el backend correcto, lo dejamos igual
    if (url.startsWith(this.localBackendUrl)) {
      return url;
    }

    // Si viene con localhost, lo reemplazamos
    if (url.startsWith('http://localhost:8000')) {
      return url.replace('http://localhost:8000', this.localBackendUrl);
    }

    // Si viene con 127.0.0.1, lo reemplazamos
    if (url.startsWith('http://127.0.0.1:8000')) {
      return url.replace('http://127.0.0.1:8000', this.localBackendUrl);
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
