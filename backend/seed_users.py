import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import CustomUser

def load_data():
    json_path = os.path.join(os.path.dirname(__file__), '../db.json')
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            usuarios = data.get('usuarios', [])
            
            for u in usuarios:
                # the json has email, nombre, password, rol
                email = u.get('email')
                nombre = u.get('nombre', '')
                password = u.get('password')
                rol = u.get('rol', '').upper()
                if rol == 'PRODUCTOR':
                    rol = 'PRODUCTOR'
                else:
                    rol = 'CLIENTE'
                
                # Check if user exists
                user, created = CustomUser.objects.get_or_create(
                    username=email, # Using email as username for login convention
                    defaults={
                        'email': email,
                        'first_name': nombre,
                        'rol': rol
                    }
                )
                
                if created:
                    user.set_password(password)
                    user.save()
                    print(f"Usuario creado: {email} (Rol: {rol})")
                else:
                    print(f"Usuario ya existe: {email}")

    except Exception as e:
        print(f"Error loading data: {e}")

if __name__ == '__main__':
    load_data()
