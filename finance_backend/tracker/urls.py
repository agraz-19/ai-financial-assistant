from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, HomeView, StatementViewSet, SummaryView, TransactionViewSet

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"statements", StatementViewSet, basename="statement")
router.register(r"transactions", TransactionViewSet, basename="transaction")

urlpatterns = [
    path("", HomeView.as_view(), name="home"),
    path("api/", include(router.urls)),
    path("api/summary/", SummaryView.as_view(), name="summary"),
]

