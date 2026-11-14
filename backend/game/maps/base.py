"""Shared board layout and the GameMap builder.

Every map uses the same 40-slot economic layout below (prices, rents,
colour groups, special tiles). A map only supplies names and icons for
the 28 ownable slots, so all maps are equally balanced and cards can
refer to tile numbers safely: tile 39 is always the priciest property.
"""
from ..cards import CARD_TEMPLATES

GO_SALARY = 200
JAIL_POSITION = 10
JAIL_FINE = 50
BOARD_SIZE = 40
OWNABLE = {"property", "railroad", "utility"}

GROUP_COLORS = {
    "brown": "#8d5524",
    "lightblue": "#5bc0eb",
    "pink": "#e5007d",
    "orange": "#f6a400",
    "red": "#d62828",
    "yellow": "#f2d600",
    "green": "#1b9e4b",
    "darkblue": "#1d3fa6",
}


def _p(group, price, rent, house_cost):
    return {"type": "property", "group": group, "price": price, "rent": rent, "house_cost": house_cost}


_RAIL = {"type": "railroad", "group": "railroad", "price": 200}
_UTIL = {"type": "utility", "group": "utility", "price": 150}
_CHANCE = {"type": "chance", "name_bn": "ভাগ্য", "name_en": "Chance", "icon": "❓"}
_COMMUNITY = {"type": "community", "name_bn": "জনকল্যাণ", "name_en": "Community", "icon": "🤝"}

LAYOUT = [
    {"type": "go", "name_bn": "শুরু", "name_en": "Start", "icon": "🏁"},
    _p("brown", 60, [2, 10, 30, 90, 160, 250], 50),
    _COMMUNITY,
    _p("brown", 60, [4, 20, 60, 180, 320, 450], 50),
    {"type": "tax", "name_bn": "আয়কর", "name_en": "Income tax", "icon": "💸", "amount": 200},
    _RAIL,
    _p("lightblue", 100, [6, 30, 90, 270, 400, 550], 50),
    _CHANCE,
    _p("lightblue", 100, [6, 30, 90, 270, 400, 550], 50),
    _p("lightblue", 120, [8, 40, 100, 300, 450, 600], 50),
    {"type": "jail", "name_bn": "যানজট", "name_en": "Traffic jam", "icon": "🚦"},
    _p("pink", 140, [10, 50, 150, 450, 625, 750], 100),
    _UTIL,
    _p("pink", 140, [10, 50, 150, 450, 625, 750], 100),
    _p("pink", 160, [12, 60, 180, 500, 700, 900], 100),
    _RAIL,
    _p("orange", 180, [14, 70, 200, 550, 750, 950], 100),
    _COMMUNITY,
    _p("orange", 180, [14, 70, 200, 550, 750, 950], 100),
    _p("orange", 200, [16, 80, 220, 600, 800, 1000], 100),
    {"type": "free_parking", "name_bn": "চা বিরতি", "name_en": "Tea break", "icon": "☕"},
    _p("red", 220, [18, 90, 250, 700, 875, 1050], 150),
    _CHANCE,
    _p("red", 220, [18, 90, 250, 700, 875, 1050], 150),
    _p("red", 240, [20, 100, 300, 750, 925, 1100], 150),
    _RAIL,
    _p("yellow", 260, [22, 110, 330, 800, 975, 1150], 150),
    _p("yellow", 260, [22, 110, 330, 800, 975, 1150], 150),
    _UTIL,
    _p("yellow", 280, [24, 120, 360, 850, 1025, 1200], 150),
    {"type": "go_to_jail", "name_bn": "যানজটে আটকে যান", "name_en": "Go to traffic jam", "icon": "🚓"},
    _p("green", 300, [26, 130, 390, 900, 1100, 1275], 200),
    _p("green", 300, [26, 130, 390, 900, 1100, 1275], 200),
    _COMMUNITY,
    _p("green", 320, [28, 150, 450, 1000, 1200, 1400], 200),
    _RAIL,
    _CHANCE,
    _p("darkblue", 350, [35, 175, 500, 1100, 1300, 1500], 200),
    {"type": "tax", "name_bn": "ভ্যাট", "name_en": "VAT", "icon": "💸", "amount": 100},
    _p("darkblue", 400, [50, 200, 600, 1400, 1700, 2000], 200),
]
assert len(LAYOUT) == BOARD_SIZE

OWNABLE_SLOTS = [i for i, t in enumerate(LAYOUT) if t["type"] in OWNABLE]
TAX_SLOTS = [i for i, t in enumerate(LAYOUT) if t["type"] == "tax"]
CORNER_SLOTS = [0, 10, 20, 30]
RENAMABLE = set(OWNABLE_SLOTS) | set(TAX_SLOTS) | set(CORNER_SLOTS)
CARD_ACTIONS = {"money", "move_to", "move_by", "go_to_jail", "jail_free",
                "pay_each", "collect_each", "repairs", "nearest"}

DEFAULT_ICONS = {"railroad": "🚆", "utility": "💡"}


class MapError(ValueError):
    pass


def _apply(tile, entry):
    """entry = (name_bn, name_en[, icon[, tagline_bn, tagline_en]])"""
    tile["name_bn"], tile["name_en"] = entry[0], entry[1]
    if len(entry) > 2 and entry[2]:
        tile["icon"] = entry[2]
    if len(entry) > 4:
        tile["tagline_bn"], tile["tagline_en"] = entry[3], entry[4]


class GameMap:
    """A playable map: tiles, colour groups and card decks with this map's names.

    places:     {slot: (name_bn, name_en[, icon[, tagline_bn, tagline_en]])}
                Required for every ownable slot; corners (0, 10, 20, 30) and
                taxes (4, 38) may be renamed too.
    deck_names: optional {"chance": (bn, en, icon), "community": (...)} to rename
                the card tiles.
    decks:      optional {"chance": [...], "community": [...]} with this map's
                own cards (same format as cards.py); defaults to the shared deck.
    flags:      optional {slot: "jp"} country codes, shown as a flag on the tile.
    """

    def __init__(self, id, name_bn, name_en, desc_bn, desc_en, places, deck_names=None, decks=None, flags=None):
        self.id = id
        self.name_bn, self.name_en = name_bn, name_en
        self.desc_bn, self.desc_en = desc_bn, desc_en

        missing = [s for s in OWNABLE_SLOTS if s not in places]
        extra = [s for s in places if s not in RENAMABLE]
        if missing or extra:
            raise MapError(f"map {id!r}: missing slots {missing}, unexpected slots {extra}")

        self.TILES = []
        for i, base in enumerate(LAYOUT):
            tile = dict(base, id=i, color=GROUP_COLORS.get(base.get("group")))
            if i in places:
                _apply(tile, places[i])
            elif tile["type"] in (deck_names or {}):
                _apply(tile, deck_names[tile["type"]])
            tile.setdefault("icon", DEFAULT_ICONS.get(tile["type"]))
            if flags and i in flags:
                tile["flag"] = flags[i]
            if not tile.get("name_bn") or not tile.get("name_en"):
                raise MapError(f"map {id!r}: tile {i} has no name")
            self.TILES.append(tile)

        self.GROUPS = {}
        for t in self.TILES:
            if t["type"] in OWNABLE:
                self.GROUPS.setdefault(t["group"], []).append(t["id"])

        # Fill {name} in card texts with this map's place names
        self.DECKS = {}
        for deck, templates in (decks or CARD_TEMPLATES).items():
            cards = []
            for card in templates:
                if card["action"]["type"] not in CARD_ACTIONS:
                    raise MapError(f"map {id!r}: unknown card action {card['action']['type']!r}")
                tile = card["action"].get("tile")
                names = {"bn": "", "en": ""}
                if tile is not None:
                    names = {"bn": self.TILES[tile]["name_bn"], "en": self.TILES[tile]["name_en"]}
                cards.append({
                    "bn": card["bn"].format(name=names["bn"]),
                    "en": card["en"].format(name=names["en"]),
                    "action": card["action"],
                })
            self.DECKS[deck] = cards
        if set(self.DECKS) != {"chance", "community"}:
            raise MapError(f"map {id!r}: needs exactly a chance and a community deck")

    def to_client(self):
        return {
            "id": self.id,
            "name_bn": self.name_bn, "name_en": self.name_en,
            "desc_bn": self.desc_bn, "desc_en": self.desc_en,
            "tiles": self.TILES,
            "cards": {k: [{"bn": c["bn"], "en": c["en"]} for c in v] for k, v in self.DECKS.items()},
        }
