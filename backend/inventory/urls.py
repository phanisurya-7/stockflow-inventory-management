"""URL routes for inventory products and dashboard metrics."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DashboardMetricsView, ProductViewSet

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/metrics/", DashboardMetricsView.as_view(), name="dashboard-metrics"),
]
