import os
import django
import json
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from products.models import Producto
from users.models import CustomUser

def load_data():
    json_path = os.path.join(os.path.dirname(__file__), '../db.json')
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            productos = data.get('productos', [])
            
            for p in productos:
                owner_id_json = p.get('ownerId')
                # owner from db.json might have email or just id. But previously we didn't map user IDs. 
                # Let's find owner by matching the ownerName to first_name since that was saved.
                owner_name = p.get('ownerName')
                
                # Fetch owner
                owner = CustomUser.objects.filter(first_name=owner_name).first()
                if not owner:
                    print(f"Skipping producto {p.get('name')}: Owner '{owner_name}' not found.")
                    continue
                
                # Clean up legacy image string
                image_legacy = p.get('image', '')
                if image_legacy and not image_legacy.startswith('http'):
                    # Sometimes it's ../Imagenes/tomate.png -> keep it or clean it
                    pass
                
                producto, created = Producto.objects.get_or_create(
                    name=p.get('name'),
                    owner=owner,
                    defaults={
                        'origin': p.get('origin', ''),
                        'price': Decimal(str(p.get('price', 0))),
                        'unit': p.get('unit', ''),
                        'description': p.get('description', ''),
                        'quantity': int(p.get('quantity', 0)),
                        'image_url_legacy': image_legacy
                    }
                )
                
                if created:
                    print(f"Producto creado: {producto.name} (Productor: {owner.username})")
                else:
                    print(f"Producto ya existe: {producto.name}")

    except Exception as e:
        print(f"Error loading products: {e}")

if __name__ == '__main__':
    load_data()
