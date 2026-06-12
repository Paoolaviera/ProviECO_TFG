from rest_framework import serializers
from .models import Producto, CartItem, Review


class ProductoSerializer(serializers.ModelSerializer):
    ownerId = serializers.ReadOnlyField(source='owner.id')
    ownerName = serializers.ReadOnlyField(source='owner.first_name')
    image_url = serializers.SerializerMethodField()
    certificate_url = serializers.SerializerMethodField()
    qr_url = serializers.SerializerMethodField()

    # Standard ImageField — accepts multipart/form-data uploads.
    # The model's save() method handles WebP conversion and resizing via Pillow.
    image = serializers.ImageField(required=False, allow_null=True)

    # Certificate remains a generic file upload (PDF).
    certificate = serializers.FileField(required=False, allow_null=True)

    verification_status = serializers.ReadOnlyField()

    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'id',
            'name',
            'origin',
            'price',
            'unit',
            'description',
            'quantity',
            'image',
            'certificate',
            'image_url_legacy',
            'ownerId',
            'ownerName',
            'image_url',
            'certificate_url',
            'verification_status',
            'lote',
            'fecha_cosecha',
            'finca_origen',
            'qr_url',
            'average_rating',
            'reviews_count',
        ]

        read_only_fields = ['owner', 'verification_status']


    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.image_url_legacy or ""

    def get_certificate_url(self, obj):
        request = self.context.get('request')
        if obj.certificate and hasattr(obj.certificate, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.certificate.url)
            return obj.certificate.url
        return ""

    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if not reviews.exists():
            return 0
        total = sum(review.rating for review in reviews)
        return round(total / reviews.count(), 1)

    def get_reviews_count(self, obj):
        return obj.reviews.count()

    def get_qr_url(self, obj):
        request = self.context.get('request')
        if obj.qr_image and hasattr(obj.qr_image, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.qr_image.url)
            return obj.qr_image.url
        return ""

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("La cantidad no puede ser negativa.")
        return value


class CartItemSerializer(serializers.ModelSerializer):
    producto_detalles = ProductoSerializer(source='producto', read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'user', 'producto', 'cantidad', 'producto_detalles']
        read_only_fields = ['user']

class ReviewSerializer(serializers.ModelSerializer):
    userName = serializers.SerializerMethodField()
    productName = serializers.ReadOnlyField(source='product.name')
    producerName = serializers.ReadOnlyField(source='product.owner.first_name')

    class Meta:
        model = Review
        fields = [
            'id',
            'user',
            'userName',
            'product',
            'productName',
            'producerName',
            'rating',
            'comment',
            'created_at',
        ]
        read_only_fields = ['user']

    def get_userName(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.email

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("La puntuación debe estar entre 1 y 5.")
        return value