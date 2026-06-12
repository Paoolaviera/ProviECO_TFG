from decimal import Decimal

from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from products.models import CartItem
from .serializers import OrderSerializer, CreateOrderSerializer, SimulatedPaymentSerializer, ProducerSaleSerializer, SubscriptionSerializer

from .models import Order, OrderItem, EmailLog, Subscription, SubscriptionItem


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    orders = Order.objects.filter(user=request.user).order_by('-created_at')
    serializer = OrderSerializer(orders, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def producer_sales(request):
    sales = OrderItem.objects.filter(
        product__owner=request.user
    ).select_related('order', 'order__user').order_by('-order__created_at')
    serializer = ProducerSaleSerializer(sales, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order_from_cart(request):
    serializer = CreateOrderSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    cart_items = CartItem.objects.filter(user=request.user).select_related('producto')

    if not cart_items.exists():
        return Response(
            {'detail': 'El carrito está vacío.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    order = Order.objects.create(
        user=request.user,
        delivery_type=serializer.validated_data['delivery_type'],
        delivery_address=serializer.validated_data['delivery_address'],
        status='PENDING_PAYMENT',
        total=Decimal('0.00'),
    )

    total = Decimal('0.00')

    for item in cart_items:
        product = item.producto
        quantity = item.cantidad
        unit_price = product.price
        subtotal = unit_price * quantity

        OrderItem.objects.create(
            order=order,
            product=product,
            product_name=product.name,
            quantity=quantity,
            unit_price=unit_price,
            subtotal=subtotal,
        )

        total += subtotal

    order.total = total
    order.save()

    cart_items.delete()

    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def simulate_payment(request, order_id):
    try:
        order = Order.objects.get(id=order_id, user=request.user)
    except Order.DoesNotExist:
        return Response(
            {'detail': 'Pedido no encontrado.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if order.status == 'PAID':
        return Response(
            {'detail': 'Este pedido ya está pagado.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = SimulatedPaymentSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    card_number = serializer.validated_data['card_number'].replace(' ', '')

    if card_number.endswith('0'):
        order.status = 'FAILED'
        order.save()

        return Response(
            {
                'success': False,
                'detail': 'Pago rechazado por la pasarela simulada.'
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    order.status = 'PAID'
    order.paid_at = timezone.now()
    order.save()

    # Decrement product stock
    for item in order.items.all():
        if item.product:
            item.product.quantity = max(0, item.product.quantity - item.quantity)
            item.product.save()

    # Decrement product stock
    for item in order.items.all():
        if item.product:
            item.product.quantity = max(0, item.product.quantity - item.quantity)
            item.product.save()

    # =========================================================
    # LÓGICA DE ENVÍO DE EMAIL TRANSACCIONAL CON REGISTRO
    # =========================================================

    # 1. Preparamos los datos para la plantilla
    context = {
        'user': request.user,
        'order': order,
        'items': order.items.all()
    }

    # 2. Renderizamos el HTML y creamos una versión en texto plano
    html_message = render_to_string('emails/order_confirmation.html', context)
    plain_message = strip_tags(html_message)

    try:
        email = EmailMultiAlternatives(
            subject=f'🌱 EcoMarket - Confirmación de tu pedido #{order.id}',
            body=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[request.user.email]
        )
        email.attach_alternative(html_message, "text/html")

        # OJO: fail_silently=False es vital para que si falla, salte al "except"
        email.send(fail_silently=False)

        # 4. Registramos el ÉXITO
        EmailLog.objects.create(
            order=order,
            email_address=request.user.email,
            status='ENVIADO'
        )

    except Exception as e:
        # 4. Registramos el FALLO
        EmailLog.objects.create(
            order=order,
            email_address=request.user.email,
            status='FALLIDO',
            error_message=str(e)
        )
        # Aquí no paramos el flujo, el usuario ya ha pagado.
        # Devolvemos el 200 OK igual, pero nosotros sabemos que el email falló.

    return Response(
        {
            'success': True,
            'detail': 'Pago realizado correctamente. Te hemos enviado un correo.',
            'order': OrderSerializer(order).data,
        },
        status=status.HTTP_200_OK
    )

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def subscriptions_list_create(request):
    if request.method == 'GET':
        subscriptions = Subscription.objects.filter(user=request.user).order_by('-created_at')
        serializer = SubscriptionSerializer(subscriptions, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        cart_items = CartItem.objects.filter(user=request.user).select_related('producto')
        if not cart_items.exists():
            return Response(
                {'detail': 'El carrito está vacío. Añade productos para crear la suscripción.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SubscriptionSerializer(data=request.data)
        if serializer.is_valid():
            subscription = serializer.save(user=request.user)
            
            for item in cart_items:
                SubscriptionItem.objects.create(
                    subscription=subscription,
                    product=item.producto,
                    product_name=item.producto.name,
                    quantity=item.cantidad
                )
            
            cart_items.delete()
            
            # Send confirmation email
            context = {
                'user': request.user,
                'subscription': subscription
            }
            html_message = render_to_string('emails/subscription_confirmation.html', context)
            plain_message = strip_tags(html_message)

            try:
                email = EmailMultiAlternatives(
                    subject='🌱 EcoMarket - Confirmación de tu Suscripción',
                    body=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[request.user.email]
                )
                email.attach_alternative(html_message, "text/html")
                email.send(fail_silently=True)
            except Exception as e:
                print(f"Failed to send subscription email: {e}")

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def subscription_detail(request, sub_id):
    try:
        subscription = Subscription.objects.get(id=sub_id, user=request.user)
    except Subscription.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    # Solo permitimos actualizar el status
    if 'status' in request.data:
        new_status = request.data['status']
        if new_status in dict(Subscription.STATUS_CHOICES).keys():
            subscription.status = new_status
            subscription.save()
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        else:
            return Response({'detail': 'Estado inválido.'}, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({'detail': 'Debe proporcionar un status.'}, status=status.HTTP_400_BAD_REQUEST)