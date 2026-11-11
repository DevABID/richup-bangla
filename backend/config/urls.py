from django.contrib import admin
from django.urls import path, re_path

from game import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/rooms/", views.create_room),
    path("api/map-requests/", views.map_request),
    path("api/health/", views.health),
    # Everything else is the React app (it handles /room/<code> etc. itself)
    re_path(r"^(?!api/|ws/|admin/|static/).*$", views.frontend),
]
