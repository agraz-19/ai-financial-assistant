from django.urls import include, path
from rest_framework.routers import DefaultRouter
from tracker.views import spa_index, health
from . import views

router = DefaultRouter()
router.register("categories", views.CategoryViewSet, basename="category")
router.register("statements", views.StatementViewSet, basename="statement")
router.register("transactions", views.TransactionViewSet, basename="transaction")
router.register("chat/messages", views.ChatMessageViewSet, basename="chat-message")


urlpatterns = [
    path("health/", health, name="health"),
    path("legacy/", views.HomeView.as_view(), name="home"),
    path("upload/", views.upload_statement, name="upload_statement"),
    path("chat/", views.chat, name="chat"),
    # ...rest unchanged
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
    path("api/analytics/", views.AnalyticsAPIView.as_view(), name="api-analytics"),
    path("api/me/", views.CurrentUserAPIView.as_view(), name="api-me"),  # unchanged, now also supports PATCH
    path("api/me/password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("api/me/export/", views.ExportTransactionsCSVView.as_view(), name="export-transactions"),
    path("api/me/delete/", views.DeleteAccountView.as_view(), name="delete-account"),
    path("api/register/", views.RegisterView.as_view(), name="register"),
]