from hashlib import sha256

from django.db import migrations


def backfill_file_hash(apps, schema_editor):
    Statement = apps.get_model("tracker", "Statement")

    for statement in Statement.objects.filter(file_hash=""):
        try:
            statement.file.open("rb")
            file_hash = sha256(statement.file.read()).hexdigest()
            statement.file.close()
        except Exception:
            continue

        statement.file_hash = file_hash
        statement.save(update_fields=["file_hash"])


class Migration(migrations.Migration):

    dependencies = [
        ("tracker", "0002_statement_file_hash_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_file_hash, migrations.RunPython.noop),
    ]
