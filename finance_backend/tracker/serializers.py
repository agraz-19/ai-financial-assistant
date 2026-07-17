from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Category, Statement, Transaction

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "upi_id",
            "phone_number",
        ]
        read_only_fields = ["id"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "owner", "color", "is_ai_generated", "created_at"]
        read_only_fields = ["id", "owner", "created_at"]


class StatementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Statement
        fields = [
            "id",
            "uploaded_by",
            "file",
            "filename",
            "source_name",
            "statement_date",
            "status",
            "parsed_data",
            "uploaded_at",
        ]
        read_only_fields = ["id", "uploaded_by", "status", "parsed_data", "uploaded_at"]


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id",
            "user",
            "statement",
            "category",
            "amount",
            "direction",
            "transaction_date",
            "merchant_name",
            "counterparty",
            "description",
            "reference_id",
            "confidence_score",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at"]

