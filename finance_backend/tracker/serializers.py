from rest_framework import serializers
from os.path import basename

from .models import Category, ChatMessage, MonthlyInsight, Statement, Transaction


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "is_default"]
        read_only_fields = ["is_default"]


class StatementSerializer(serializers.ModelSerializer):
    transaction_count = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Statement
        fields = [
            "id", "file", "filename", "file_type", "status",
            "error_message", "uploaded_at", "processed_at",
            "transaction_count", "download_url",
        ]
        read_only_fields = ["status", "error_message", "uploaded_at", "processed_at"]

    def get_transaction_count(self, obj):
        return obj.transactions.count()

    def get_filename(self, obj):
        if not obj.file:
            return ""
        return basename(obj.file.name)

    def get_download_url(self, obj):
        """Absolute download URL for the original uploaded file."""
        if not obj.file:
            return None
        request = self.context.get("request")
        url = obj.file.url
        if request:
            return request.build_absolute_uri(url)
        return url


class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id", "statement", "date", "description", "amount",
            "category", "category_name", "category_confidence",
            "is_ai_categorized", "created_at",
        ]
        read_only_fields = ["category_confidence", "is_ai_categorized", "created_at"]


class MonthlyInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyInsight
        fields = [
            "id", "month", "summary_text", "total_spent",
            "total_income", "budget_recommendation", "generated_at",
        ]
        read_only_fields = fields


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "created_at"]
        read_only_fields = ["created_at"]
