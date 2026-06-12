from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from users.models import AdminActionLog, ContactMessage

User = get_user_model()

class UserTests(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123',
            rol='CLIENTE'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.rol, 'CLIENTE')
        self.assertTrue(user.is_active)

    def test_create_productor(self):
        user = User.objects.create_user(
            username='productor',
            email='productor@example.com',
            password='password123',
            rol='PRODUCTOR'
        )
        self.assertEqual(user.rol, 'PRODUCTOR')

    def test_producer_contact_requires_existing_user_email(self):
        client = APIClient()

        response = client.post('/api/users/contact/', {
            'nombre': 'Nueva Finca',
            'email': 'sin-cuenta@example.com',
            'motivo': 'Quiero ser productor',
            'mensaje': 'Quiero darme de alta como productor.',
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_producer_contact_is_saved_when_email_exists(self):
        User.objects.create_user(
            username='cliente',
            email='cliente@example.com',
            password='password123',
            rol='CLIENTE',
        )
        client = APIClient()

        response = client.post('/api/users/contact/', {
            'nombre': 'Cliente Eco',
            'email': 'cliente@example.com',
            'motivo': 'Quiero ser productor',
            'mensaje': 'Ya tengo cuenta y quiero vender.',
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_admin_can_list_contacts_and_promote_client_to_productor(self):
        admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='password123',
            is_staff=True,
        )
        user = User.objects.create_user(
            username='cliente2',
            email='cliente2@example.com',
            password='password123',
            rol='CLIENTE',
        )
        ContactMessage.objects.create(
            nombre='Cliente Dos',
            email='cliente2@example.com',
            motivo='Quiero ser productor',
            mensaje='Solicitud de alta.',
        )
        client = APIClient()
        client.force_authenticate(user=admin)

        contacts_response = client.get('/api/users/admin/contacts/')
        promote_response = client.patch(
            f'/api/users/admin/users/{user.id}/',
            {'rol': 'PRODUCTOR'},
            format='json',
        )

        user.refresh_from_db()
        self.assertEqual(contacts_response.status_code, status.HTTP_200_OK)
        self.assertEqual(contacts_response.data[0]['email'], 'cliente2@example.com')
        self.assertEqual(promote_response.status_code, status.HTTP_200_OK)
        self.assertEqual(user.rol, 'PRODUCTOR')
        self.assertTrue(AdminActionLog.objects.filter(action='USER_ROLE_UPDATED').exists())

