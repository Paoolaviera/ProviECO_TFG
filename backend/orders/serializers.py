from rest_framework import serializers
from .models import Order, OrderItem, Subscription, SubscriptionItem, EcoBox, EcoBoxItem
from products.serializers import ProductoSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    certificate_url = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product',
            'product_name',
            'quantity',
            'unit_price',
            'subtotal',
            'certificate_url',
            'estado_productor',
            'observaciones_productor',
        ]

    def get_certificate_url(self, obj):
        request = self.context.get('request')
        if obj.product and obj.product.certificate and hasattr(obj.product.certificate, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.product.certificate.url)
            return obj.product.certificate.url
        return ""


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'status',
            'delivery_type',
            'delivery_address',
            'total',
            'created_at',
            'paid_at',
            'items',
            'tipo_pedido',
            'centro_nombre',
            'tipo_centro',
            'fecha_entrega_deseada',
            'observaciones',
            'estado_suministro',
            'numero_comensales',
            'observaciones_menu',
            'necesidades_estimadas',
            'mensaje_centro',
            'respuesta_productor',
            'fecha_respuesta_productor',
            'frecuencia',
            'ecobox_id',
            'ecobox_nombre',
            'proxima_entrega',
        ]


class CreateOrderSerializer(serializers.Serializer):
    delivery_type = serializers.ChoiceField(choices=['ADDRESS', 'PICKUP'])
    delivery_address = serializers.CharField(max_length=255)


class SimulatedPaymentSerializer(serializers.Serializer):
    card_holder = serializers.CharField(max_length=120)
    card_number = serializers.CharField(max_length=20)
    expiry = serializers.CharField(max_length=7)
    cvv = serializers.CharField(max_length=4)


class ProducerSaleSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)
    order_date = serializers.DateTimeField(source='order.created_at', read_only=True)
    delivery_address = serializers.CharField(source='order.delivery_address', read_only=True)
    buyer_name = serializers.CharField(source='order.user.first_name', read_only=True)
    buyer_email = serializers.EmailField(source='order.user.email', read_only=True)
    tipo_pedido = serializers.CharField(source='order.tipo_pedido', read_only=True)
    centro_nombre = serializers.CharField(source='order.centro_nombre', read_only=True)
    tipo_centro = serializers.CharField(source='order.tipo_centro', read_only=True)
    fecha_entrega_deseada = serializers.DateField(source='order.fecha_entrega_deseada', read_only=True)
    observaciones = serializers.CharField(source='order.observaciones', read_only=True)
    estado_suministro = serializers.CharField(source='order.estado_suministro', read_only=True)
    numero_comensales = serializers.IntegerField(source='order.numero_comensales', read_only=True)
    respuesta_productor = serializers.CharField(source='order.respuesta_productor', read_only=True)
    certificate_url = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'order_id',
            'order_status',
            'order_date',
            'delivery_address',
            'buyer_name',
            'buyer_email',
            'product_name',
            'quantity',
            'unit_price',
            'subtotal',
            'certificate_url',
            'tipo_pedido',
            'centro_nombre',
            'tipo_centro',
            'fecha_entrega_deseada',
            'observaciones',
            'estado_suministro',
            'numero_comensales',
            'respuesta_productor',
        ]

    def get_certificate_url(self, obj):
        request = self.context.get('request')
        if obj.product and obj.product.certificate and hasattr(obj.product.certificate, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.product.certificate.url)
        return ""

class SubscriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionItem
        fields = [
            'id',
            'product',
            'product_name',
            'quantity',
        ]

class SubscriptionSerializer(serializers.ModelSerializer):
    size_display = serializers.CharField(source='get_size_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    delivery_day_display = serializers.CharField(source='get_delivery_day_display', read_only=True)
    items = SubscriptionItemSerializer(many=True, read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id',
            'size',
            'size_display',
            'frequency',
            'frequency_display',
            'status',
            'status_display',
            'delivery_day',
            'delivery_day_display',
            'created_at',
            'updated_at',
            'last_processed_at',
            'items',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'last_processed_at']


class EcoBoxItemSerializer(serializers.ModelSerializer):
    product_details = ProductoSerializer(source='producto', read_only=True)
    product = serializers.IntegerField(source='producto.id', read_only=True)
    product_name = serializers.CharField(source='producto.name', read_only=True)
    nombre_producto = serializers.CharField(source='producto.name', read_only=True)
    quantity = serializers.IntegerField(source='cantidad', read_only=True)
    precio_historico = serializers.DecimalField(source='precio_estimado', max_digits=10, decimal_places=2, read_only=True)
    precio_unitario = serializers.DecimalField(source='precio_estimado', max_digits=10, decimal_places=2, read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = EcoBoxItem
        fields = [
            'id',
            'producto',
            'product',
            'product_name',
            'nombre_producto',
            'product_details',
            'cantidad',
            'quantity',
            'unidad',
            'precio_estimado',
            'precio_historico',
            'precio_unitario',
            'subtotal',
            'observaciones',
        ]

    def get_subtotal(self, obj):
        return obj.precio_estimado * obj.cantidad


class EcoBoxSerializer(serializers.ModelSerializer):
    items = EcoBoxItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    total_estimated = serializers.SerializerMethodField()
    total_estimado = serializers.SerializerMethodField()

    class Meta:
        model = EcoBox
        fields = [
            'id',
            'user',
            'nombre',
            'descripcion',
            'numero_comensales',
            'frecuencia',
            'fecha_inicio',
            'proxima_entrega',
            'estado',
            'observaciones',
            'items',
            'items_count',
            'total_estimated',
            'total_estimado',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'items_count', 'total_estimated', 'total_estimado', 'created_at', 'updated_at']

    def get_items_count(self, obj):
        return obj.items.count()

    def get_total_estimated(self, obj):
        from decimal import Decimal
        total = Decimal('0.00')
        for item in obj.items.all():
            total += item.precio_estimado * item.cantidad
        return total

    def get_total_estimado(self, obj):
        return self.get_total_estimated(obj)