import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # IMPORTANT: update this to match your actual latest migration
        # filename in tracker/migrations/ (run `docker-compose exec web ls
        # tracker/migrations/` to check -- likely "0003_seed_default_categories")
        ("tracker", "0005_merge_20260726_1346"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="monthlyinsight",
            unique_together=set(),  # drop the old (user, month) constraint first
        ),
        migrations.AddField(
            model_name="monthlyinsight",
            name="statement",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="insights",
                to="tracker.statement",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="monthlyinsight",
            unique_together={("user", "statement")},
        ),
    ]