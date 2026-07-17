from django.contrib import admin

from .models import Category, Statement, Transaction, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "upi_id", "phone_number", "is_staff")
    search_fields = ("username", "email", "upi_id", "phone_number")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "color", "is_ai_generated", "created_at")
    search_fields = ("name", "owner__username")
    list_filter = ("is_ai_generated", "created_at")


@admin.register(Statement)
class StatementAdmin(admin.ModelAdmin):
    list_display = ("filename", "uploaded_by", "statement_date", "status", "uploaded_at")
    search_fields = ("filename", "uploaded_by__username", "source_name")
    list_filter = ("status", "uploaded_at")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("transaction_date", "user", "amount", "direction", "category", "merchant_name")
    search_fields = ("description", "merchant_name", "reference_id")
    list_filter = ("direction", "transaction_date", "category")

