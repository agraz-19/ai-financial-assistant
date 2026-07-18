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
    path("api/summary/", views.SummaryView.as_view(), name="api-summary"),
    path("api/", include(router.urls)),
]