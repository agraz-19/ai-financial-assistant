from django.contrib import admin

from .models import Category, Statement, Transaction, MonthlyInsight, ChatMessage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_default")
    search_fields = ("name",)
    list_filter = ("is_default",)


@admin.register(Statement)
class StatementAdmin(admin.ModelAdmin):
    list_display = ("file", "user", "file_type", "status", "uploaded_at")
    search_fields = ("file", "user__username")
    list_filter = ("status", "file_type", "uploaded_at")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("date", "user", "amount", "category", "is_ai_categorized")
    search_fields = ("description", "user__username")
    list_filter = ("category", "is_ai_categorized", "date")


@admin.register(MonthlyInsight)
class MonthlyInsightAdmin(admin.ModelAdmin):
    list_display = ("user", "month", "total_spent", "total_income", "generated_at")
    search_fields = ("user__username",)
    list_filter = ("month",)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "created_at")
    search_fields = ("user__username", "content")
    list_filter = ("role", "created_at")