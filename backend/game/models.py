from django.db import models


class MapRequest(models.Model):
    STATUS_CHOICES = [
        ("new", "New"),
        ("reviewing", "Reviewing"),
        ("planned", "Planned"),
        ("done", "Done"),
        ("declined", "Declined"),
    ]

    map_name = models.CharField(max_length=80)
    theme = models.TextField(blank=True)
    places = models.TextField()
    requester_name = models.CharField(max_length=60, blank=True)
    contact = models.CharField(max_length=120, blank=True)
    language = models.CharField(max_length=5, blank=True)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="new")
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.map_name
