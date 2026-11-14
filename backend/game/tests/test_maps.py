"""Checks every registered map is complete and playable.

When you add a map, these tests tell you if anything is missing.
"""
import random
import unittest

from game.engine import Game, InvalidAction, new_game
from game.maps import BOARD_SIZE, MAPS, OWNABLE
from game.maps.base import LAYOUT


class MapTests(unittest.TestCase):
    def test_every_map_is_valid(self):
        for map_id, m in MAPS.items():
            with self.subTest(map=map_id):
                self.assertEqual(m.id, map_id)
                self.assertEqual(len(m.TILES), BOARD_SIZE)
                for i, (tile, base) in enumerate(zip(m.TILES, LAYOUT)):
                    self.assertEqual(tile["id"], i)
                    self.assertEqual(tile["type"], base["type"], "layout must match the shared layout")
                    self.assertTrue(tile["name_bn"].strip() and tile["name_en"].strip())
                sizes = {g: len(ids) for g, ids in m.GROUPS.items()}
                self.assertEqual(sizes["brown"], 2)
                self.assertEqual(sizes["darkblue"], 2)
                self.assertEqual(sizes["railroad"], 4)
                self.assertTrue(m.name_bn and m.name_en and m.desc_bn and m.desc_en)

    def test_place_names_are_unique_within_a_map(self):
        for map_id, m in MAPS.items():
            with self.subTest(map=map_id):
                names = [t["name_en"] for t in m.TILES if t["type"] in OWNABLE]
                self.assertEqual(len(names), len(set(names)))

    def test_cards_have_names_filled_in(self):
        for map_id, m in MAPS.items():
            for deck, cards in m.DECKS.items():
                for card in cards:
                    with self.subTest(map=map_id, deck=deck, card=card["en"]):
                        self.assertNotIn("{", card["bn"] + card["en"])
                        tile = card["action"].get("tile")
                        if tile is not None:
                            self.assertIn(m.TILES[tile]["type"], OWNABLE | {"go"})

    def test_host_can_switch_map_in_lobby_only(self):
        state = new_game("M")
        g = Game(state)
        g.add_player("a", "A")
        g.add_player("b", "B")
        g.handle("a", "update_settings", {"map": "dhaka"})
        self.assertEqual(g.tiles[39]["name_en"], "Gulshan")
        self.assertEqual(g.tiles[1]["name_en"], "Kamrangirchar")
        with self.assertRaises(InvalidAction):
            g.handle("a", "update_settings", {"map": "atlantis"})
        with self.assertRaises(InvalidAction):
            g.handle("b", "update_settings", {"map": "tourism"})
        g.handle("a", "start")
        with self.assertRaises(InvalidAction):
            g.handle("a", "update_settings", {"map": "tourism"})

    def test_campus_map_has_own_corners_and_cards(self):
        m = MAPS["cantonment"]
        self.assertEqual(m.TILES[10]["name_en"], "Retake")
        self.assertEqual(m.TILES[30]["name_en"], "Dress Code Violation!")
        self.assertEqual(m.TILES[7]["name_en"], "Notice Board")
        self.assertEqual(m.TILES[2]["name_en"], "Batch Group")
        self.assertIn("Dean's List", " ".join(c["en"] for c in m.DECKS["chance"]))
        # other maps keep the shared deck and default corners
        self.assertEqual(MAPS["dhaka"].TILES[10]["name_en"], "Traffic jam")

    def test_campus_jail_free_card_round_trip(self):
        state = new_game("C")
        g = Game(state, random.Random(1))
        g.add_player("a", "A")
        g.add_player("b", "B")
        g.handle("a", "update_settings", {"map": "cantonment", "randomize_order": False})
        g.handle("a", "start")
        deck = state["decks"]["chance"]
        card = next(i for i, c in enumerate(g.decks["chance"]) if c["action"]["type"] == "jail_free")
        deck.remove(card)
        deck.insert(0, card)
        pl = g.p("a")
        g._draw(pl, "chance")
        self.assertEqual(pl["jail_cards"], ["chance"])
        g._send_to_jail(pl)
        g.handle("a", "use_card")
        self.assertFalse(pl["in_jail"])
        self.assertIn(card, state["decks"]["chance"])

    def test_world_map_flags(self):
        m = MAPS["world"]
        self.assertEqual(m.TILES[39]["name_en"], "Zurich")
        # every colour group is a single country
        for group, ids in m.GROUPS.items():
            flags = {m.TILES[i].get("flag") for i in ids}
            if group == "utility":
                self.assertEqual(flags, {None})
            elif group != "railroad":
                self.assertEqual(len(flags), 1, group)
            for f in flags - {None}:
                self.assertRegex(f, r"^[a-z]{2}$")
        self.assertNotIn("flag", MAPS["dhaka"].TILES[1])

    def test_old_saved_games_without_map_still_load(self):
        state = new_game("OLD")
        del state["settings"]["map"]
        self.assertEqual(Game(state).map.id, "bangladesh")

    def test_random_games_on_every_map(self):
        actions = ["roll", "buy", "end_turn", "decline", "bid", "build", "mortgage"]
        for map_id in MAPS:
            for seed in range(40):
                rng = random.Random(seed)
                state = new_game("R")
                g = Game(state, rng)
                for i in range(3):
                    g.add_player(f"p{i}", f"P{i}")
                g.handle("p0", "update_settings", {"map": map_id})
                g.handle("p0", "start")
                clock_t = [0.0]
                for _ in range(1500):
                    if state["status"] != "playing":
                        break
                    payload = {"tile": rng.randrange(40), "amount": rng.randint(1, 300)}
                    clock_t[0] += 1      # time moves on, so auctions end
                    try:
                        Game(state, rng, clock=lambda: clock_t[0]).handle(f"p{rng.randrange(3)}", rng.choice(actions), payload)
                    except InvalidAction:
                        pass


if __name__ == "__main__":
    unittest.main()
