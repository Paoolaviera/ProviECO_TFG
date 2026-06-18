from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import Producto, CartItem, Review
from .serializers import ProductoSerializer, CartItemSerializer, ReviewSerializer
from orders.models import Order, OrderItem
from .permissions import IsOwnerOrReadOnly, IsProductor
from .services.recipe_service import parse_ingredients, generate_recipe_from_ingredients


class ProductoViewSet(viewsets.ModelViewSet):
    # Placeholder requerido por DRF para introspección (schemas, etc.).
    # La lógica real de filtrado la gestiona get_queryset().
    queryset = Producto.objects.none()
    serializer_class = ProductoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'origin']
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])

    def trazabilidad(self, request, pk=None):
        producto = self.get_object()

        order_id = request.query_params.get('order_id')
        order = None
        
        if order_id:
            try:
                order = Order.objects.filter(id=order_id, items__product=producto).first()
            except Exception:
                pass
        
        if not order:
            order = Order.objects.filter(items__product=producto, tipo_pedido__in=['PEDIDO_PLANIFICADO', 'PLANIFICADO_RESTAURACION']).order_by('-created_at').first()

        return Response({
            "id": producto.id,
            "nombre": producto.name,
            "origen": producto.origin,
            "lote": producto.lote,
            "finca_origen": producto.finca_origen,
            "fecha_cosecha": producto.fecha_cosecha,
            "certificado": request.build_absolute_uri(producto.certificate.url)
            if producto.certificate else None,
            "qr_url": request.build_absolute_uri(producto.qr_image.url)
            if producto.qr_image else None,
            "productor": producto.owner.first_name or producto.owner.username,
            "order_id": order.id if order else None,
            "fecha_entrega_prevista": order.fecha_entrega_deseada if order else None,
            "centro_destinatario": order.centro_nombre or (order.user.nombre_centro if getattr(order.user, 'nombre_centro', None) else order.user.username) if order else None,
            "estado_suministro": order.estado_suministro if order else None,
            "respuesta_productor": order.respuesta_productor if order else None,
            "frecuencia": order.frecuencia if order else None,
            "tipo_pedido": order.tipo_pedido if order else None,
        })


    def get_queryset(self):
        """
        - ADMIN/is_staff/is_superuser: todos los productos.
        - PRODUCTOR autenticado: sus propios productos (todos los estados) + el resto VERIFICADO con certificado ecológico.
        - Usuarios anónimos o CLIENTE o RESTAURACION: solo productos VERIFICADO y con certificado ecológico.
        """
        user = self.request.user
        if user.is_authenticated and (user.is_staff or user.is_superuser or getattr(user, 'rol', None) == 'ADMIN'):
            return Producto.objects.all().order_by('-id')
        if user.is_authenticated and getattr(user, 'rol', None) == 'PRODUCTOR':
            return Producto.objects.filter(
                Q(owner=user) | (Q(verification_status='VERIFICADO') & ~Q(certificate=None) & ~Q(certificate=''))
            ).order_by('-id').distinct()
        return Producto.objects.filter(
            verification_status='VERIFICADO'
        ).exclude(Q(certificate=None) | Q(certificate='')).order_by('-id')

    def get_permissions(self):
        """
        - GET list/retrieve: cualquiera puede ver productos.
        - POST create: solo usuarios autenticados con rol PRODUCTOR.
        - PUT/PATCH/DELETE: solo el dueño del producto.
        """
        if self.action in ['create']:
            permission_classes = [permissions.IsAuthenticated, IsProductor]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
        else:
            permission_classes = [permissions.AllowAny]

        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        # Al crear un producto, siempre queda pendiente de verificación.
        serializer.save(
            owner=self.request.user,
            verification_status='PENDIENTE'
        )

    def perform_update(self, serializer):
        # Si el productor edita el producto, vuelve a quedar pendiente.
        serializer.save(
            verification_status='PENDIENTE'
        )


class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def generate_recipe(self, request):
        cart_items = self.get_queryset()
        raw_ingredients = [item.producto.name for item in cart_items]
        
        cleaned_ingredients = parse_ingredients(raw_ingredients)
        recipe_html = generate_recipe_from_ingredients(cleaned_ingredients)
        
        return Response({'recipe_html': recipe_html})

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated]

        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = Review.objects.select_related('user', 'product', 'product__owner')

        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)

        producer_id = self.request.query_params.get('producer')
        if producer_id:
            queryset = queryset.filter(product__owner_id=producer_id)

        return queryset

    def perform_create(self, serializer):
        product = serializer.validated_data['product']

        has_paid_order = OrderItem.objects.filter(
            order__user=self.request.user,
            order__status='PAID',
            product=product
        ).exists()

        if not has_paid_order:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Solo puedes reseñar productos que hayas comprado.")

        serializer.save(user=self.request.user)