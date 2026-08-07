from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("categories", views.CategoryViewSet, basename="category")
router.register("statements", views.StatementViewSet, basename="statement")
router.register("transactions", views.TransactionViewSet, basename="transaction")
router.register("chat/messages", views.ChatMessageViewSet, basename="chat-message")

urlpatterns = [
    path("", views.HomeView.as_view(), name="home"),
    path("upload/", views.upload_statement, name="upload_statement"),
    path("chat/", views.chat, name="chat"),
    path("api/session-jwt/", views.session_jwt, name="session-jwt"),
    path("auth/google/complete/", views.google_login_complete, name="google-login-complete"),
    path("api/summary/", views.SummaryView.as_view(), name="api-summary"),
    path("api/me/", views.CurrentUserAPIView.as_view(), name="api-me"),
    path("api/dashboard/", views.DashboardAPIView.as_view(), name="api-dashboard"),
    path("api/chat/ask/", views.ChatAskView.as_view(), name="chat-ask"),
    path("api/", include(router.urls)),
    path(
        "api/statements/<int:statement_id>/download/",
        views.StatementDownloadView.as_view(),
        name="statement-download",
    ),
]