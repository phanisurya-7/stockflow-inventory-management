"""Serializers and validation rules for organization-scoped products."""

from decimal import Decimal

from django.db import IntegrityError
from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    effective_low_stock_threshold = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "organization_id",
            "name",
            "sku",
            "description",
            "quantity_on_hand",
            "cost_price",
            "selling_price",
            "low_stock_threshold",
            "effective_low_stock_threshold",
            "is_low_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization_id",
            "effective_low_stock_threshold",
            "is_low_stock",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Product name is required.")
        return cleaned

    def validate_sku(self, value: str) -> str:
        cleaned = value.strip().upper()
        if not cleaned:
            raise serializers.ValidationError("SKU is required.")
        return cleaned

    def validate_quantity_on_hand(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Quantity on hand cannot be negative.")
        return value

    def validate_cost_price(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Cost price cannot be negative.")
        return value

    def validate_selling_price(self, value: Decimal | None) -> Decimal | None:
        if value is not None and value < Decimal("0.00"):
            raise serializers.ValidationError("Selling price cannot be negative.")
        return value

    def validate_low_stock_threshold(self, value: int | None) -> int | None:
        if value is not None and value < 0:
            raise serializers.ValidationError("Low-stock threshold cannot be negative.")
        return value

    def validate(self, attrs: dict) -> dict:
        if "sku" in attrs:
            request = self.context.get("request")
            organization = getattr(request.user, "organization", None) if request else None
            if organization is not None:
                qs = Product.objects.filter(
                    organization=organization,
                    sku__iexact=attrs["sku"],
                )
                if self.instance is not None:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError(
                        {"sku": ["A product with this SKU already exists in your organization."]}
                    )
        return attrs

    def create(self, validated_data: dict) -> Product:
        try:
            return super().create(validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"sku": ["A product with this SKU already exists in your organization."]}
            ) from exc

    def update(self, instance: Product, validated_data: dict) -> Product:
        try:
            return super().update(instance, validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"sku": ["A product with this SKU already exists in your organization."]}
            ) from exc
