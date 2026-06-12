from rest_framework import serializers
from .models import Order, OrderItem, Subscription, SubscriptionItem


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