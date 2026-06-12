from django.contrib import admin
from django.utils.html import format_html
from .models import Producto, CartItem


@admin.action(description='Marcar como verificado')
def marcar_verificado(modeladmin, request, queryset):
    queryset.update(verification_status='VERIFICADO')


@admin.action(description='Marcar como pendiente')
def marcar_pendiente(modeladmin, request, queryset):
    queryset.update(verification_status='PENDIENTE')


@admin.action(description='Marcar como rechazado')
def marcar_rechazado(modeladmin, request, queryset):
    queryset.update(verification_status='RECHAZADO')


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'name',
        'owner',
        'origin',
        'price',
        'quantity',
        'verification_status',
        'delete_button',
    )

    def delete_button(self, obj):
        return format_html('<a class="button" style="color:white; background-color:#ba2121; padding:5px 10px; border-radius:3px;" href="/admin/products/producto/{}/delete/">Eliminar</a>', obj.id)
    delete_button.short_description = 'Eliminar'

    list_display_links = ('id', 'name')

    list_editable = (
        'verification_status',
    )

    list_filter = (
        'verification_status',
        'origin',
    )

    search_fields = (
        'name',
        'origin',
        'owner__username',
        'owner__email',
    )

    actions = [
        marcar_verificado,
        marcar_pendiente,
        marcar_rechazado,
    ]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'producto',
        'cantidad',
    )