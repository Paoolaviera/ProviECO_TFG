from django.urls import path
from . import views

urlpatterns = [
    path('', views.my_orders, name='my-orders'),
    path('sales/', views.producer_sales, name='producer-sales'),
    path('checkout/', views.create_order_from_cart, name='create-order-from-cart'),
    path('<int:order_id>/pay/', views.simulate_payment, name='simulate-payment'),
    path('subscriptions/', views.subscriptions_list_create, name='subscriptions-list-create'),
    path('subscriptions/<int:sub_id>/', views.subscription_detail, name='subscription-detail'),
    path('planned/', views.create_planned_order, name='create-planned-order'),
    path('<int:order_id>/estado-suministro/', views.update_order_supply_status, name='update-order-supply-status'),
    path('ecobox/', views.ecobox_list_create, name='ecobox-list-create'),
    path('ecobox/<int:pk>/', views.ecobox_detail, name='ecobox-detail'),
    path('ecobox/<int:pk>/crear-pedido/', views.ecobox_create_order, name='ecobox-create-order'),
    path('producer-requests/', views.producer_requests, name='producer-requests'),
    path('producer-requests/<int:pk>/accept/', views.accept_producer_request, name='accept-producer-request'),
    path('producer-requests/<int:pk>/reject/', views.reject_producer_request, name='reject-producer-request'),
    path('producer-calendar/', views.producer_calendar, name='producer-calendar'),
    path('<int:order_id>/', views.order_detail, name='order-detail'),
]