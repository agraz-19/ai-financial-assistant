from django.views.generic import TemplateView
from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Statement, Transaction
from .serializers import CategorySerializer, StatementSerializer, TransactionSerializer


class HomeView(TemplateView):
    template_name = "home.html"


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(owner=self.request.user).order_by("name")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class StatementViewSet(viewsets.ModelViewSet):
    serializer_class = StatementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Statement.objects.filter(uploaded_by=self.request.user)

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get("file")
        filename = file_obj.name if file_obj else serializer.validated_data.get("filename", "")
        serializer.save(uploaded_by=self.request.user, filename=filename)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related("category", "statement")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        transactions = Transaction.objects.filter(user=request.user)
        total_debit = transactions.filter(direction=Transaction.Direction.DEBIT).count()
        total_credit = transactions.filter(direction=Transaction.Direction.CREDIT).count()
        return Response(
            {
                "transactions": transactions.count(),
                "debit_transactions": total_debit,
                "credit_transactions": total_credit,
            }
        )

