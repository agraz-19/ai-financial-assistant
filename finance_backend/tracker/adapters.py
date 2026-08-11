from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model

class AutoSignupSocialAccountAdapter(DefaultSocialAccountAdapter):
    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        if not user.username:
            base = (data.get("email") or "user").split("@")[0]
            User, username, i = get_user_model(), base, 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{i}"; i += 1
            user.username = username
        return user