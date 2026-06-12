from django.test import TestCase
from django.contrib.auth import get_user_model
from products.models import Producto

User = get_user_model()

class ProductTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='productor',
            email='productor@example.com',
            password='password123',
            rol='PRODUCTOR'
        )

    def test_create_producto(self):
        producto = Producto.objects.create(
            owner=self.user,
            name='Manzanas Ecologicas',
            origin='Canarias',
            price=2.50,
            unit='kg',
            quantity=100
        )
        self.assertEqual(producto.name, 'Manzanas Ecologicas')
        self.assertEqual(producto.price, 2.50)
        self.assertEqual(producto.owner, self.user)
        self.assertEqual(producto.verification_status, 'PENDIENTE')

