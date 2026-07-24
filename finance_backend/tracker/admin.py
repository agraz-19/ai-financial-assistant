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
    list_display = ("date", "user", "short_description", "amount", "category", "is_ai_categorized")
    search_fields = ("description", "user__username")
    list_filter = ("category", "is_ai_categorized", "date")
    
    @admin.display(description="Description / Payee-Payer")
    def short_description(self, obj):
        return obj.description[:60] + ("…" if len(obj.description) > 60 else "")
    actions = ["report_exact_duplicate_transactions"]

    @admin.action(description="Report exact duplicate transactions")
    def report_exact_duplicate_transactions(self, request, queryset):
        seen = {}
        duplicate_ids = set()

        for txn in queryset.order_by("user_id", "date", "description", "amount", "id"):
            key = (txn.user_id, txn.date, txn.description.strip().lower(), txn.amount)
            if key in seen:
                duplicate_ids.add(txn.id)
                duplicate_ids.add(seen[key])
            else:
                seen[key] = txn.id

        if duplicate_ids:
            count = queryset.model.objects.filter(id__in=duplicate_ids).count()
            self.message_user(
                request,
                f"Found {count} exact duplicate transaction rows in the selected set.",
                level="warning",
            )
        else:
            self.message_user(request, "No exact duplicate transactions found in the selected set.")


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
