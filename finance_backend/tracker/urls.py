from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("categories", views.CategoryViewSet, basename="category")
router.register("statements", views.StatementViewSet, basename="statement")
router.register("transactions", views.TransactionViewSet, basename="transaction")

urlpatterns = [
    path("", views.HomeView.as_view(), name="home"),

    path("upload/", views.upload_statement, name="upload_statement"),

    path("chat/", views.chat, name="chat"),

    # Existing API
    path("api/summary/", views.SummaryView.as_view(), name="api-summary"),

    # ⭐ NEW React Dashboard API
    path(
        "api/dashboard/",
        views.DashboardAPIView.as_view(),
        name="api-dashboard",
    ),

    # DRF Router
    path("api/", include(router.urls)),
    
]