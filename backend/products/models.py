import io
import uuid
import qrcode

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import models
from PIL import Image
from django.core.files import File


MAX_IMAGE_WIDTH = 1200
WEBP_QUALITY = 80


def rename_product_image(instance, filename):
    """Generate a unique filename using UUID, always stored as .webp."""
    unique_name = f"producto_{uuid.uuid4().hex}.webp"
    return f"productos/{unique_name}"

def generar_qr_producto(producto):
    url = f"http://192.168.1.134:4200/trazabilidad/{producto.id}"

    qr = qrcode.make(url)

    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    buffer.seek(0)

    filename = f"producto_{producto.id}_qr.png"
    producto.qr_image.save(filename, File(buffer), save=False)

class Producto(models.Model):
    ESTADO_VERIFICACION_CHOICES = (
        ('PENDIENTE', 'Pendiente'),
        ('VERIFICADO', 'Verificado'),
        ('RECHAZADO', 'Rechazado'),
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='productos'
    )
    name = models.CharField(max_length=200)
    origin = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20)
    description = models.TextField(blank=True, null=True)
    quantity = models.IntegerField(default=0)
    image = models.ImageField(upload_to=rename_product_image, blank=True, null=True)
    certificate = models.FileField(upload_to='certificates/', blank=True, null=True)
    lote = models.CharField(max_length=100, blank=True, null=True)
    fecha_cosecha = models.DateField(blank=True, null=True)
    finca_origen = models.CharField(max_length=150, blank=True, null=True)
    qr_image = models.ImageField(upload_to='qr/', blank=True, null=True)
    
    categoria = models.CharField(
        max_length=50,
        choices=(
            ('Frutas', 'Frutas'),
            ('Verduras', 'Verduras'),
            ('Lacteos', 'Lácteos'),
            ('Huevos', 'Huevos'),
            ('Miel', 'Miel'),
            ('Bebidas', 'Bebidas'),
            ('Conservas', 'Conservas'),
            ('Otros', 'Otros'),
        ),
        default='Otros'
    )
    temporada = models.CharField(
        max_length=50,
        choices=(
            ('Primavera', 'Primavera'),
            ('Verano', 'Verano'),
            ('Otoño', 'Otoño'),
            ('Invierno', 'Invierno'),
            ('Todo el año', 'Todo el año'),
        ),
        default='Todo el año'
    )
    fecha_disponible_desde = models.DateField(blank=True, null=True)
    fecha_disponible_hasta = models.DateField(blank=True, null=True)
    permite_reserva_futura = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    verification_status = models.CharField(
        max_length=20,
        choices=ESTADO_VERIFICACION_CHOICES,
        default='PENDIENTE'
    )
    observaciones_admin = models.TextField(blank=True, null=True)

    # Legacy field kept for backward compatibility with seed data
    image_url_legacy = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.origin}"

    def save(self, *args, **kwargs):
        """
        After saving, process the image file with Pillow:
        - Resize to max MAX_IMAGE_WIDTH px wide (proportional).
        - Convert to WebP format.
        - Save at WEBP_QUALITY % quality.
        The DB stores only the relative file path, never binary data.
        """
        super().save(*args, **kwargs)

        if not self.qr_image:
            generar_qr_producto(self)
            super().save(update_fields=["qr_image"])

        if not self.image:
            return

        try:
            img = Image.open(self.image.path)

            # Convert palette or RGBA to RGB for WebP compatibility.
            if img.mode in ("P", "RGBA"):
                img = img.convert("RGBA")
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # Resize proportionally if wider than the allowed maximum.
            if img.width > MAX_IMAGE_WIDTH:
                ratio = MAX_IMAGE_WIDTH / img.width
                new_height = int(img.height * ratio)
                img = img.resize((MAX_IMAGE_WIDTH, new_height), Image.LANCZOS)

            # Save the processed image back to disk as WebP.
            buffer = io.BytesIO()
            img.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=6)
            buffer.seek(0)

            # Overwrite the file on disk (no second DB save needed).
            self.image.file.close()
            with open(self.image.path, "wb") as f:
                f.write(buffer.read())

        except Exception as exc:
            # Never break the save flow due to image processing errors.
            import logging
            logging.getLogger(__name__).warning(
                "Image optimization failed for product %s: %s", self.pk, exc
            )


class CartItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart_items'
    )
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('user', 'producto')

    def __str__(self):
        return f"{self.cantidad} x {self.producto.name} ({self.user.username})"

class Review(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )

    product = models.ForeignKey(
        Producto,
        on_delete=models.CASCADE,
        related_name='reviews'
    )

    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating} estrellas - {self.product.name} - {self.user.email}"