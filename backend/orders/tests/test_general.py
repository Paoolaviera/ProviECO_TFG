from django.test import TestCase
from django.contrib.auth import get_user_model
from products.models import Producto
from orders.models import Order, OrderItem

User = get_user_model()

class OrderTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='cliente',
            email='cliente@example.com',
            password='password123'
        )
        self.productor = User.objects.create_user(
            username='productor',
            email='productor@example.com',
            password='password123',
            rol='PRODUCTOR'
        )
        self.producto = Producto.objects.create(
            owner=self.productor,
            name='Lechuga',
            origin='Tenerife',
            price=1.20,
            unit='ud',
            quantity=50
        )

    def test_create_order(self):
        order = Order.objects.create(
            user=self.user,
            delivery_type='ADDRESS',
            delivery_address='Calle Falsa 123',
            total=1.20
        )
        OrderItem.objects.create(
            order=order,
            product=self.producto,
            product_name=self.producto.name,
            quantity=1,
            unit_price=self.producto.price,
            subtotal=1.20
        )
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.status, 'PENDING_PAYMENT')

