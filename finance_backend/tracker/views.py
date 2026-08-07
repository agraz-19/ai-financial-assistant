import hashlib
import os
from os.path import basename
from urllib.parse import quote
from .serializers import CategorySerializer, StatementSerializer, TransactionSerializer, ChatMessageSerializer
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, JsonResponse
from django.shortcuts import redirect, render
from django.conf import settings
from django.utils import timezone
from django.views.decorators.http import require_GET
from django.views.generic import TemplateView
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .ai.rag_chat import ask_and_save
from .models import Category, Statement, Transaction, ChatMessage
from .services.insights import build_dashboard_context
from .serializers import CategorySerializer, StatementSerializer, TransactionSerializer
from .services.upload_service import process_uploaded_statement


# --- Template views (Phase 1) ---------------------------------------------

class HomeView(TemplateView):
    template_name = "home.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["hide_messages"] = True
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
    """
    Old Django template upload view.
    Uses process_uploaded_statement() service for consistency with DRF endpoint.
    """
    if request.method != "POST":
        return render(request, "upload_statement.html")

    file_obj = request.FILES.get("file")
    if not file_obj:
        messages.error(request, "Please choose a file to upload.")
        return redirect("upload_statement")

    file_bytes = file_obj.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()
    file_obj.seek(0)

    # Create or get statement
    file_type = (
        Statement.FileType.CSV
        if file_obj.name.lower().endswith(".csv")
        else Statement.FileType.PDF
    )

    statement, created = Statement.objects.get_or_create(
        user=request.user,
        file_hash=file_hash,
        defaults={
            "file_type": file_type,
            "status": Statement.Status.UPLOADED,
        },
    )

    # Process upload using unified service
    try:
        result = process_uploaded_statement(statement, file_obj)

        if created:
            messages.success(request, f"Uploaded a new {file_type} statement.")
        else:
            messages.info(request, f"Reprocessed the existing {file_type} statement.")

        messages.success(request, f"Saved {result['transaction_count']} transactions.")
    except Exception as e:
        messages.error(request, f"Upload failed: {e}")

    return redirect("home")


@login_required
def chat(request):
    if request.method == "POST":
        question = request.POST.get("question", "").strip()
        if question:
            ask_and_save(request.user, question)
        return redirect("chat")

    messages_list = ChatMessage.objects.filter(user=request.user).order_by("created_at")
    return render(request, "chat.html", {"chat_messages": messages_list, "hide_messages": True})


@login_required
@require_GET
def session_jwt(request):
    refresh = RefreshToken.for_user(request.user)
    return JsonResponse({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": request.user.id,
            "username": request.user.get_username(),
            "email": request.user.email,
            "first_name": request.user.first_name,
            "last_name": request.user.last_name,
        },
    })


@login_required
@require_GET
def google_login_complete(request):
    frontend_url = os.getenv(
        "FRONTEND_URL",
        settings.CORS_ALLOWED_ORIGINS[0] if getattr(settings, "CORS_ALLOWED_ORIGINS", None) else "http://localhost:5173",
    ).rstrip("/")
    refresh = RefreshToken.for_user(request.user)
    access_token = quote(str(refresh.access_token), safe="")
    refresh_token = quote(str(refresh), safe="")
    return redirect(
        f"{frontend_url}/dashboard#access={access_token}&refresh={refresh_token}"
    )


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

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        """
        Override create to handle full upload workflow.
        Uses process_uploaded_statement() service for consistency.
        """
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "No file provided"}, status=400)

        # Read file bytes and compute hash BEFORE file_obj is consumed
        file_bytes = file_obj.read()
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        file_obj.seek(0)

        file_type = (
            Statement.FileType.CSV
            if file_obj.name.lower().endswith(".csv")
            else Statement.FileType.PDF
        )

        # Create or get statement (avoid duplicate-file integrity error)
        statement, created = Statement.objects.get_or_create(
            user=request.user,
            file_hash=file_hash,
            defaults={
                "file_type": file_type,
                "status": Statement.Status.UPLOADED,
            },
        )

        # Process upload using unified service
        try:
            result = process_uploaded_statement(statement, file_obj)
            # Refresh from DB to get updated status
            statement.refresh_from_db()
        except Exception:
            # process_uploaded_statement already set FAILED status
            statement.refresh_from_db()
            result = {
                "warnings": [],
            }

        # Serialize and return
        serializer = self.get_serializer(statement)
        response_data = serializer.data
        if result.get("warnings"):
            response_data["warnings"] = result["warnings"]
        return Response(response_data, status=201 if created else 200)

    def destroy(self, request, *args, **kwargs):
        """
        Delete a statement and all its transactions.
        Also cleans up the statement's embeddings from ChromaDB.
        """
        statement = self.get_object()

        # Clean up ChromaDB embeddings for this statement's transactions
        try:
            from .ai.embeddings import _get_collection
            collection = _get_collection()
            ids = [str(t.id) for t in statement.transactions.all()]
            if ids:
                collection.delete(ids=ids)
        except Exception as e:
            print(f"[StatementViewSet.destroy] ChromaDB cleanup skipped: {e}")

        # Delete the statement (cascades to transactions via FK)
        statement.delete()

        return Response(status=204)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
            params = self.request.query_params
            queryset = (
                Transaction.objects.filter(user=self.request.user)
                .select_related("category", "statement")
                .order_by("-date")
            )

            statement_id = params.get("statement")
            if statement_id:
                queryset = queryset.filter(statement_id=statement_id)

            category_id = params.get("category")
            if category_id:
                queryset = queryset.filter(category_id=category_id)

            date_from = params.get("date_from")
            if date_from:
                queryset = queryset.filter(date__gte=date_from)

            date_to = params.get("date_to")
            if date_to:
                queryset = queryset.filter(date__lte=date_to)

            return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StatementDownloadView(APIView):
    """
    Downloads the original uploaded statement file.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, statement_id):
        try:
            statement = Statement.objects.get(id=statement_id, user=request.user)
        except Statement.DoesNotExist:
            return Response({"error": "Statement not found"}, status=404)

        if not statement.file:
            return Response({"error": "Statement has no file"}, status=404)

        response = FileResponse(
            statement.file.open("rb"),
            as_attachment=True,
            filename=basename(statement.file.name),
        )
        return response


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


class DashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        scope = request.query_params.get("scope", "all")
        statement_id = request.query_params.get("statement")
        context = build_dashboard_context(request.user, scope=scope, statement_id=statement_id)

        return Response({
            "scope": scope,
            "statement_id": context.get("statement_id"),
            "statement_filename": context.get("statement_filename"),
            "month_label": context.get("month_label"),
            "transaction_count": context.get("transaction_count"),
            "uncategorized_count": context.get("uncategorized_count"),
            "total_spending": context.get("total_spending"),
            "monthly_income": context.get("monthly_income"),
            "savings": context.get("savings"),
            "highest_expense_category": context.get("highest_expense_category"),
            "spending_per_category": context.get("spending_per_category"),
            "monthly_trend": context.get("monthly_trend", []),
            "largest_expense": context.get("largest_expense"),
            "most_frequent_merchant": context.get("most_frequent_merchant"),
            "predicted_next_month_spend": context.get("predicted_next_month_spend"),
            "summary_text": context.get("summary_text"),
            "ai_spending_summary": context.get("ai_spending_summary"),
            "ai_budget_advice": context.get("ai_budget_advice"),
            "ai_recommendations": context.get("ai_recommendations"),
            "recent_transactions": context.get("recent_transactions", []),
            "show_upload_prompt": context.get("show_upload_prompt"),
        })


class CurrentUserAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.get_username(),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        })
class ChatMessageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatMessage.objects.filter(user=self.request.user).order_by("created_at")


class ChatAskView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        question = (request.data.get("question") or "").strip()
        if not question:
            return Response({"error": "Question is required"}, status=400)

        result = ask_and_save(request.user, question)
        return Response({
            "answer": result["answer"],
            "sources": result["sources"],
            "error": result["error"],
        })