from django.urls import re_path

from .consumers import GameConsumer

websocket_urlpatterns = [
    re_path(r"^ws/game/(?P<room>[A-Za-z0-9]{4,10})/$", GameConsumer.as_asgi()),
]
