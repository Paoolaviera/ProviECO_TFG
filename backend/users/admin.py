from django.contrib import admin
from django.utils.html import format_html
from .models import CustomUser, ContactMessage

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'email', 'rol', 'provincia', 'delete_button')

    def delete_button(self, obj):
        return format_html('<a class="button" style="color:white; background-color:#ba2121; padding:5px 10px; border-radius:3px;" href="/admin/users/customuser/{}/delete/">Eliminar</a>', obj.id)
    delete_button.short_description = 'Eliminar'

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'email', 'motivo', 'delete_button')

    def delete_button(self, obj):
        return format_html('<a class="button" style="color:white; background-color:#ba2121; padding:5px 10px; border-radius:3px;" href="/admin/users/contactmessage/{}/delete/">Eliminar</a>', obj.id)
    delete_button.short_description = 'Eliminar'