from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from tracker.views import spa_index

urlpatterns = [
    path("", include("tracker.urls")),
    path("accounts/", include("django.contrib.auth.urls")),
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# React SPA catch-all -- must stay LAST. Anything not matched above falls
# through to index.html so React Router owns client-side routing, including
# hard refresh / direct link to e.g. /dashboard or /login.
urlpatterns += [
    re_path(r"^(?!api/|admin/|accounts/|media/|legacy/|upload/|chat/).*$", spa_index, name="spa"),
]