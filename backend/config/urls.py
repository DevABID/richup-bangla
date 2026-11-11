from django.urls import path, re_path

from game import views

urlpatterns = [
    path("api/rooms/", views.create_room),
    path("api/health/", views.health),
    # Everything else is the React app (it handles /room/<code> itself)
    re_path(r"^(?!api/|ws/).*$", views.frontend),
]
