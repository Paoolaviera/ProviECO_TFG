from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from products.models import Producto, CartItem
from orders.models import Order, OrderItem

User = get_user_model()

class OrderStockTests(APITestCase):
    def setUp(self):
        # Create users
        self.user = User.objects.create_user(
            username='cliente',
            email='cliente@example.com',
            password='password123',
            rol='CLIENTE'
        )
        self.productor = User.objects.create_user(
            username='productor',
            email='productor@example.com',
            password='password123',
            rol='PRODUCTOR'
        )
        self.restauracion_user = User.objects.create_user(
            username='colegio',
            email='colegio@example.com',
            password='password123',
            rol='RESTAURACION',
            estado_validacion_centro='VALIDADO',
            nombre_centro='CEIP Test',
            direccion='Calle Test 123'
        )

        # Create product with verified certificate and 50 units of stock
        self.producto = Producto.objects.create(
            owner=self.productor,
            name='Lechuga',
            origin='Tenerife',
            price=1.20,
            unit='ud',
            quantity=50,
            certificate='certificates/test_cert.pdf',
            verification_status='VERIFICADO'
        )

    def test_checkout_discounts_stock(self):
        """A normal client checkout should validate stock, set type to NORMAL, and discount it."""
        self.client.force_authenticate(user=self.user)

        # Add 10 units to cart
        CartItem.objects.create(
            user=self.user,
            producto=self.producto,
            cantidad=10
        )

        response = self.client.post('/orders/checkout/', {
            'delivery_type': 'ADDRESS',
            'delivery_address': 'Calle Falsa 123'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify stock was decremented to 40
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.quantity, 40)

        # Verify order has tipo_pedido == 'NORMAL'
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(order.tipo_pedido, 'NORMAL')

    def test_checkout_insufficient_stock(self):
        """A normal checkout should fail and keep stock unchanged if there is not enough stock."""
        self.client.force_authenticate(user=self.user)

        # Add 60 units (more than the 50 in stock)
        CartItem.objects.create(
            user=self.user,
            producto=self.producto,
            cantidad=60
        )

        response = self.client.post('/orders/checkout/', {
            'delivery_type': 'ADDRESS',
            'delivery_address': 'Calle Falsa 123'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Stock insuficiente', response.data['detail'])

        # Verify stock remains at 50
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.quantity, 50)

    def test_planned_order_does_not_discount_stock(self):
        """A restoration collective planned order should NOT discount stock and set type to PLANIFICADO_RESTAURACION."""
        self.client.force_authenticate(user=self.restauracion_user)

        # Create planned order for 15 units
        response = self.client.post('/orders/planned/', {
            'items': [
                {
                    'product_id': self.producto.id,
                    'quantity': 15
                }
            ],
            'fecha_entrega_deseada': '2026-10-31',
            'observaciones': 'Para el comedor escolar'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify stock remains at 50
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.quantity, 50)

        # Verify order has tipo_pedido == 'PLANIFICADO_RESTAURACION'
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(order.tipo_pedido, 'PLANIFICADO_RESTAURACION')
