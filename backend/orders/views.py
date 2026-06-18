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

from products.models import CartItem, Producto
from .serializers import OrderSerializer, CreateOrderSerializer, SimulatedPaymentSerializer, ProducerSaleSerializer, SubscriptionSerializer

from .models import Order, OrderItem, EmailLog, Subscription, SubscriptionItem
from datetime import timedelta

def get_future_dates(start_date, frecuencia):
    """
    Returns a list of 4 dates: [start_date, next_1, next_2, next_3]
    based on the frequency.
    """
    dates = [start_date]
    frec = str(frecuencia or '').upper()
    if frec not in ['SEMANAL', 'QUINCENAL', 'MENSUAL']:
        return dates  # For UNICO, just return the start date
        
    current = start_date
    for _ in range(3):
        if frec == 'SEMANAL':
            current = current + timedelta(days=7)
        elif frec == 'QUINCENAL':
            current = current + timedelta(days=15)
        elif frec == 'MENSUAL':
            # Add 1 month safely
            try:
                if current.month == 12:
                    current = current.replace(year=current.year + 1, month=1)
                else:
                    next_month = current.month + 1
                    valid_date = None
                    for d in range(current.day, 27, -1):
                        try:
                            valid_date = current.replace(month=next_month, day=d)
                            break
                        except ValueError:
                            continue
                    current = valid_date or (current + timedelta(days=30))
            except Exception:
                current = current + timedelta(days=30)
        dates.append(current)
    return dates


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

    # Validar productos del carrito antes de crear el objeto Order
    for item in cart_items:
        product = item.producto
        if not product.certificate or product.verification_status != 'VERIFICADO':
            return Response(
                {'detail': f"El producto {product.name} no está disponible (requiere certificado ecológico verificado)."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if item.cantidad <= 0:
            return Response(
                {'detail': f"La cantidad para {product.name} debe ser mayor a cero."},
                status=status.HTTP_400_BAD_REQUEST
            )

    from django.db import transaction

    try:
        with transaction.atomic():
            # 1. Validate stock for all items first
            for item in cart_items:
                product = item.producto
                if product.quantity < item.cantidad:
                    return Response(
                        {'detail': f"Stock insuficiente para {product.name}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # 2. Create the order
            order = Order.objects.create(
                user=request.user,
                delivery_type=serializer.validated_data['delivery_type'],
                delivery_address=serializer.validated_data['delivery_address'],
                status='PENDING_PAYMENT',
                tipo_pedido='NORMAL',
                total=Decimal('0.00'),
            )

            total = Decimal('0.00')

            # 3. Create items and decrement stock
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

                product.quantity = max(0, product.quantity - quantity)
                product.save(update_fields=['quantity'])

                total += subtotal

            order.total = total
            order.save()

            cart_items.delete()

    except Exception as e:
        return Response(
            {'detail': f"Error al procesar la compra: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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

        # Restore stock if normal purchase
        if order.tipo_pedido in ['COMPRA_DIRECTA', 'NORMAL']:
            for item in order.items.all():
                if item.product:
                    item.product.quantity += item.quantity
                    item.product.save(update_fields=['quantity'])

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
            subject=f'🌱 ProviECO - Confirmación de tu pedido #{order.id}',
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
                    subject='🌱 ProviECO - Confirmación de tu Suscripción',
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_planned_order(request):
    if request.user.rol != 'RESTAURACION' and not request.user.is_staff and not request.user.is_superuser:
        return Response(
            {'detail': 'Solo los centros de restauración colectiva pueden realizar pedidos planificados.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.user.rol == 'RESTAURACION' and request.user.estado_validacion_centro != 'VALIDADO':
        return Response(
            {'detail': 'Tu cuenta de restauración colectiva aún no ha sido validada por el administrador.'},
            status=status.HTTP_403_FORBIDDEN
        )

    data = request.data
    items_data = data.get('items', [])
    fecha_entrega_deseada = data.get('fecha_entrega_deseada')

    if not items_data:
        return Response({'detail': 'El pedido no contiene productos.'}, status=status.HTTP_400_BAD_REQUEST)
    if not fecha_entrega_deseada:
        return Response({'detail': 'La fecha de entrega deseada es obligatoria.'}, status=status.HTTP_400_BAD_REQUEST)

    from datetime import date
    try:
        parsed_date = date.fromisoformat(fecha_entrega_deseada)
        if parsed_date < date.today():
            return Response({'detail': 'La fecha de entrega deseada no puede estar en el pasado.'}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError:
        return Response({'detail': 'La fecha de entrega deseada no tiene un formato de fecha válido.'}, status=status.HTTP_400_BAD_REQUEST)

    order = Order.objects.create(
        user=request.user,
        delivery_type='ADDRESS',
        delivery_address=request.user.direccion or 'Dirección del centro',
        status='PAID',
        tipo_pedido='PLANIFICADO_RESTAURACION',
        centro_nombre=request.user.nombre_centro or request.user.first_name,
        tipo_centro=request.user.tipo_centro or 'OTRO',
        fecha_entrega_deseada=fecha_entrega_deseada,
        observaciones=data.get('observaciones', ''),
        estado_suministro='PENDIENTE',
        numero_comensales=data.get('numero_comensales'),
        observaciones_menu=data.get('observaciones_menu', ''),
        necesidades_estimadas=data.get('necesidades_estimadas', ''),
        mensaje_centro=data.get('mensaje_centro', ''),
        frecuencia=data.get('frecuencia', 'Único'),
        total=Decimal('0.00')
    )

    total = Decimal('0.00')
    for item in items_data:
        try:
            product = Producto.objects.get(id=item['product_id'])
            if not product.certificate or product.verification_status != 'VERIFICADO':
                order.delete()
                return Response(
                    {'detail': f"El producto {product.name} no está disponible (requiere certificado ecológico verificado)."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Producto.DoesNotExist:
            order.delete()
            return Response({'detail': f"Producto con ID {item['product_id']} no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        quantity = int(item['quantity'])
        if quantity <= 0:
            order.delete()
            return Response({'detail': 'La cantidad de cada producto debe ser mayor a cero.'}, status=status.HTTP_400_BAD_REQUEST)

        if not product.permite_reserva_futura and product.quantity < quantity:
            order.delete()
            return Response({'detail': f"El producto {product.name} no tiene suficiente stock ({product.quantity}) y no permite reserva futura."}, status=status.HTTP_400_BAD_REQUEST)

        subtotal = product.price * quantity
        OrderItem.objects.create(
            order=order,
            product=product,
            product_name=product.name,
            quantity=quantity,
            unit_price=product.price,
            subtotal=subtotal
        )
        total += subtotal

    order.total = total
    order.save()

    return Response(OrderSerializer(order, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_order_supply_status(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'detail': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    is_producer_item = OrderItem.objects.filter(order=order, product__owner=request.user).exists()
    if not is_producer_item and not request.user.is_staff and not request.user.is_superuser:
        return Response({'detail': 'No tienes permisos sobre este pedido.'}, status=status.HTTP_403_FORBIDDEN)

    nuevo_estado = request.data.get('estado_suministro')
    if nuevo_estado not in ['PENDIENTE', 'ACEPTADO', 'CONFIRMADO', 'PARCIALMENTE_ACEPTADO', 'EN_PREPARACION', 'EN_REPARTO', 'ENTREGADO', 'CANCELADO', 'RECHAZADO', 'RECHAZADO_PARCIAL']:
        return Response({'detail': 'Estado de suministro no válido.'}, status=status.HTTP_400_BAD_REQUEST)

    respuesta_productor = request.data.get('respuesta_productor')
    if respuesta_productor is not None:
        order.respuesta_productor = respuesta_productor
        order.fecha_respuesta_productor = timezone.now()

    viejo_estado = order.estado_suministro
    order.estado_suministro = nuevo_estado
    order.save()

    return Response(OrderSerializer(order, context={'request': request}).data)


from .serializers import EcoBoxSerializer, EcoBoxItemSerializer
from .models import EcoBox, EcoBoxItem

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def ecobox_list_create(request):
    if request.user.rol != 'RESTAURACION' and not request.user.is_staff and not request.user.is_superuser:
        return Response({'detail': 'Solo los centros de restauración colectiva pueden gestionar EcoBoxes.'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        boxes = EcoBox.objects.filter(user=request.user).order_by('-created_at')
        serializer = EcoBoxSerializer(boxes, many=True, context={'request': request})
        return Response(serializer.data)
        
    elif request.method == 'POST':
        if request.user.estado_validacion_centro != 'VALIDADO':
            return Response(
                {'detail': 'Tu cuenta de restauración colectiva aún no ha sido validada por el administrador.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = EcoBoxSerializer(data=request.data)
        if serializer.is_valid():
            ecobox = serializer.save(user=request.user)
            items_data = request.data.get('items', [])
            for item in items_data:
                try:
                    product = Producto.objects.get(id=item['producto'])
                    if not product.certificate or product.verification_status != 'VERIFICADO':
                        continue
                except Producto.DoesNotExist:
                    continue
                
                cantidad = int(item.get('cantidad', 1))
                if cantidad <= 0:
                    ecobox.delete()
                    return Response({'detail': 'La cantidad de cada producto en la EcoBox debe ser mayor a cero.'}, status=status.HTTP_400_BAD_REQUEST)
                
                EcoBoxItem.objects.create(
                    ecobox=ecobox,
                    producto=product,
                    cantidad=cantidad,
                    unidad=item.get('unidad', product.unit or 'kg'),
                    precio_estimado=product.price,
                    observaciones=item.get('observaciones', '')
                )
            return Response(EcoBoxSerializer(ecobox, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def ecobox_detail(request, pk):
    try:
        ecobox = EcoBox.objects.get(pk=pk, user=request.user)
    except EcoBox.DoesNotExist:
        return Response({'detail': 'EcoBox no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        
    if request.method == 'GET':
        return Response(EcoBoxSerializer(ecobox, context={'request': request}).data)
        
    elif request.method == 'PUT':
        if request.user.estado_validacion_centro != 'VALIDADO':
            return Response(
                {'detail': 'Tu cuenta de restauración colectiva aún no ha sido validada por el administrador.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = EcoBoxSerializer(ecobox, data=request.data, partial=True)
        if serializer.is_valid():
            if 'items' in request.data:
                items_data = request.data.get('items', [])
                validated_items = []
                for item in items_data:
                    try:
                        product = Producto.objects.get(id=item['producto'])
                        if not product.certificate or product.verification_status != 'VERIFICADO':
                            continue
                    except Producto.DoesNotExist:
                        continue
                    
                    cantidad = int(item.get('cantidad', 1))
                    if cantidad <= 0:
                        return Response({'detail': 'La cantidad de cada producto en la EcoBox debe ser mayor a cero.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    validated_items.append((product, cantidad, item))
                
                serializer.save()
                ecobox.items.all().delete()
                for product, cantidad, raw_item in validated_items:
                    EcoBoxItem.objects.create(
                        ecobox=ecobox,
                        producto=product,
                        cantidad=cantidad,
                        unidad=raw_item.get('unidad', product.unit or 'kg'),
                        precio_estimado=product.price,
                        observaciones=raw_item.get('observaciones', '')
                    )
            else:
                serializer.save()
            return Response(EcoBoxSerializer(ecobox, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        ecobox.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ecobox_create_order(request, pk):
    if request.user.rol != 'RESTAURACION' and not request.user.is_staff and not request.user.is_superuser:
        return Response({'detail': 'Solo los centros de restauración colectiva pueden realizar pedidos planificados.'}, status=status.HTTP_403_FORBIDDEN)
        
    if request.user.estado_validacion_centro != 'VALIDADO':
        return Response(
            {'detail': 'Tu cuenta de restauración colectiva aún no ha sido validada por el administrador.'},
            status=status.HTTP_403_FORBIDDEN
        )
        
    try:
        ecobox = EcoBox.objects.get(pk=pk, user=request.user)
    except EcoBox.DoesNotExist:
        return Response({'detail': 'EcoBox no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        
    if not ecobox.items.exists():
        return Response({'detail': 'La EcoBox está vacía.'}, status=status.HTTP_400_BAD_REQUEST)
        
    fecha_entrega = request.data.get('fecha_entrega_deseada')
    if not fecha_entrega:
        return Response({'detail': 'La fecha de entrega deseada es obligatoria.'}, status=status.HTTP_400_BAD_REQUEST)
        
    from datetime import date
    try:
        parsed_date = date.fromisoformat(fecha_entrega)
        if parsed_date < date.today():
            return Response({'detail': 'La fecha de entrega deseada no puede estar en el pasado.'}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError:
        return Response({'detail': 'La fecha de entrega deseada no tiene un formato de fecha válido.'}, status=status.HTTP_400_BAD_REQUEST)

    future_dates = get_future_dates(parsed_date, ecobox.frecuencia)
    proxima_entrega = future_dates[1] if len(future_dates) > 1 else None

    order = Order.objects.create(
        user=request.user,
        delivery_type='ADDRESS',
        delivery_address=request.user.direccion or 'Dirección del centro',
        status='PAID',
        tipo_pedido='PLANIFICADO_RESTAURACION',
        centro_nombre=request.user.nombre_centro or request.user.first_name,
        tipo_centro=request.user.tipo_centro or 'OTRO',
        fecha_entrega_deseada=fecha_entrega,
        observaciones=request.data.get('observaciones', ecobox.observaciones or ''),
        estado_suministro='PENDIENTE',
        numero_comensales=ecobox.numero_comensales,
        observaciones_menu=ecobox.descripcion,
        frecuencia=ecobox.frecuencia,
        mensaje_centro=request.data.get('mensaje_centro', ''),
        ecobox_id=ecobox.id,
        ecobox_nombre=ecobox.nombre,
        proxima_entrega=proxima_entrega,
        total=Decimal('0.00')
    )
    
    total = Decimal('0.00')
    for item in ecobox.items.all():
        product = item.producto
        quantity = item.cantidad
        
        if not product.certificate or product.verification_status != 'VERIFICADO':
            order.delete()
            return Response({'detail': f"El producto {product.name} no está disponible (requiere certificado ecológico verificado)."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not product.permite_reserva_futura and product.quantity < quantity:
            order.delete()
            return Response({'detail': f"El producto {product.name} no tiene suficiente stock ({product.quantity}) y no permite reserva futura."}, status=status.HTTP_400_BAD_REQUEST)
            
        subtotal = product.price * quantity
        OrderItem.objects.create(
            order=order,
            product=product,
            product_name=product.name,
            quantity=quantity,
            unit_price=product.price,
            subtotal=subtotal
        )
        total += subtotal
        
    order.total = total
    order.save()
    
    return Response(OrderSerializer(order, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'detail': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        
    is_producer = OrderItem.objects.filter(order=order, product__owner=request.user).exists()
    if order.user != request.user and not is_producer and not request.user.is_staff and not request.user.is_superuser:
        return Response({'detail': 'No tienes permisos sobre este pedido.'}, status=status.HTTP_403_FORBIDDEN)
        
    return Response(OrderSerializer(order, context={'request': request}).data)


def recalculate_order_status(order):
    items = list(order.items.all())
    if not items:
        return

    total = len(items)
    pending = sum(1 for i in items if i.estado_productor == 'PENDIENTE')
    accepted = sum(1 for i in items if i.estado_productor == 'ACEPTADO')
    rejected = sum(1 for i in items if i.estado_productor == 'RECHAZADO')
    prep = sum(1 for i in items if i.estado_productor == 'EN_PREPARACION')
    delivered = sum(1 for i in items if i.estado_productor == 'ENTREGADO')

    if pending == total:
        order.estado_suministro = 'PENDIENTE'
    elif delivered == total:
        order.estado_suministro = 'ENTREGADO'
    elif prep == total or (prep > 0 and prep + delivered + accepted == total):
        order.estado_suministro = 'EN_PREPARACION'
    elif accepted == total:
        order.estado_suministro = 'CONFIRMADO'
    elif rejected == total:
        order.estado_suministro = 'RECHAZADO'
    elif rejected > 0 and (accepted > 0 or prep > 0 or delivered > 0):
        order.estado_suministro = 'RECHAZADO_PARCIAL'
    elif accepted > 0 and pending > 0:
        order.estado_suministro = 'PARCIALMENTE_ACEPTADO'
    elif rejected > 0 and pending > 0:
        order.estado_suministro = 'RECHAZADO_PARCIAL'
    else:
        order.estado_suministro = 'PENDIENTE'

    order.save()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def producer_requests(request):
    if request.user.rol != 'PRODUCTOR' and not request.user.is_staff and not request.user.is_superuser:
        return Response({'detail': 'No tienes permisos para ver solicitudes.'}, status=status.HTTP_403_FORBIDDEN)

    items = OrderItem.objects.filter(
        product__owner=request.user,
        order__tipo_pedido__in=['PEDIDO_PLANIFICADO', 'PLANIFICADO_RESTAURACION']
    ).select_related('order', 'order__user', 'product').order_by('-order__created_at')

    data = []
    for item in items:
        frec = str(item.order.frecuencia or '').upper()
        if frec == 'UNICO':
            frec_texto = 'Entrega única'
        elif frec == 'SEMANAL':
            frec_texto = 'Semanal'
        elif frec == 'QUINCENAL':
            frec_texto = 'Quincenal, cada 15 días'
        elif frec == 'MENSUAL':
            frec_texto = 'Mensual'
        else:
            frec_texto = item.order.frecuencia or 'Entrega única'

        data.append({
            'id': item.id,
            'order_id': item.order.id,
            'buyer_name': item.order.user.nombre_centro or f"{item.order.user.first_name} {item.order.user.last_name}".strip() or item.order.user.email,
            'fecha_entrega_deseada': item.order.fecha_entrega_deseada,
            'product_name': item.product_name,
            'quantity': item.quantity,
            'unit': item.product.unit if item.product else 'uds',
            'unit_price': item.unit_price,
            'subtotal': item.subtotal,
            'estado_productor': item.estado_productor,
            'observaciones_productor': item.observaciones_productor or '',
            'estado_suministro': item.order.estado_suministro,
            'observaciones_centro': item.order.observaciones or '',
            'created_at': item.order.created_at,
            'frecuencia': item.order.frecuencia or 'UNICO',
            'frecuencia_texto': frec_texto,
            'texto_frecuencia': frec_texto,
            'ecobox_nombre': item.order.ecobox_nombre or ''
        })
        
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_producer_request(request, pk):
    if request.user.rol != 'PRODUCTOR' and not request.user.is_staff and not request.user.is_superuser:
        return Response({'detail': 'No tienes permisos.'}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        item = OrderItem.objects.get(id=pk)
    except OrderItem.DoesNotExist:
        return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    if not item.product:
        return Response({'detail': 'El producto asociado a esta solicitud ya no existe.'}, status=status.HTTP_400_BAD_REQUEST)

    # Permission check: must own the product or be admin
    if item.product.owner != request.user and not request.user.is_staff and not request.user.is_superuser:
        print("Usuario autenticado:", request.user.id, request.user.email)
        print("Producto:", item.product.id, item.product_name)
        print("Productor del producto:", item.product.owner.id if item.product.owner else None)
        print("Estado línea:", item.estado_productor)
        return Response({'detail': 'No tienes permisos sobre esta solicitud.'}, status=status.HTTP_403_FORBIDDEN)

    if item.estado_productor != 'PENDIENTE':
        return Response({'detail': 'No se puede aceptar una solicitud que no está pendiente.'}, status=status.HTTP_400_BAD_REQUEST)

    item.estado_productor = 'ACEPTADO'
    item.save()

    recalculate_order_status(item.order)
    
    return Response({'detail': 'Solicitud aceptada correctamente.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_producer_request(request, pk):
    if request.user.rol != 'PRODUCTOR' and not request.user.is_staff and not request.user.is_superuser:
        return Response({'detail': 'No tienes permisos.'}, status=status.HTTP_403_FORBIDDEN)
        
    try:
        item = OrderItem.objects.get(id=pk)
    except OrderItem.DoesNotExist:
        return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    if not item.product:
        return Response({'detail': 'El producto asociado a esta solicitud ya no existe.'}, status=status.HTTP_400_BAD_REQUEST)

    # Permission check: must own the product or be admin
    if item.product.owner != request.user and not request.user.is_staff and not request.user.is_superuser:
        print("Usuario autenticado:", request.user.id, request.user.email)
        print("Producto:", item.product.id, item.product_name)
        print("Productor del producto:", item.product.owner.id if item.product.owner else None)
        print("Estado línea:", item.estado_productor)
        return Response({'detail': 'No tienes permisos sobre esta solicitud.'}, status=status.HTTP_403_FORBIDDEN)

    if item.estado_productor != 'PENDIENTE':
        return Response({'detail': 'No se puede rechazar una solicitud que no está pendiente.'}, status=status.HTTP_400_BAD_REQUEST)

    item.estado_productor = 'RECHAZADO'
    observaciones = request.data.get('observaciones_productor', '')
    item.observaciones_productor = observaciones
    item.save()

    recalculate_order_status(item.order)
    
    return Response({'detail': 'Solicitud rechazada correctamente.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def producer_calendar(request):
    if request.user.rol != 'PRODUCTOR' and not request.user.is_staff and not request.user.is_superuser:
        return Response({'detail': 'No tienes permisos para ver el calendario.'}, status=status.HTTP_403_FORBIDDEN)

    # Fetch all items of planned orders owned by this producer
    # that are not RECHAZADO or ENTREGADO
    items = OrderItem.objects.filter(
        product__owner=request.user,
        order__tipo_pedido__in=['PEDIDO_PLANIFICADO', 'PLANIFICADO_RESTAURACION']
    ).exclude(
        estado_productor__in=['RECHAZADO', 'ENTREGADO']
    ).select_related('order', 'order__user', 'product')

    deliveries_by_date = {}

    for item in items:
        start_date = item.order.fecha_entrega_deseada
        if not start_date:
            continue
        
        frecuencia = item.order.frecuencia or 'UNICO'
        future_dates = get_future_dates(start_date, frecuencia)
        
        frec_upper = str(frecuencia).upper()
        if frec_upper == 'UNICO':
            frec_texto = 'Entrega única'
        elif frec_upper == 'SEMANAL':
            frec_texto = 'Semanal'
        elif frec_upper == 'QUINCENAL':
            frec_texto = 'Quincenal, cada 15 días'
        elif frec_upper == 'MENSUAL':
            frec_texto = 'Mensual'
        else:
            frec_texto = frecuencia

        # Now, for each date, we create a delivery item
        for idx, d in enumerate(future_dates):
            date_str = d.isoformat()
            
            is_prevision = idx > 0
            
            delivery = {
                'pedido_id': item.order.id,
                'centro': item.order.user.nombre_centro or f"{item.order.user.first_name} {item.order.user.last_name}".strip() or item.order.user.email,
                'producto': item.product_name,
                'cantidad': item.quantity,
                'unidad': item.product.unit if item.product else 'uds',
                'estado': 'PREVISTA' if is_prevision else item.estado_productor,
                'frecuencia': frecuencia,
                'frecuencia_texto': frec_texto,
                'ecobox_nombre': item.order.ecobox_nombre or '',
                'es_prevision': is_prevision
            }
            
            if date_str not in deliveries_by_date:
                deliveries_by_date[date_str] = []
            deliveries_by_date[date_str].append(delivery)

    # Sort the dictionary keys (dates) and transform into a list
    sorted_dates = sorted(deliveries_by_date.keys())
    result = []
    for d_str in sorted_dates:
        result.append({
            'fecha': d_str,
            'entregas': deliveries_by_date[d_str]
        })

    return Response(result)