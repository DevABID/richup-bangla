from django.contrib import admin

from .models import MapRequest

admin.site.site_header = "জমিদারি · Admin"
admin.site.site_title = "Jomidari admin"


@admin.register(MapRequest)
class MapRequestAdmin(admin.ModelAdmin):
    list_display = ("map_name", "requester_name", "status", "created_at")
    list_filter = ("status", "language")
    list_editable = ("status",)
    search_fields = ("map_name", "theme", "places", "requester_name", "contact")
    readonly_fields = ("created_at",)
    fields = ("map_name", "theme", "places", "requester_name", "contact", "language",
              "status", "admin_notes", "created_at")
