from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="MapRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("map_name", models.CharField(max_length=80)),
                ("theme", models.TextField(blank=True)),
                ("places", models.TextField()),
                ("requester_name", models.CharField(blank=True, max_length=60)),
                ("contact", models.CharField(blank=True, max_length=120)),
                ("language", models.CharField(blank=True, max_length=5)),
                ("status", models.CharField(
                    choices=[("new", "New"), ("reviewing", "Reviewing"), ("planned", "Planned"),
                             ("done", "Done"), ("declined", "Declined")],
                    default="new", max_length=12)),
                ("admin_notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
