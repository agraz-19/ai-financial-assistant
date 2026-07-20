from collections import defaultdict

from django.core.management.base import BaseCommand

from tracker.models import Transaction


class Command(BaseCommand):
    help = "Find exact duplicate transactions by user, date, description, and amount."

    def add_arguments(self, parser):
        parser.add_argument(
            "--user-id",
            type=int,
            help="Optional user ID to limit the check to one user.",
        )

    def handle(self, *args, **options):
        queryset = Transaction.objects.all().select_related("user")
        user_id = options.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        grouped = defaultdict(list)
        for txn in queryset.order_by("user_id", "date", "description", "amount", "id"):
            key = (txn.user_id, txn.date, txn.description.strip().lower(), txn.amount)
            grouped[key].append(txn)

        duplicate_groups = [items for items in grouped.values() if len(items) > 1]

        if not duplicate_groups:
            self.stdout.write(self.style.SUCCESS("No exact duplicate transactions found."))
            return

        self.stdout.write(self.style.WARNING(f"Found {len(duplicate_groups)} duplicate groups:"))
        for items in duplicate_groups:
            representative = items[0]
            self.stdout.write(
                f"- User {representative.user_id}, {representative.date}, "
                f"'{representative.description}', amount {representative.amount}: {len(items)} rows"
            )
            for txn in items:
                self.stdout.write(f"  #{txn.id} | {txn.user.username} | {txn.date} | {txn.amount} | {txn.description}")
