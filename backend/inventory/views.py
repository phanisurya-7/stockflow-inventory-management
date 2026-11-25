"""API views for organization-scoped product CRUD and dashboard metrics."""

from django.conf import settings
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product
from .permissions import HasOrganization
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """CRUD and search endpoints strictly scoped to the user's organization."""

    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, HasOrganization]

    def get_queryset(self):
        queryset = Product.objects.filter(organization=self.request.user.organization)
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(sku__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class DashboardMetricsView(APIView):
    """Aggregated inventory metrics and low-stock alert list for the user's organization."""

    permission_classes = [IsAuthenticated, HasOrganization]

    def get(self, request):
        default_threshold = settings.DEFAULT_LOW_STOCK_THRESHOLD
        products_qs = Product.objects.filter(organization=request.user.organization)

        aggregates = products_qs.aggregate(
            total_products=Count("id"),
            total_quantity=Coalesce(Sum("quantity_on_hand"), 0),
        )

        low_stock_qs = products_qs.filter(
            Q(low_stock_threshold__isnull=False, quantity_on_hand__lte=F("low_stock_threshold"))
            | Q(low_stock_threshold__isnull=True, quantity_on_hand__lte=default_threshold)
        ).order_by("quantity_on_hand", "name")

        low_stock_products = [
            {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "quantity_on_hand": product.quantity_on_hand,
                "low_stock_threshold": product.low_stock_threshold,
                "effective_low_stock_threshold": product.effective_low_stock_threshold,
            }
            for product in low_stock_qs
        ]

        return Response(
            {
                "total_products": aggregates["total_products"],
                "total_quantity": aggregates["total_quantity"],
                "low_stock_count": len(low_stock_products),
                "default_low_stock_threshold": default_threshold,
                "low_stock_products": low_stock_products,
            },
            status=status.HTTP_200_OK,
        )
