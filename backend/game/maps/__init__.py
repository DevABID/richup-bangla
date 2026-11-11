"""Map registry.

To add a map: create a file like dhaka.py that defines MAP = GameMap(...),
import it here and add it to MAPS. The lobby picks it up automatically.
"""
from . import bangladesh, cantonment, dhaka, tourism
from .base import BOARD_SIZE, GO_SALARY, JAIL_FINE, JAIL_POSITION, OWNABLE, GameMap, MapError  # noqa: F401

MAPS = {m.MAP.id: m.MAP for m in (bangladesh, dhaka, tourism, cantonment)}
DEFAULT_MAP = "bangladesh"


def get_map(map_id):
    return MAPS.get(map_id) or MAPS[DEFAULT_MAP]


def maps_for_client():
    return {map_id: m.to_client() for map_id, m in MAPS.items()}
