from django.conf import settings
from django.db import models
from django.utils import timezone
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

    tipo_pedido = models.CharField(
        max_length=30,
        choices=[
            ('COMPRA_DIRECTA', 'Compra Directa'),
            ('PEDIDO_PLANIFICADO', 'Pedido Planificado'),
            ('NORMAL', 'Compra Normal'),
            ('PLANIFICADO_RESTAURACION', 'Pedido Planificado Restauración')
        ],
        default='NORMAL'
    )
    centro_nombre = models.CharField(max_length=150, blank=True, null=True)
    tipo_centro = models.CharField(max_length=50, blank=True, null=True)
    fecha_entrega_deseada = models.DateField(blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    estado_suministro = models.CharField(
        max_length=30,
        choices=[
            ('PENDIENTE', 'Pendiente de aceptación'),
            ('PARCIALMENTE_ACEPTADO', 'Parcialmente aceptado'),
            ('CONFIRMADO', 'Confirmado'),
            ('EN_PREPARACION', 'En preparación'),
            ('EN_REPARTO', 'En reparto'),
            ('ENTREGADO', 'Entregado'),
            ('RECHAZADO', 'Rechazado'),
            ('RECHAZADO_PARCIAL', 'Rechazado parcialmente'),
            ('CANCELADO', 'Cancelar')
        ],
        default='PENDIENTE',
        blank=True,
        null=True
    )

    numero_comensales = models.IntegerField(blank=True, null=True)
    observaciones_menu = models.TextField(blank=True, null=True)
    necesidades_estimadas = models.TextField(blank=True, null=True)
    mensaje_centro = models.TextField(blank=True, null=True)
    respuesta_productor = models.TextField(blank=True, null=True)
    fecha_respuesta_productor = models.DateTimeField(blank=True, null=True)
    frecuencia = models.CharField(max_length=50, blank=True, null=True)
    ecobox_id = models.IntegerField(blank=True, null=True)
    ecobox_nombre = models.CharField(max_length=150, blank=True, null=True)
    proxima_entrega = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"Pedido #{self.id} ({self.tipo_pedido}) - {self.user.email} - {self.status}"


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
    estado_productor = models.CharField(
        max_length=30,
        choices=[
            ('PENDIENTE', 'Pendiente'),
            ('ACEPTADO', 'Aceptado'),
            ('RECHAZADO', 'Rechazado'),
            ('EN_PREPARACION', 'En preparación'),
            ('ENTREGADO', 'Entregado'),
        ],
        default='PENDIENTE'
    )
    observaciones_productor = models.TextField(blank=True, null=True)

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


class EcoBox(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ecoboxes'
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    numero_comensales = models.IntegerField(default=0)
    frecuencia = models.CharField(max_length=50, default='Semanal')
    fecha_inicio = models.DateField(default=timezone.now)
    proxima_entrega = models.DateField(blank=True, null=True)
    estado = models.CharField(
        max_length=20,
        choices=(
            ('ACTIVO', 'Activo'),
            ('INACTIVO', 'Inactivo')
        ),
        default='ACTIVO'
    )
    observaciones = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nombre} - {self.user.email} ({self.frecuencia})"


class EcoBoxItem(models.Model):
    ecobox = models.ForeignKey(
        EcoBox,
        on_delete=models.CASCADE,
        related_name='items'
    )
    producto = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE
    )
    cantidad = models.IntegerField(default=1)
    unidad = models.CharField(max_length=30, blank=True, null=True)
    precio_estimado = models.DecimalField(max_digits=10, decimal_places=2)
    observaciones = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.producto.name} x {self.cantidad} ({self.ecobox.nombre})"