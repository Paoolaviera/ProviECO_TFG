import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import CustomUser

import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import models
from users.models import CustomUser

# Check for validation document presence
media_docs_dir = os.path.join(os.path.dirname(__file__), 'media', 'documentos_centros')
doc_filename = 'Certificado_Restauracion_Colectiva_CEIP_San_Lorenzo_ProviECO.pdf'
doc_full_path = os.path.join(media_docs_dir, doc_filename)
doc_exists = os.path.exists(doc_full_path)

doc_val = f'documentos_centros/{doc_filename}' if doc_exists else ''

# Default TFG seed users
DEFAULT_USERS = [
    {
        'email': 'admin@provieco.com',
        'nombre': 'Ana Administradora',
        'password': 'password123',
        'rol': 'ADMIN',
        'is_staff': True,
        'is_superuser': True
    },
    {
        'email': 'productor1@provieco.com',
        'nombre': 'Juan Productor',
        'password': 'password123',
        'rol': 'PRODUCTOR',
        'is_staff': False,
        'is_superuser': False
    },
    {
        'email': 'finca.sanlorenzo@provieco.com',
        'nombre': 'Finca San Lorenzo',
        'password': 'password123',
        'rol': 'PRODUCTOR',
        'is_staff': False,
        'is_superuser': False,
        'provincia': 'Las Palmas'
    },
    {
        'email': 'granja.lavega@provieco.com',
        'nombre': 'Granja La Vega',
        'password': 'password123',
        'rol': 'PRODUCTOR',
        'is_staff': False,
        'is_superuser': False,
        'provincia': 'Las Palmas'
    },
    {
        'email': 'ecohuerta.norte@provieco.com',
        'nombre': 'EcoHuerta del Norte',
        'password': 'password123',
        'rol': 'PRODUCTOR',
        'is_staff': False,
        'is_superuser': False,
        'provincia': 'Las Palmas'
    },
    {
        'email': 'colegio.sanlorenzo@provieco.com',
        'nombre': 'CEIP San Lorenzo',
        'password': 'password123',
        'rol': 'RESTAURACION',
        'is_staff': False,
        'is_superuser': False,
        'nombre_centro': 'CEIP San Lorenzo',
        'tipo_centro': 'COLEGIO',
        'persona_responsable': 'María Gómez',
        'telefono': '600 123 456',
        'direccion': 'Calle del Colegio, 10, 35000, Las Palmas de Gran Canaria',
        'provincia': 'Las Palmas',
        'observaciones_centro': 'Menús escolares saludables y ecológicos',
        'estado_validacion_centro': 'VALIDADO',
        'documento_centro': doc_val
    },
    {
        'email': 'cliente@provieco.com',
        'nombre': 'Pedro Cliente',
        'password': 'password123',
        'rol': 'CLIENTE',
        'is_staff': False,
        'is_superuser': False
    }
]

def load_data():
    if not doc_exists:
        print("\n" + "="*80)
        print("ADVERTENCIA: No se ha encontrado Certificado_Restauracion_Colectiva_CEIP_San_Lorenzo_ProviECO.pdf en backend/media/documentos_centros/. Copia el archivo antes de ejecutar seed_users.")
        print("="*80 + "\n")

    json_path = os.path.join(os.path.dirname(__file__), '../db.json')
    usuarios = []
    
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                usuarios = data.get('usuarios', [])
                print("Cargando usuarios desde db.json...")
        except Exception as e:
            print(f"Error al abrir db.json: {e}. Usando valores por defecto.")
            usuarios = DEFAULT_USERS
    else:
        print("db.json no encontrado. Usando usuarios por defecto de ProviECO TFG.")
        usuarios = DEFAULT_USERS

    for u in usuarios:
        email = u.get('email')
        nombre = u.get('nombre', '')
        password = u.get('password')
        rol = u.get('rol', 'CLIENTE').upper()
        is_staff = u.get('is_staff', False)
        is_superuser = u.get('is_superuser', False)

        # Check if user exists
        user, created = CustomUser.objects.get_or_create(
            username=email,
            defaults={
                'email': email,
                'first_name': nombre,
                'rol': rol,
                'is_staff': is_staff,
                'is_superuser': is_superuser,
                'nombre_centro': u.get('nombre_centro', ''),
                'tipo_centro': u.get('tipo_centro', None),
                'persona_responsable': u.get('persona_responsable', ''),
                'observaciones_centro': u.get('observaciones_centro', ''),
                'estado_validacion_centro': u.get('estado_validacion_centro', 'PENDIENTE'),
                'provincia': u.get('provincia', ''),
                'telefono': u.get('telefono', ''),
                'direccion': u.get('direccion', ''),
                'documento_centro': u.get('documento_centro', '')
            }
        )
        
        if created:
            user.set_password(password)
            user.save()
            print(f"Usuario creado: {email} (Rol: {rol})")
        else:
            user.first_name = nombre
            user.rol = rol
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.nombre_centro = u.get('nombre_centro', '')
            user.tipo_centro = u.get('tipo_centro', None)
            user.persona_responsable = u.get('persona_responsable', '')
            user.observaciones_centro = u.get('observaciones_centro', '')
            user.estado_validacion_centro = u.get('estado_validacion_centro', user.estado_validacion_centro)
            user.provincia = u.get('provincia', user.provincia or '')
            user.telefono = u.get('telefono', u.get('telefono', user.telefono or ''))
            user.direccion = u.get('direccion', u.get('direccion', user.direccion or ''))
            user.documento_centro = u.get('documento_centro', user.documento_centro)
            user.save()
            print(f"Usuario actualizado: {email}")

if __name__ == '__main__':
    load_data()
