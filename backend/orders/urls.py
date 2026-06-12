from django.urls import path
from . import views

urlpatterns = [
    path('', views.my_orders, name='my-orders'),
    path('sales/', views.producer_sales, name='producer-sales'),
    path('checkout/', views.create_order_from_cart, name='create-order-from-cart'),
    path('<int:order_id>/pay/', views.simulate_payment, name='simulate-payment'),
    path('subscriptions/', views.subscriptions_list_create, name='subscriptions-list-create'),
    path('subscriptions/<int:sub_id>/', views.subscription_detail, name='subscription-detail'),
]