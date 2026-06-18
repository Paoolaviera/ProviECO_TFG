import os
import django
import json
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from products.models import Producto
from users.models import CustomUser

# Default TFG seed products with Spanish national distribution and clean provinces
DEFAULT_PRODUCTS = [
    # Finca San Lorenzo (Las Palmas)
    {
        'name': 'Tomates de ensalada',
        'origin': 'Las Palmas',
        'price': 2.20,
        'unit': 'kg',
        'description': 'Tomates frescos de cultivo ecológico local, ideales para consumo diario y comedores.',
        'quantity': 250,
        'ownerName': 'Finca San Lorenzo',
        'categoria': 'Verduras',
        'temporada': 'Todo el año',
        'permite_reserva_futura': True,
        'activo': True,
        'lote': 'LOT-TOM-SL01',
        'finca_origen': 'Finca San Lorenzo',
        'fecha_cosecha': '2026-06-10',
        'fecha_disponible_desde': '2026-06-12',
        'fecha_disponible_hasta': '2026-12-31',
    },
    {
        'name': 'Papas del país',
        'origin': 'Las Palmas',
        'price': 1.50,
        'unit': 'kg',
        'description': 'Papas locales ecológicas, excelentes para asar o guisar en comedores.',
        'quantity': 1000,
        'ownerName': 'Finca San Lorenzo',
        'categoria': 'Verduras',
        'temporada': 'Todo el año',
        'permite_reserva_futura': True,
        'activo': True,
        'lote': 'LOT-PAP-SL02',
        'finca_origen': 'Finca San Lorenzo',
        'fecha_cosecha': '2026-06-08',
        'fecha_disponible_desde': '2026-06-10',
        'fecha_disponible_hasta': '2026-12-31',
    },
    {
        'name': 'Miel artesanal',
        'origin': 'Granada',
        'price': 8.50,
        'unit': 'tarro 500g',
        'description': 'Miel ecológica de flores silvestres recolectada de forma tradicional en Sierra Nevada.',
        'quantity': 150,
        'ownerName': 'Finca San Lorenzo',
        'categoria': 'Miel',
        'temporada': 'Todo el año',
        'permite_reserva_futura': True,
        'activo': True,
        'lote': 'LOT-MIE-SL03',
        'finca_origen': 'Finca San Lorenzo',
        'fecha_cosecha': '2026-06-09',
        'fecha_disponible_desde': '2026-06-12',
        'fecha_disponible_hasta': '2026-12-31',
    },

    # Granja La Vega (Madrid / Cantabria)
    {
        'name': 'Huevos camperos',
        'origin': 'Madrid',
        'price': 3.50,
        'unit': 'docena',
        'description': 'Huevos de gallinas criadas en libertad y alimentadas con pasto natural.',
        'quantity': 120,
        'ownerName': 'Granja La Vega',
        'categoria': 'Huevos',
        'temporada': 'Todo el año',
        'permite_reserva_futura': True,
        'activo': True,
        'lote': 'LOT-HUE-LV01',
        'finca_origen': 'Granja La Vega',
        'fecha_cosecha': '2026-06-12',
        'fecha_disponible_desde': '2026-06-12',
        'fecha_disponible_hasta': '2026-12-31',
    },
    {
        'name': 'Queso fresco local',
        'origin': 'Cantabria',
        'price': 9.80,
        'unit': 'kg',
        'description': 'Queso fresco artesano elaborado con leche de cabras en los pastos de Cantabria.',
        'quantity': 60,
        'ownerName': 'Granja La Vega',
        'categoria': 'Lacteos',
        'temporada': 'Todo el año',
        'permite_reserva_futura': True,
        'activo': True,
        'lote': 'LOT-QUE-LV03',
        'finca_origen': 'Granja La Vega',
        'fecha_cosecha': '2026-06-10',
        'fecha_disponible_desde': '2026-06-11',
        'fecha_disponible_hasta': '2026-12-31',
    },

    # EcoHuerta del Norte (Murcia / Valladolid / Lleida)
    {
        'name': 'Lechuga romana',
        'origin': 'Murcia',
        'price': 1.20,
        'unit': 'unidad',
        'description': 'Lechugas romanas crujientes y frescas, ideales para restauración colectiva.',
        'quantity': 80,
        'ownerName': 'EcoHuerta del Norte',
        'categoria': 'Verduras',
        'temporada': 'Todo el año',
        'permite_reserva_futura': True,
        'activo': True,
        'lote': 'LOT-LEC-EHN01',
        'finca_origen': 'EcoHuerta del Norte',
        'fecha_cosecha': '2026-06-11',
        'fecha_disponible_desde': '2026-06-12',
        'fecha_disponible_hasta': '2026-12-31',
    },
    {
        'name': 'Zanahorias',
        'origin': 'Valladolid',
        'price': 1.25,
        'unit': 'kg',
        'description': 'Zanahorias dulces y crujientes recién cosechadas.',
        'quantity': 180,
        'ownerName': 'EcoHuerta del Norte',
        'categoria': 'Verduras',
        'temporada': 'Todo el año',
        'permite_reserva_futura': True,
        'activo': True,
        'lote': 'LOT-ZAN-EHN02',
        'finca_origen': 'EcoHuerta del Norte',
        'fecha_cosecha': '2026-06-11',
        'fecha_disponible_desde': '2026-06-12',
        'fecha_disponible_hasta': '2026-12-31',
    },
    {
        'name': 'Manzanas',
        'origin': 'Lleida',
        'price': 1.80,
        'unit': 'kg',
        'description': 'Manzanas dulces y crujientes con certificación ecológica oficial de Lleida.',
        'quantity': 150,
        'ownerName': 'EcoHuerta del Norte',
        'categoria': 'Frutas',
        'temporada': 'Otoño',
        'permite_reserva_futura': True,
        'activo': True,
        'lote': 'LOT-MAN-EHN03',
        'finca_origen': 'EcoHuerta del Norte',
        'fecha_cosecha': '2026-06-02',
        'fecha_disponible_desde': '2026-06-02',
        'fecha_disponible_hasta': '2026-11-30',
    }
]

def load_data():
    json_path = os.path.join(os.path.dirname(__file__), '../db.json')
    productos = []
    
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                productos = data.get('productos', [])
                print("Cargando productos desde db.json...")
        except Exception as e:
            print(f"Error al abrir db.json: {e}. Usando valores por defecto.")
            productos = DEFAULT_PRODUCTS
    else:
        print("db.json no encontrado. Usando productos por defecto de ProviECO TFG.")
        productos = DEFAULT_PRODUCTS

    # Check for the test certificate file
    media_certs_dir = os.path.join(os.path.dirname(__file__), 'media', 'certificates')
    if not os.path.exists(media_certs_dir):
        os.makedirs(media_certs_dir)
        
    cert_filename = 'Certificado_Ecologico_ProviECO.pdf'
    cert_full_path = os.path.join(media_certs_dir, cert_filename)
    cert_exists = os.path.exists(cert_full_path)
    
    if not cert_exists:
        print("\n" + "="*80)
        print("ADVERTENCIA: No se ha encontrado Certificado_Ecologico_ProviECO.pdf en backend/media/certificates/. Copia el archivo antes de ejecutar seed_products.")
        print("="*80 + "\n")

    cert_val = f'certificates/{cert_filename}' if cert_exists else ''
    status_val = 'VERIFICADO' if cert_exists else 'PENDIENTE'

    for p in productos:
        owner_name = p.get('ownerName')
        
        # Fetch owner (by first_name match or fallback to the first producer)
        owner = CustomUser.objects.filter(first_name=owner_name).first()
        if not owner:
            owner = CustomUser.objects.filter(rol='PRODUCTOR').first()
            
        if not owner:
            print(f"Saltando producto {p.get('name')}: Productor '{owner_name}' no encontrado.")
            continue
            
        producto, created = Producto.objects.get_or_create(
            name=p.get('name'),
            owner=owner,
            defaults={
                'origin': p.get('origin', ''),
                'price': Decimal(str(p.get('price', 0))),
                'unit': p.get('unit', ''),
                'description': p.get('description', ''),
                'quantity': int(p.get('quantity', 0)),
                'categoria': p.get('categoria', 'Otros'),
                'temporada': p.get('temporada', 'Todo el año'),
                'permite_reserva_futura': p.get('permite_reserva_futura', False),
                'activo': p.get('activo', True),
                'lote': p.get('lote', ''),
                'finca_origen': p.get('finca_origen', ''),
                'fecha_cosecha': p.get('fecha_cosecha', None),
                'fecha_disponible_desde': p.get('fecha_disponible_desde', None),
                'fecha_disponible_hasta': p.get('fecha_disponible_hasta', None),
                'certificate': cert_val,
                'verification_status': status_val
            }
        )
        
        if created:
            print(f"Producto creado: {producto.name} (Productor: {owner.username})")
        else:
            # Force update fields for seed consistency
            producto.origin = p.get('origin', producto.origin)
            producto.price = Decimal(str(p.get('price', producto.price)))
            producto.unit = p.get('unit', producto.unit)
            producto.description = p.get('description', producto.description)
            producto.quantity = int(p.get('quantity', producto.quantity))
            producto.categoria = p.get('categoria', producto.categoria)
            producto.temporada = p.get('temporada', producto.temporada)
            producto.permite_reserva_futura = p.get('permite_reserva_futura', producto.permite_reserva_futura)
            producto.activo = p.get('activo', producto.activo)
            producto.lote = p.get('lote', producto.lote)
            producto.finca_origen = p.get('finca_origen', producto.finca_origen)
            producto.fecha_cosecha = p.get('fecha_cosecha', producto.fecha_cosecha)
            producto.fecha_disponible_desde = p.get('fecha_disponible_desde', producto.fecha_disponible_desde)
            producto.fecha_disponible_hasta = p.get('fecha_disponible_hasta', producto.fecha_disponible_hasta)
            producto.certificate = cert_val
            producto.verification_status = status_val
            producto.save()
            print(f"Producto actualizado: {producto.name}")

if __name__ == '__main__':
    load_data()
