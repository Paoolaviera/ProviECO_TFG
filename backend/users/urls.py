from django.urls import path
from .views import (
    AdminActionLogListView,
    AdminContactMessageListView,
    AdminProductDetailView,
    AdminProductListView,
    AdminUserDetailView,
    AdminUserListView,
    RegisterView,
    ContactMessageCreateView,
    ProducerListView,
    ProducerProfileView,
    CustomTokenObtainPairView,
    UserDetailView,
    AddressListCreateView,
    AddressDetailView,
    UserPreferencesView,
    ChangePasswordView,
)

urlpatterns = [
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('me/addresses/', AddressListCreateView.as_view(), name='address_list_create'),
    path('me/addresses/<int:pk>/', AddressDetailView.as_view(), name='address_detail'),
    path('me/preferences/', UserPreferencesView.as_view(), name='user_preferences'),
    path('me/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('contact/', ContactMessageCreateView.as_view(), name='contact_create'),
    path('producers/', ProducerListView.as_view(), name='producers_list'),
    path('producers/<int:producer_id>/', ProducerProfileView.as_view(), name='producer_profile'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('admin/users/', AdminUserListView.as_view(), name='admin_users'),
    path('admin/users/<int:user_id>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/products/', AdminProductListView.as_view(), name='admin_products'),
    path('admin/products/<int:product_id>/', AdminProductDetailView.as_view(), name='admin_product_detail'),
    path('admin/contacts/', AdminContactMessageListView.as_view(), name='admin_contacts'),
    path('admin/logs/', AdminActionLogListView.as_view(), name='admin_action_logs'),
]

