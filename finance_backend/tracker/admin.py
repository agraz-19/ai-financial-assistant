from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from django.db.models import Count
from django.utils.html import format_html

from .models import (
    Category,
    Statement,
    Transaction,
    MonthlyInsight,
    ChatMessage,
)


# ===========================
# CATEGORY
# ===========================

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_default")
    search_fields = ("name",)
    list_filter = ("is_default",)
    ordering = ("name",)
    list_per_page = 25


# ===========================
# TRANSACTION INLINE
# ===========================

class TransactionInline(admin.TabularInline):
    model = Transaction
    extra = 0
    fields = (
        "date",
        "description",
        "amount",
        "category",
        "is_ai_categorized",
    )
    readonly_fields = fields
    show_change_link = True


# ===========================
# STATEMENT
# ===========================

@admin.register(Statement)
class StatementAdmin(admin.ModelAdmin):

    list_display = (
        "file",
        "user",
        "transaction_count",
        "file_type",
        "status",
        "uploaded_at",
    )

    search_fields = (
        "file",
        "user__username",
        "file_hash",
    )

    list_filter = (
        "status",
        "file_type",
        "user",
        "uploaded_at",
    )

    ordering = ("-uploaded_at",)

    date_hierarchy = "uploaded_at"

    list_select_related = ("user",)

    list_per_page = 25

    inlines = [TransactionInline]

    @admin.display(description="Transactions")
    def transaction_count(self, obj):
        return obj.transactions.count()


# ===========================
# TRANSACTION
# ===========================

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):

    list_display = (
        "date",
        "user",
        "short_description",
        "colored_amount",
        "category",
        "is_ai_categorized",
    )

    search_fields = (
        "description",
        "user__username",
        "category__name",
        "statement__file",
    )

    list_filter = (
        "category",
        "is_ai_categorized",
        "user",
        "statement",
        "date",
    )

    ordering = (
        "-date",
        "-created_at",
    )

    date_hierarchy = "date"

    list_select_related = (
        "user",
        "category",
        "statement",
    )

    list_per_page = 50

    @admin.display(description="Description / Payee-Payer")
    def short_description(self, obj):
        return obj.description[:60] + ("…" if len(obj.description) > 60 else "")

    @admin.display(ordering="amount", description="Amount")
    def colored_amount(self, obj):
        color = "green" if obj.amount >= 0 else "red"

        return format_html(
            '<strong style="color:{};">₹{}</strong>',
            color,
            abs(obj.amount),
        )

    actions = ["report_exact_duplicate_transactions"]

    @admin.action(description="Report exact duplicate transactions")
    def report_exact_duplicate_transactions(self, request, queryset):
        seen = {}
        duplicate_ids = set()

        for txn in queryset.order_by(
            "user_id",
            "date",
            "description",
            "amount",
            "id",
        ):
            key = (
                txn.user_id,
                txn.date,
                txn.description.strip().lower(),
                txn.amount,
            )

            if key in seen:
                duplicate_ids.add(txn.id)
                duplicate_ids.add(seen[key])
            else:
                seen[key] = txn.id

        if duplicate_ids:
            count = queryset.model.objects.filter(
                id__in=duplicate_ids
            ).count()

            self.message_user(
                request,
                f"Found {count} exact duplicate transaction rows in the selected set.",
                level="warning",
            )

        else:
            self.message_user(
                request,
                "No exact duplicate transactions found in the selected set.",
            )


# ===========================
# MONTHLY INSIGHT
# ===========================

@admin.register(MonthlyInsight)
class MonthlyInsightAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "statement",
        "month",
        "total_spent",
        "total_income",
        "generated_at",
    )

    search_fields = (
        "user__username",
    )

    list_filter = (
        "user",
        "month",
        "generated_at",
    )

    ordering = ("-generated_at",)

    list_select_related = (
        "user",
        "statement",
    )

    list_per_page = 25

    readonly_fields = (
        "summary_text",
        "budget_recommendation",
        "total_spent",
        "total_income",
        "generated_at",
    )


# ===========================
# CHAT HISTORY
# ===========================

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "role",
        "preview",
        "created_at",
    )

    search_fields = (
        "user__username",
        "content",
    )

    list_filter = (
        "role",
        "created_at",
    )

    ordering = ("-created_at",)

    list_select_related = ("user",)

    list_per_page = 50

    @admin.display(description="Message")
    def preview(self, obj):
        return (
            obj.content[:70] + "..."
            if len(obj.content) > 70
            else obj.content
        )


# ===========================
# CUSTOM USER ADMIN
# ===========================

admin.site.unregister(User)


@admin.register(User)
class CustomUserAdmin(UserAdmin):

    list_display = (
        "username",
        "email",
        "statement_count",
        "transaction_count",
        "is_staff",
        "date_joined",
        "last_login",
    )

    ordering = ("username",)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            total_statements=Count("statements", distinct=True),
            total_transactions=Count("transactions", distinct=True),
        )

    @admin.display(ordering="total_statements", description="Statements")
    def statement_count(self, obj):
        return obj.total_statements

    @admin.display(ordering="total_transactions", description="Transactions")
    def transaction_count(self, obj):
        return obj.total_transactions


# ===========================
# ADMIN BRANDING
# ===========================

admin.site.site_header = "AI Finance Tracker Administration"
admin.site.site_title = "AI Finance Tracker Admin"
admin.site.index_title = "Welcome to AI Finance Tracker"