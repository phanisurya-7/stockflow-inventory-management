"""Automated tests for StockFlow Milestone 3 inventory CRUD, scoping, and metrics."""

from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Organization

from .models import Product

User = get_user_model()


class InventoryCoreTests(APITestCase):
    def setUp(self):
        self.org_a = Organization.objects.create(name="Alpha Hardware")
        self.user_a = User.objects.create_user(
            email="alpha@example.com",
            password="StrongInventoryPassword!99",
            organization=self.org_a,
        )

        self.org_b = Organization.objects.create(name="Beta Goods")
        self.user_b = User.objects.create_user(
            email="beta@example.com",
            password="StrongInventoryPassword!99",
            organization=self.org_b,
        )

        self.products_url = reverse("product-list")
        self.metrics_url = reverse("dashboard-metrics")

    def _detail_url(self, product_id: int) -> str:
        return reverse("product-detail", kwargs={"pk": product_id})

    def test_unauthenticated_access_is_blocked(self):
        product = Product.objects.create(
            organization=self.org_a,
            name="Copper Fitting",
            sku="CF-100",
            quantity_on_hand=10,
        )

        self.assertIn(
            self.client.get(self.products_url).status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertIn(
            self.client.get(self._detail_url(product.id)).status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.assertIn(
            self.client.get(self.metrics_url).status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_user_without_organization_is_forbidden(self):
        orphan = User.objects.create_user(
            email="orphan@example.com",
            password="StrongInventoryPassword!99",
            organization=None,
        )
        self.client.force_authenticate(user=orphan)

        self.assertEqual(self.client.get(self.products_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(self.metrics_url).status_code, status.HTTP_403_FORBIDDEN)

    def test_create_product_assigns_organization_server_side_and_normalizes_sku(self):
        self.client.force_authenticate(user=self.user_a)
        payload = {
            "name": "  Brass Valve 12mm ",
            "sku": "  bv-012  ",
            "description": "Quarter-turn brass valve",
            "quantity_on_hand": 14,
            "cost_price": "4.50",
            "selling_price": "12.00",
            "low_stock_threshold": None,
            # Client-supplied org must be ignored.
            "organization": self.org_b.id,
            "organization_id": self.org_b.id,
        }

        response = self.client.post(self.products_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Brass Valve 12mm")
        self.assertEqual(response.data["sku"], "BV-012")
        self.assertEqual(response.data["organization_id"], self.org_a.id)
        self.assertEqual(
            response.data["effective_low_stock_threshold"],
            settings.DEFAULT_LOW_STOCK_THRESHOLD,
        )
        self.assertFalse(response.data["is_low_stock"])

        product = Product.objects.get(pk=response.data["id"])
        self.assertEqual(product.organization_id, self.org_a.id)

    def test_duplicate_sku_rejected_within_org_but_allowed_across_orgs(self):
        Product.objects.create(
            organization=self.org_a,
            name="Existing Item",
            sku="SKU-101",
            quantity_on_hand=10,
        )

        # Same org, different case -> rejected
        self.client.force_authenticate(user=self.user_a)
        dup_response = self.client.post(
            self.products_url,
            {"name": "Another Item", "sku": " sku-101 ", "quantity_on_hand": 3},
            format="json",
        )
        self.assertEqual(dup_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sku", dup_response.data)

        # Different org, same SKU -> allowed
        self.client.force_authenticate(user=self.user_b)
        cross_org_response = self.client.post(
            self.products_url,
            {"name": "Beta Item", "sku": "sku-101", "quantity_on_hand": 7},
            format="json",
        )
        self.assertEqual(cross_org_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(cross_org_response.data["sku"], "SKU-101")
        self.assertEqual(cross_org_response.data["organization_id"], self.org_b.id)

    def test_cross_organization_access_returns_404_and_is_isolated(self):
        prod_a = Product.objects.create(
            organization=self.org_a,
            name="Alpha Exclusive",
            sku="ALP-1",
            quantity_on_hand=25,
        )
        Product.objects.create(
            organization=self.org_b,
            name="Beta Item",
            sku="BET-1",
            quantity_on_hand=4,
        )

        self.client.force_authenticate(user=self.user_b)

        list_res = self.client.get(self.products_url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 1)
        self.assertEqual(list_res.data[0]["sku"], "BET-1")

        self.assertEqual(
            self.client.get(self._detail_url(prod_a.id)).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.patch(
                self._detail_url(prod_a.id),
                {"quantity_on_hand": 99},
                format="json",
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.delete(self._detail_url(prod_a.id)).status_code,
            status.HTTP_404_NOT_FOUND,
        )

        prod_a.refresh_from_db()
        self.assertEqual(prod_a.quantity_on_hand, 25)

    def test_validation_rejects_negative_values_and_blank_required_fields(self):
        self.client.force_authenticate(user=self.user_a)

        bad_payload = {
            "name": "   ",
            "sku": "   ",
            "quantity_on_hand": -1,
            "cost_price": "-5.00",
            "selling_price": "-1.00",
            "low_stock_threshold": -2,
        }
        response = self.client.post(self.products_url, bad_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        for field in (
            "name",
            "sku",
            "quantity_on_hand",
            "cost_price",
            "selling_price",
            "low_stock_threshold",
        ):
            self.assertIn(field, response.data)

    def test_search_filters_by_name_and_sku_within_organization(self):
        Product.objects.create(
            organization=self.org_a,
            name="Stainless Bolt M8",
            sku="BLT-M8",
            quantity_on_hand=40,
        )
        Product.objects.create(
            organization=self.org_a,
            name="Oak Shelf Bracket",
            sku="OSB-20",
            quantity_on_hand=12,
        )
        Product.objects.create(
            organization=self.org_b,
            name="Stainless Bolt M8",
            sku="BLT-M8",
            quantity_on_hand=99,
        )

        self.client.force_authenticate(user=self.user_a)

        by_name = self.client.get(self.products_url, {"search": "bracket"})
        self.assertEqual(by_name.status_code, status.HTTP_200_OK)
        self.assertEqual(len(by_name.data), 1)
        self.assertEqual(by_name.data[0]["sku"], "OSB-20")

        by_sku = self.client.get(self.products_url, {"search": "blt-m8"})
        self.assertEqual(by_sku.status_code, status.HTTP_200_OK)
        self.assertEqual(len(by_sku.data), 1)
        self.assertEqual(by_sku.data[0]["quantity_on_hand"], 40)

    def test_patch_quantity_update_and_delete_product(self):
        product = Product.objects.create(
            organization=self.org_a,
            name="Packing Tape",
            sku="TAP-01",
            quantity_on_hand=6,
            selling_price=Decimal("3.25"),
        )
        other = Product.objects.create(
            organization=self.org_a,
            name="Bubble Wrap",
            sku="WRP-02",
            quantity_on_hand=8,
        )

        self.client.force_authenticate(user=self.user_a)

        # Inline quantity update succeeds
        patch_res = self.client.patch(
            self._detail_url(product.id),
            {"quantity_on_hand": 2},
            format="json",
        )
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data["quantity_on_hand"], 2)
        self.assertTrue(patch_res.data["is_low_stock"])

        # Negative quantity via PATCH is rejected
        neg_res = self.client.patch(
            self._detail_url(product.id),
            {"quantity_on_hand": -1},
            format="json",
        )
        self.assertEqual(neg_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Updating SKU to an existing SKU in same org is rejected
        dup_sku_res = self.client.patch(
            self._detail_url(product.id),
            {"sku": other.sku.lower()},
            format="json",
        )
        self.assertEqual(dup_sku_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sku", dup_sku_res.data)

        # Delete removes the product
        del_res = self.client.delete(self._detail_url(product.id))
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(pk=product.id).exists())

    def test_dashboard_metrics_respect_threshold_boundaries_and_tenancy(self):
        # Default threshold is 5; equal to threshold is low-stock.
        Product.objects.create(
            organization=self.org_a,
            name="Default Boundary Low",
            sku="DEF-5",
            quantity_on_hand=5,
            low_stock_threshold=None,
        )
        Product.objects.create(
            organization=self.org_a,
            name="Default Healthy",
            sku="DEF-6",
            quantity_on_hand=6,
            low_stock_threshold=None,
        )
        Product.objects.create(
            organization=self.org_a,
            name="Custom Boundary Low",
            sku="CUS-10",
            quantity_on_hand=10,
            low_stock_threshold=10,
        )
        Product.objects.create(
            organization=self.org_a,
            name="Custom Healthy",
            sku="CUS-11",
            quantity_on_hand=11,
            low_stock_threshold=10,
        )
        # Other organization product must not affect org_a metrics.
        Product.objects.create(
            organization=self.org_b,
            name="Beta Low",
            sku="BET-0",
            quantity_on_hand=0,
            low_stock_threshold=5,
        )

        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(self.metrics_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_products"], 4)
        self.assertEqual(response.data["total_quantity"], 32)
        self.assertEqual(response.data["low_stock_count"], 2)
        self.assertEqual(
            response.data["default_low_stock_threshold"],
            settings.DEFAULT_LOW_STOCK_THRESHOLD,
        )

        low_skus = [item["sku"] for item in response.data["low_stock_products"]]
        self.assertEqual(low_skus, ["DEF-5", "CUS-10"])
        self.assertEqual(response.data["low_stock_products"][0]["effective_low_stock_threshold"], 5)
        self.assertEqual(response.data["low_stock_products"][1]["effective_low_stock_threshold"], 10)
