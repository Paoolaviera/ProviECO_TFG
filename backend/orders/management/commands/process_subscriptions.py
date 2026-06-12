from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from orders.models import Subscription, Order, OrderItem
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from decimal import Decimal

class Command(BaseCommand):
    help = 'Processes active subscriptions and creates orders if they are due.'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        active_subscriptions = Subscription.objects.filter(status='ACTIVE')
        
        processed_count = 0

        for sub in active_subscriptions:
            # Determine due date
            days = 7
            if sub.frequency == 'BIWEEKLY':
                days = 14
            elif sub.frequency == 'MONTHLY':
                days = 30
            
            # If last_processed_at is None, we process it immediately (or we could wait `days` from created_at. Let's process immediately for the first time if needed, or check created_at)
            reference_date = sub.last_processed_at if sub.last_processed_at else sub.created_at
            
            if now >= reference_date + timedelta(days=days):
                # Process subscription
                self.create_order_for_subscription(sub)
                sub.last_processed_at = now
                sub.save()
                processed_count += 1
                
        self.stdout.write(self.style.SUCCESS(f'Successfully processed {processed_count} subscriptions.'))

    def create_order_for_subscription(self, sub):
        user = sub.user
        
        # Determine total cost
        total = Decimal('0.00')
        
        # We need a delivery address. Let's try to get it from the user's last order or user profile
        delivery_address = user.direccion if hasattr(user, 'direccion') and user.direccion else "Dirección de Suscripción"
        
        # Create order
        order = Order.objects.create(
            user=user,
            delivery_type='ADDRESS',
            delivery_address=delivery_address,
            status='PENDING_PAYMENT',
            total=Decimal('0.00')
        )
        
        # Copy items
        for item in sub.items.all():
            if item.product:
                unit_price = item.product.price
                subtotal = unit_price * item.quantity
                
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    product_name=item.product.name,
                    quantity=item.quantity,
                    unit_price=unit_price,
                    subtotal=subtotal
                )
                total += subtotal
                
        order.total = total
        order.save()
        
        # Send standard email for new order to pay
        context = {
            'user': user,
            'order': order,
            'items': order.items.all()
        }
        html_message = render_to_string('emails/order_confirmation.html', context)
        plain_message = strip_tags(html_message)

        try:
            email = EmailMultiAlternatives(
                subject=f'🌱 EcoMarket - Tienes un nuevo pedido recurrente #{order.id}',
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=True)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send email for subscription order {order.id}: {e}'))
