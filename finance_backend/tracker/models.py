from django.db import models
from django.contrib.auth.models import User


class Category(models.Model):
    """
    Spending categories (Groceries, Dining, Subscriptions, etc.)
    Seed a default set via a data migration or fixture later.
    """
    name = models.CharField(max_length=100, unique=True)
    is_default = models.BooleanField(default=False)  # system categories vs user-created

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Statement(models.Model):
    """
    A single uploaded bank statement file (CSV or PDF).
    Tracks parsing status so the UI can show progress/errors.
    """
    class FileType(models.TextChoices):
        CSV = "CSV", "CSV"
        PDF = "PDF", "PDF"

    class Status(models.TextChoices):
        UPLOADED = "UPLOADED", "Uploaded"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="statements")
    file = models.FileField(upload_to="statements/%Y/%m/")
    file_hash = models.CharField(max_length=64, blank=True, db_index=True)
    file_type = models.CharField(max_length=3, choices=FileType.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.UPLOADED)
    error_message = models.TextField(blank=True, null=True)  # populated if parsing fails
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "file_hash"], name="unique_statement_file_per_user"),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.file.name} ({self.status})"


class Transaction(models.Model):
    """
    A single parsed transaction line from a statement.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="transactions")
    statement = models.ForeignKey(
        Statement, on_delete=models.CASCADE, related_name="transactions",
        blank=True, null=True  # allow manual entries not tied to an upload, if you add that later
    )
    date = models.DateField()
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # negative = expense, positive = income (pick one convention and stay consistent)

    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, related_name="transactions",
        blank=True, null=True  # null until the AI categorizes it
    )
    category_confidence = models.FloatField(blank=True, null=True)  # optional: store how confident the LLM was
    is_ai_categorized = models.BooleanField(default=False)  # False if user manually overrode it

    # RAG support: store the embedding vector's ID in Chroma, not the vector itself
    chroma_id = models.CharField(max_length=64, blank=True, null=True, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "category"]),
        ]

    def __str__(self):
        return f"{self.date} | {self.description[:40]} | {self.amount}"


class MonthlyInsight(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="insights")
    month = models.DateField()  # kept for display purposes (e.g. "which month this data is from")
 
    # NEW: ties this insight to one specific uploaded statement, so insights
    # are scoped per-upload instead of aggregated across everything a user
    # has ever uploaded.
    statement = models.ForeignKey(
        "Statement", on_delete=models.CASCADE, related_name="insights",
        null=True, blank=True,  # null=True so existing old rows (if any) don't break
    )
 
    summary_text = models.TextField()
    total_spent = models.DecimalField(max_digits=12, decimal_places=2)
    total_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    budget_recommendation = models.TextField(blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        # CHANGED: was unique_together = ("user", "month")
        # Now scoped per statement instead of per calendar month.
        unique_together = ("user", "statement")
        ordering = ["-month"]
 
    def __str__(self):
        return f"{self.user.username} - {self.month.strftime('%B %Y')}"

class ChatMessage(models.Model):
    """
    RAG chat history — lets you show a conversation thread in the UI
    and optionally use recent messages as context for follow-up questions.
    """
    class Role(models.TextChoices):
        USER = "USER", "User"
        ASSISTANT = "ASSISTANT", "Assistant"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chat_messages")
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.user.username} [{self.role}]: {self.content[:50]}"
