from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AdminActionLog, ContactMessage, Address, UserPreferences

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    username = serializers.CharField(required=False)
    documento_centro = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'password',
            'rol', 'telefono', 'direccion', 'provincia', 'is_active',
            'is_staff', 'is_superuser', 'nombre_centro', 'tipo_centro',
            'persona_responsable', 'observaciones_centro',
            'documento_centro', 'estado_validacion_centro', 'fecha_subida_documento',
            'fecha_validacion_centro', 'observaciones_validacion_admin'
        )
        read_only_fields = (
            'id', 'is_active', 'is_staff', 'is_superuser', 
            'estado_validacion_centro', 'fecha_subida_documento',
            'fecha_validacion_centro', 'observaciones_validacion_admin'
        )

    def create(self, validated_data):
        documento = validated_data.get('documento_centro', None)
        user = User.objects.create_user(
            username=validated_data['email'], # Use email as username
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            rol=validated_data.get('rol', 'CLIENTE'), # Default to CLIENTE
            telefono=validated_data.get('telefono', ''),
            direccion=validated_data.get('direccion', ''),
            provincia=validated_data.get('provincia', ''),
            nombre_centro=validated_data.get('nombre_centro', ''),
            tipo_centro=validated_data.get('tipo_centro', None),
            persona_responsable=validated_data.get('persona_responsable', ''),
            observaciones_centro=validated_data.get('observaciones_centro', ''),
            documento_centro=documento
        )
        if documento:
            from django.utils import timezone
            user.fecha_subida_documento = timezone.now()
            user.save()
        # Create default preferences for new users
        UserPreferences.objects.get_or_create(user=user)
        return user

class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'

    def validate(self, attrs):
        motivo = attrs.get('motivo', '')
        email = attrs.get('email', '')

        if motivo == 'Quiero ser productor' and not User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({
                'email': 'Para solicitar el alta como productor primero debes tener una cuenta registrada.'
            })

        return attrs


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            'id', 'label', 'address_line', 'city', 'provincia',
            'postal_code', 'address_type', 'is_default',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        fields = ('theme', 'font_size', 'notifications_enabled')


class ChangePasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=6, max_length=128)
    confirm_password = serializers.CharField(min_length=6, max_length=128)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Las contraseñas no coinciden.'})
        return data


class AdminUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'rol', 'telefono', 'direccion', 'provincia', 'is_active',
            'is_staff', 'is_superuser', 'date_joined', 'last_login',
            'nombre_centro', 'tipo_centro', 'persona_responsable', 'observaciones_centro',
            'documento_centro', 'estado_validacion_centro', 'fecha_subida_documento',
            'fecha_validacion_centro', 'observaciones_validacion_admin'
        )
        read_only_fields = (
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'telefono', 'direccion', 'provincia', 'is_staff',
            'is_superuser', 'date_joined', 'last_login',
            'nombre_centro', 'tipo_centro', 'persona_responsable', 'observaciones_centro',
            'documento_centro', 'fecha_subida_documento'
        )

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def validate_rol(self, value):
        valid_roles = {choice[0] for choice in User.ROLE_CHOICES}

        if value not in valid_roles:
            raise serializers.ValidationError('Rol no valido.')

        return value


class AdminActionLogSerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(source='admin.email', read_only=True)

    class Meta:
        model = AdminActionLog
        fields = (
            'id', 'admin', 'admin_email', 'action', 'target_type',
            'target_id', 'detail', 'created_at'
        )
        read_only_fields = fields

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'] = serializers.EmailField()
        if 'username' in self.fields:
            del self.fields['username']

    def validate(self, attrs):
        email = attrs.get('email')
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError('Email o contraseña incorrectos.')

        attrs['username'] = user.username
        data = super().validate(attrs)

        # Ensure preferences exist
        prefs, _ = UserPreferences.objects.get_or_create(user=self.user)

        # Add custom claims
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'name': f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username,
            'rol': 'ADMIN' if self.user.is_staff or self.user.is_superuser else self.user.rol,
            'provincia': self.user.provincia or '',
            'telefono': self.user.telefono or '',
            'direccion': self.user.direccion or '',
            'is_staff': self.user.is_staff,
            'is_superuser': self.user.is_superuser,
            'nombre_centro': self.user.nombre_centro or '',
            'tipo_centro': self.user.tipo_centro or '',
            'persona_responsable': self.user.persona_responsable or '',
            'observaciones_centro': self.user.observaciones_centro or '',
            'documento_centro': self.user.documento_centro.url if self.user.documento_centro else '',
            'estado_validacion_centro': self.user.estado_validacion_centro,
            'observaciones_validacion_admin': self.user.observaciones_validacion_admin or '',
        }

        # Include preferences in login response
        data['preferences'] = {
            'theme': prefs.theme,
            'font_size': prefs.font_size,
            'notifications_enabled': prefs.notifications_enabled,
        }

        return data

