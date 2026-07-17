from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.db import models


class User(AbstractUser):
    upi_id = models.CharField(max_length=255, blank=True, unique=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True)

    def __str__(self) -> str:
        return self.get_username()


class Category(models.Model):
    name = models.CharField(max_length=120)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="categories")
    color = models.CharField(max_length=7, default="#2563eb")
    is_ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("owner", "name")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Statement(models.Model):
    class Status(models.TextChoices):
        UPLOADED = "uploaded", "Uploaded"
        PARSED = "parsed", "Parsed"
        FAILED = "failed", "Failed"

    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="statements")
    file = models.FileField(upload_to="statements/%Y/%m/")
    filename = models.CharField(max_length=255)
    source_name = models.CharField(max_length=255, blank=True)
    statement_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPLOADED)
    parsed_data = models.JSONField(default=dict, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return self.filename


class Transaction(models.Model):
    class Direction(models.TextChoices):
        DEBIT = "debit", "Debit"
        CREDIT = "credit", "Credit"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    statement = models.ForeignKey(Statement, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions")
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    direction = models.CharField(max_length=10, choices=Direction.choices, default=Direction.DEBIT)
    transaction_date = models.DateTimeField()
    merchant_name = models.CharField(max_length=255, blank=True)
    counterparty = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    reference_id = models.CharField(max_length=255, blank=True, db_index=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-transaction_date", "-id"]
        indexes = [
            models.Index(fields=["user", "transaction_date"]),
            models.Index(fields=["reference_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.transaction_date:%Y-%m-%d} - {self.amount}"

