import os
import django
import sys

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def create_producer(email, password, nombre, apellidos, telefono, direccion):
    if User.objects.filter(email=email).exists():
        print(f"Error: Ya existe un usuario con el email {email}")
        return

    # Usamos el email como username ya que el modelo base lo requiere
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=nombre,
        last_name=apellidos,
        rol='PRODUCTOR',
        telefono=telefono,
        direccion=direccion
    )
    print(f"¡Éxito! Se ha creado el productor: {nombre} {apellidos}")
    print(f"Email para iniciar sesión: {email}")
    print(f"Contraseña: {password}")

if __name__ == '__main__':
    print("--- CREACIÓN DE PERFIL DE PRODUCTOR ---")
    
    # Datos por defecto o puedes pedirlos por consola (input)
    email = input("Introduce el email del productor: ").strip()
    password = input("Introduce una contraseña: ").strip()
    nombre = input("Nombre del productor o granja: ").strip()
    apellidos = input("Apellidos (opcional): ").strip()
    telefono = input("Teléfono: ").strip()
    direccion = input("Dirección/Ubicación: ").strip()
    
    if email and password and nombre:
        create_producer(email, password, nombre, apellidos, telefono, direccion)
    else:
        print("Error: Email, contraseña y nombre son obligatorios.")
