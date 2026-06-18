from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from .models import AdminActionLog, UserEmailLog, Address, UserPreferences
from django.contrib.auth import get_user_model
from .models import ContactMessage
from products.models import Producto
from products.serializers import ProductoSerializer
from .serializers import (
    AdminActionLogSerializer,
    AdminUserSerializer,
    UserSerializer,
    ContactMessageSerializer,
    AddressSerializer,
    UserPreferencesSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        # Guardamos el usuario en la Base de Datos
        user = serializer.save()

        # Enviamos correo de bienvenida
        context = {'user': user}
        html_message = render_to_string('emails/register_successful.html', context)
        plain_message = strip_tags(html_message)

        try:
            email = EmailMultiAlternatives(
                subject='🌱 ¡Bienvenido a ProviECO!',
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=False)

            # Registramos el ÉXITO
            UserEmailLog.objects.create(
                user=user,
                tipo_email='BIENVENIDA',
                status='ENVIADO'
            )
        except Exception as e:
            # Registramos el FALLO
            UserEmailLog.objects.create(
                user=user,
                tipo_email='BIENVENIDA',
                status='FALLIDO',
                error_message=str(e)
            )
            # Imprimimos el error en consola por si queremos depurar sin romper el registro del usuario.
            print(f"Error enviando email a {user.email}: {e}")

class ContactMessageCreateView(generics.CreateAPIView):
    queryset = ContactMessage.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = ContactMessageSerializer

class ProducerListView(generics.ListAPIView):
    queryset = User.objects.filter(rol='PRODUCTOR')
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer


class ProducerProfileView(APIView):
    """
    HU16 – Public producer profile.
    Returns producer info, their products (with ratings), and all reviews.
    Accessible by any authenticated user.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, producer_id):
        try:
            producer = User.objects.get(id=producer_id, rol='PRODUCTOR')
        except User.DoesNotExist:
            return Response(
                {'detail': 'Productor no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        products = Producto.objects.filter(
            owner=producer,
            verification_status='VERIFICADO',
        ).order_by('-id')

        products_data = ProductoSerializer(
            products, many=True, context={'request': request}
        ).data

        from products.models import Review
        reviews = Review.objects.filter(
            product__owner=producer,
        ).select_related('user', 'product').order_by('-created_at')

        from products.serializers import ReviewSerializer
        reviews_data = ReviewSerializer(reviews, many=True).data

        # Aggregate rating across ALL producer reviews
        total_ratings = sum(r.rating for r in reviews)
        review_count = reviews.count()
        average_rating = round(total_ratings / review_count, 1) if review_count else 0

        full_name = f"{producer.first_name} {producer.last_name}".strip()

        return Response({
            'id': producer.id,
            'name': full_name or producer.username,
            'email': producer.email,
            'provincia': producer.provincia or '',
            'date_joined': producer.date_joined,
            'average_rating': average_rating,
            'total_reviews': review_count,
            'total_products': products.count(),
            'products': products_data,
            'reviews': reviews_data,
        })

class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


# ── Addresses CRUD ──────────────────────────────────────────────

class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)


# ── User Preferences ───────────────────────────────────────────

class UserPreferencesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        prefs, _ = UserPreferences.objects.get_or_create(user=request.user)
        serializer = UserPreferencesSerializer(prefs)
        return Response(serializer.data)

    def patch(self, request):
        prefs, _ = UserPreferences.objects.get_or_create(user=request.user)
        serializer = UserPreferencesSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Change Password ────────────────────────────────────────────

class ChangePasswordView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Contraseña actualizada correctamente.'})


class IsPlatformAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


def log_admin_action(admin, action, target_type, target_id='', detail=''):
    AdminActionLog.objects.create(
        admin=admin,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else '',
        detail=detail,
    )


class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = (IsPlatformAdmin,)

    def get_queryset(self):
        return User.objects.all().order_by('-date_joined')


class AdminUserDetailView(APIView):
    permission_classes = (IsPlatformAdmin,)

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        requested_is_active = request.data.get('is_active')
        is_deactivation = requested_is_active in (False, 'false', 'False', '0', 0)

        if user.id == request.user.id and is_deactivation:
            return Response(
                {'detail': 'No puedes desactivar tu propia cuenta administradora.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.is_superuser and user.id != request.user.id:
            return Response(
                {'detail': 'No puedes modificar otra cuenta superadministradora.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if 'rol' in request.data:
            log_admin_action(
                request.user,
                'USER_ROLE_UPDATED',
                'USER',
                user.id,
                f'Rol actualizado a {user.rol}: {user.email}'
            )
        else:
            state = 'activada' if user.is_active else 'desactivada'
            log_admin_action(
                request.user,
                'USER_STATUS_UPDATED',
                'USER',
                user.id,
                f'Cuenta {state}: {user.email}'
            )

        return Response(serializer.data)

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if user.id == request.user.id:
            return Response(
                {'detail': 'No puedes eliminar tu propia cuenta administradora.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.is_superuser:
            return Response(
                {'detail': 'No puedes eliminar una cuenta superadministradora.'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_email = user.email
        user.delete()

        log_admin_action(
            request.user,
            'USER_DELETED',
            'USER',
            user_id,
            f'Cuenta eliminada: {user_email}'
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminContactMessageListView(generics.ListAPIView):
    serializer_class = ContactMessageSerializer
    permission_classes = (IsPlatformAdmin,)

    def get_queryset(self):
        return ContactMessage.objects.all().order_by('-created_at')[:100]


class AdminProductListView(generics.ListAPIView):
    serializer_class = ProductoSerializer
    permission_classes = (IsPlatformAdmin,)

    def get_queryset(self):
        return Producto.objects.select_related('owner').all().order_by('-id')


class AdminProductDetailView(APIView):
    permission_classes = (IsPlatformAdmin,)

    def patch(self, request, product_id):
        try:
            product = Producto.objects.select_related('owner').get(id=product_id)
        except Producto.DoesNotExist:
            return Response({'detail': 'Producto no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('verification_status')
        observaciones = request.data.get('observaciones_admin')
        valid_statuses = {'PENDIENTE', 'VERIFICADO', 'RECHAZADO'}

        if new_status not in valid_statuses:
            return Response(
                {'verification_status': 'Estado de verificacion no valido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        product.verification_status = new_status
        update_fields = ['verification_status']
        if observaciones is not None:
            product.observaciones_admin = observaciones
            update_fields.append('observaciones_admin')

        product.save(update_fields=update_fields)

        log_admin_action(
            request.user,
            'PRODUCT_VERIFICATION_UPDATED',
            'PRODUCT',
            product.id,
            f'{product.name}: {new_status}'
        )

        return Response(ProductoSerializer(product, context={'request': request}).data)

    def delete(self, request, product_id):
        try:
            product = Producto.objects.get(id=product_id)
        except Producto.DoesNotExist:
            return Response({'detail': 'Producto no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        product_name = product.name
        product.delete()

        log_admin_action(
            request.user,
            'PRODUCT_DELETED',
            'PRODUCT',
            product_id,
            f'Producto eliminado: {product_name}'
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminActionLogListView(generics.ListAPIView):
    serializer_class = AdminActionLogSerializer
    permission_classes = (IsPlatformAdmin,)

    def get_queryset(self):
        return AdminActionLog.objects.select_related('admin').all()[:100]

from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone

class SubirDocumentoView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        user = request.user
        if user.rol != 'RESTAURACION':
            return Response({'detail': 'Solo las cuentas de restauración colectiva pueden subir documentos justificativos.'}, status=status.HTTP_403_FORBIDDEN)
        
        documento = request.FILES.get('documento_centro')
        if not documento:
            return Response({'detail': 'No se ha proporcionado ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.documento_centro = documento
        user.estado_validacion_centro = 'PENDIENTE'
        user.fecha_subida_documento = timezone.now()
        user.save()
        
        return Response(UserSerializer(user, context={'request': request}).data)


class ValidarCentroView(APIView):
    permission_classes = (IsPlatformAdmin,)

    def post(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        
        nuevo_estado = request.data.get('estado')
        observaciones = request.data.get('observaciones', '')
        
        if nuevo_estado not in ['PENDIENTE', 'VALIDADO', 'RECHAZADO']:
            return Response({'detail': 'Estado de validación no válido.'}, status=status.HTTP_400_BAD_REQUEST)
        
        target_user.estado_validacion_centro = nuevo_estado
        target_user.observaciones_validacion_admin = observaciones
        target_user.fecha_validacion_centro = timezone.now()
        target_user.save()
        
        log_admin_action(
            request.user,
            'RESTAURACION_VALIDATION_UPDATED',
            'USER',
            target_user.id,
            f'{target_user.username}: {nuevo_estado}'
        )
        
        return Response(AdminUserSerializer(target_user, context={'request': request}).data)


