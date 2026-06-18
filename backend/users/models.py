from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('CLIENTE', 'Cliente'),
        ('PRODUCTOR', 'Productor'),
        ('RESTAURACION', 'Restauración Colectiva'),
    )
    rol = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CLIENTE')
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.CharField(max_length=160, blank=True, null=True)
    provincia = models.CharField(max_length=100, blank=True, null=True)
    
    nombre_centro = models.CharField(max_length=150, blank=True, null=True)
    tipo_centro = models.CharField(
        max_length=20,
        choices=(
            ('COLEGIO', 'Colegio'),
            ('HOSPITAL', 'Hospital'),
            ('RESIDENCIA', 'Residencia'),
            ('COMEDOR', 'Comedor'),
            ('OTRO', 'Otro'),
        ),
        blank=True,
        null=True
    )
    persona_responsable = models.CharField(max_length=150, blank=True, null=True)
    observaciones_centro = models.TextField(blank=True, null=True)
    
    documento_centro = models.FileField(upload_to='documentos_centros/', blank=True, null=True)
    estado_validacion_centro = models.CharField(
        max_length=20,
        choices=(
            ('PENDIENTE', 'Pendiente'),
            ('VALIDADO', 'Validado'),
            ('RECHAZADO', 'Rechazado'),
        ),
        default='PENDIENTE'
    )
    fecha_subida_documento = models.DateTimeField(blank=True, null=True)
    fecha_validacion_centro = models.DateTimeField(blank=True, null=True)
    observaciones_validacion_admin = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.rol})"

class ContactMessage(models.Model):
    nombre = models.CharField(max_length=100)
    email = models.EmailField()
    motivo = models.CharField(max_length=100)
    mensaje = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Mensaje de {self.nombre} - {self.motivo}"

class UserEmailLog(models.Model):
    STATUS_CHOICES = [
        ('ENVIADO', 'Enviado'),
        ('FALLIDO', 'Fallido'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='email_logs')
    tipo_email = models.CharField(max_length=50, default='BIENVENIDA')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tipo_email} a {self.user.email} - {self.status}"


class AdminActionLog(models.Model):
    admin = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_actions'
    )
    action = models.CharField(max_length=80)
    target_type = models.CharField(max_length=40)
    target_id = models.CharField(max_length=40, blank=True)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        admin_email = self.admin.email if self.admin else 'admin eliminado'
        return f"{admin_email} - {self.action} - {self.target_type} {self.target_id}"


class Address(models.Model):
    TYPE_CHOICES = (
        ('ENTREGA', 'Entrega'),
        ('RECOGIDA', 'Recogida'),
    )
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=60)
    address_line = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    provincia = models.CharField(max_length=100, blank=True, default='')
    postal_code = models.CharField(max_length=10)
    address_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='ENTREGA')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-updated_at']

    def __str__(self):
        return f"{self.label} - {self.user.email}"

    def save(self, *args, **kwargs):
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)


class UserPreferences(models.Model):
    THEME_CHOICES = (('light', 'Claro'), ('dark', 'Oscuro'))
    FONT_SIZE_CHOICES = (('normal', 'Normal'), ('large', 'Grande'), ('x-large', 'Muy grande'))

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='preferences')
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')
    font_size = models.CharField(max_length=10, choices=FONT_SIZE_CHOICES, default='normal')
    notifications_enabled = models.BooleanField(default=True)

    def __str__(self):
        return f"Preferencias de {self.user.email}"
