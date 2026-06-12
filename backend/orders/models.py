from django.conf import settings
from django.db import models
from products.models import Producto


class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING_PAYMENT', 'Pendiente de pago'),
        ('PAID', 'Pagado'),
        ('FAILED', 'Pago fallido'),
    ]

    DELIVERY_CHOICES = [
        ('ADDRESS', 'Entrega a domicilio'),
        ('PICKUP', 'Punto de recogida'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='PENDING_PAYMENT'
    )

    delivery_type = models.CharField(
        max_length=20,
        choices=DELIVERY_CHOICES
    )

    delivery_address = models.CharField(max_length=255)

    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Pedido #{self.id} - {self.user.email} - {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )

    product = models.ForeignKey(
        Producto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    product_name = models.CharField(max_length=120)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"

class EmailLog(models.Model):
    STATUS_CHOICES = [
        ('ENVIADO', 'Enviado'),
        ('FALLIDO', 'Fallido'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='email_logs')
    email_address = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Email {self.status} para Pedido #{self.order.id}"

class Subscription(models.Model):
    SIZE_CHOICES = [
        ('SMALL', 'Pequeña'),
        ('MEDIUM', 'Mediana'),
        ('LARGE', 'Grande'),
    ]

    FREQUENCY_CHOICES = [
        ('WEEKLY', 'Semanal'),
        ('BIWEEKLY', 'Quincenal'),
        ('MONTHLY', 'Mensual'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Activa'),
        ('PAUSED', 'Pausada'),
        ('CANCELLED', 'Cancelada'),
    ]

    DELIVERY_DAY_CHOICES = [
        ('MONDAY', 'Lunes'),
        ('TUESDAY', 'Martes'),
        ('WEDNESDAY', 'Miércoles'),
        ('THURSDAY', 'Jueves'),
        ('FRIDAY', 'Viernes'),
        ('SATURDAY', 'Sábado'),
        ('SUNDAY', 'Domingo'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    
    size = models.CharField(max_length=20, choices=SIZE_CHOICES)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    delivery_day = models.CharField(max_length=10, choices=DELIVERY_DAY_CHOICES, default='MONDAY')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Suscripción {self.get_size_display()} {self.get_frequency_display()} - {self.user.email} ({self.get_status_display()}) los {self.get_delivery_day_display()}"

class SubscriptionItem(models.Model):
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Producto,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    product_name = models.CharField(max_length=120)
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.product_name} x {self.quantity} (Suscripción #{self.subscription.id})"