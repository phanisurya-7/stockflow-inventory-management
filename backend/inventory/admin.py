from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sku",
        "name",
        "organization",
        "quantity_on_hand",
        "low_stock_threshold",
        "selling_price",
        "updated_at",
    )
    list_filter = ("organization",)
    search_fields = ("name", "sku", "organization__name")
