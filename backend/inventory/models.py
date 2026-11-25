"""Organization-scoped Product model for StockFlow."""

from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Product(models.Model):
    """Inventory item belonging strictly to a single Organization."""

    organization = models.ForeignKey(
        "accounts.Organization",
        on_delete=models.CASCADE,
        related_name="products",
    )
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=64)
    description = models.TextField(blank=True, default="")
    quantity_on_hand = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
    )
    cost_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    selling_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    low_stock_threshold = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "sku"],
                name="unique_product_sku_per_org",
            ),
        ]
        indexes = [
            models.Index(fields=["organization", "name"], name="inv_prod_org_name_idx"),
            models.Index(fields=["organization", "quantity_on_hand"], name="inv_prod_org_qty_idx"),
        ]

    @property
    def effective_low_stock_threshold(self) -> int:
        if self.low_stock_threshold is not None:
            return self.low_stock_threshold
        return settings.DEFAULT_LOW_STOCK_THRESHOLD

    @property
    def is_low_stock(self) -> bool:
        return self.quantity_on_hand <= self.effective_low_stock_threshold

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        self.sku = self.sku.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.sku} — {self.name}"
