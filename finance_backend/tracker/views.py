from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.generic import TemplateView
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from .ai.categorize import run_categorization_for_statement
from .models import Category, Statement, Transaction
from .parsers.csv_parser import CSVParseError, parse_csv_statement, save_transactions
from .services.insights import build_dashboard_context, generate_monthly_insight
from .serializers import CategorySerializer, StatementSerializer, TransactionSerializer


# --- Template views (Phase 1) ---------------------------------------------

class HomeView(TemplateView):
    template_name = "home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        if self.request.user.is_authenticated:
            context.update(build_dashboard_context(self.request.user))
        else:
            context.update({
                "month_label": timezone.localdate().strftime("%B %Y"),
                "transaction_count": 0,
                "uncategorized_count": 0,
                "total_spending": 0,
                "monthly_income": 0,
                "savings": 0,
                "highest_expense_category": "None",
                "spending_per_category": [],
                "summary_text": "Log in to see your dashboard.",
                "ai_spending_summary": "",
                "ai_budget_advice": "",
                "ai_recommendations": [],
                "recent_transactions": [],
                "show_upload_prompt": True,
            })
        return context


@login_required
def upload_statement(request):
    if request.method == "POST":
        file_obj = request.FILES.get("file")

        if not file_obj:
            messages.error(request, "Please choose a file to upload.")
            return redirect("upload_statement")

        file_type = (
            Statement.FileType.CSV
            if file_obj.name.lower().endswith(".csv")
            else Statement.FileType.PDF
        )

        statement = Statement.objects.create(
            user=request.user,
            file=file_obj,
            file_type=file_type,
        )

        if file_type == Statement.FileType.CSV:
            try:
                parsed, warnings = parse_csv_statement(statement.file)
                count = save_transactions(statement, parsed)
                statement.status = Statement.Status.COMPLETED
                statement.save()
                messages.success(request, f"Uploaded {count} transactions.")
                for w in warnings:
                    messages.warning(request, w)

                try:
                    categorized_count = run_categorization_for_statement(statement)
                    if categorized_count:
                        messages.success(request, f"AI categorized {categorized_count} transactions.")
                    try:
                        generate_monthly_insight(request.user)
                    except Exception as insight_error:
                        messages.warning(request, f"Insight generation skipped: {insight_error}")
                except Exception as e:
                    # don't fail the whole upload if categorization has an issue --
                    # the transactions are already saved, categorization can be retried later
                    messages.warning(request, f"Categorization failed: {e}")

            except CSVParseError as e:
                statement.status = Statement.Status.FAILED
                statement.error_message = str(e)
                statement.save()
                messages.error(request, f"Parsing failed: {e}")
        else:
            messages.info(request, "PDF parsing not wired up yet.")

        return redirect("home")

    return render(request, "upload_statement.html")


# --- DRF API (Phase 2, for the React frontend) -----------------------------

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Category.objects.all().order_by("name")  # categories are global, not per-user


class StatementViewSet(viewsets.ModelViewSet):
    serializer_class = StatementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Statement.objects.filter(user=self.request.user).order_by("-uploaded_at")

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get("file")
        file_type = (
            Statement.FileType.CSV
            if file_obj and file_obj.name.lower().endswith(".csv")
            else Statement.FileType.PDF
        )
        serializer.save(user=self.request.user, file_type=file_type)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Transaction.objects.filter(user=self.request.user)
            .select_related("category", "statement")
            .order_by("-date")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        transactions = Transaction.objects.filter(user=request.user)
        total_spent = sum((t.amount for t in transactions if t.amount < 0), start=0) * -1
        total_income = sum((t.amount for t in transactions if t.amount > 0), start=0)
        return Response({
            "transactions": transactions.count(),
            "total_spent": total_spent,
            "total_income": total_income,
            "uncategorized": transactions.filter(category__isnull=True).count(),
        })
