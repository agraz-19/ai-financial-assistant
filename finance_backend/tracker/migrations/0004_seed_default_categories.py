from django.db import migrations


DEFAULT_CATEGORIES = [
    "Groceries",
    "Dining",
    "Transport",
    "Bills & Subscriptions",
    "Entertainment",
    "Shopping",
    "Transfers",
    "Health",
    "Rent",
    "Other",
]


def seed_categories(apps, schema_editor):
    """
    Runs automatically on every `migrate`, on any database. Uses
    get_or_create-style logic so it's safe to run repeatedly (e.g. if
    someone deletes categories and re-runs migrate) without creating
    duplicates or erroring.

    Uses apps.get_model (the "historical" model) rather than importing
    Category directly -- this is the correct pattern for data migrations,
    since it keeps working even if the real Category model changes shape
    in a later migration.
    """
    Category = apps.get_model("tracker", "Category")
    for name in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(name=name, defaults={"is_default": True})


def remove_seeded_categories(apps, schema_editor):
    """
    Reverse operation, in case this migration is ever rolled back.
    Only removes the specific seeded categories, not anything a user added.
    """
    Category = apps.get_model("tracker", "Category")
    Category.objects.filter(name__in=DEFAULT_CATEGORIES, is_default=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        # IMPORTANT: update this to match your actual latest migration
        # filename (check tracker/migrations/ -- e.g. "0002_statement_file_hash_and_more")
        ("tracker", "0002_statement_file_hash_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_code=remove_seeded_categories),
    ]