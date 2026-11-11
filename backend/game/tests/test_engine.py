"""Run with:  python -m unittest discover -s game/tests -t .   (from backend/)"""
import unittest

from game.maps import JAIL_POSITION
from game.engine import Game, InvalidAction, new_game


class ScriptedRng:
    """Returns pre-set dice values; shuffles are a no-op for predictable tests."""

    def __init__(self, rolls=()):
        self.rolls = list(rolls)

    def randint(self, a, b):
        return self.rolls.pop(0)

    def shuffle(self, seq):
        pass


def started(n=2, rolls=(), **settings):
    state = new_game("TEST")
    g = Game(state, ScriptedRng(rolls))
    for i in range(n):
        g.add_player(f"p{i}", f"Player {i}")
    g.a_update_settings("p0", {"randomize_order": False, **settings})
    g.handle("p0", "start")
    return g


def give(g, pid, *tiles, houses=0):
    for t in tiles:
        g.s["properties"][str(t)] = {"owner": pid, "houses": houses, "mortgaged": False}


class EngineTests(unittest.TestCase):
    def test_start_gives_cash(self):
        g = started()
        self.assertEqual(g.s["status"], "playing")
        self.assertTrue(all(p["money"] == 1500 for p in g.s["players"]))

    def test_roll_move_and_buy(self):
        g = started(rolls=[1, 2])          # lands on 3, Lalmonirhat
        g.handle("p0", "roll")
        self.assertEqual(g.p("p0")["position"], 3)
        self.assertEqual(g.s["phase"], "buy")
        g.handle("p0", "buy")
        self.assertEqual(g.s["properties"]["3"]["owner"], "p0")
        self.assertEqual(g.p("p0")["money"], 1440)
        self.assertEqual(g.s["phase"], "end")

    def test_not_your_turn(self):
        g = started(rolls=[1, 2])
        with self.assertRaises(InvalidAction):
            g.handle("p1", "roll")

    def test_rent_doubles_with_full_set(self):
        g = started(rolls=[1, 2])
        give(g, "p1", 1, 3)
        g.handle("p0", "roll")
        self.assertEqual(g.p("p0")["money"], 1500 - 8)
        self.assertEqual(g.p("p1")["money"], 1500 + 8)

    def test_doubles_give_extra_roll_and_three_go_to_jail(self):
        g = started(rolls=[1, 1, 2, 2, 3, 3])
        g.s["decks"]["community"] = [6]    # Eid bonus, no movement
        g.handle("p0", "roll")             # -> 2 (community)
        self.assertEqual(g.s["phase"], "roll")
        g.handle("p0", "roll")             # -> 6 (buy phase)
        g.handle("p0", "decline")          # auction starts
        g.handle("p1", "fold")
        g.handle("p0", "fold")
        self.assertEqual(g.s["phase"], "roll")
        g.handle("p0", "roll")             # third double
        self.assertTrue(g.p("p0")["in_jail"])
        self.assertEqual(g.p("p0")["position"], JAIL_POSITION)
        self.assertEqual(g.s["phase"], "end")

    def test_passing_go(self):
        g = started(rolls=[3, 4])
        g.p("p0")["position"] = 37
        give(g, "p1", 4)                  # irrelevant, just ownership noise
        g.handle("p0", "roll")             # 37 + 7 = 44 -> 4 (income tax)
        self.assertEqual(g.p("p0")["money"], 1500 + 200 - 200)

    def test_host_sets_start_salary(self):
        g = started(rolls=[3, 4], go_salary=500)
        g.p("p0")["position"] = 37
        g.handle("p0", "roll")             # passes Start, lands on income tax
        self.assertEqual(g.p("p0")["money"], 1500 + 500 - 200)
        g2 = started(rolls=[3, 4], go_salary=0)
        g2.p("p0")["position"] = 37
        g2.handle("p0", "roll")
        self.assertEqual(g2.p("p0")["money"], 1500 - 200)
        self.assertFalse(any(e["type"] == "passed_go" for e in g2.s["log"]))

    def test_auction(self):
        g = started(rolls=[1, 2])
        g.handle("p0", "roll")
        g.handle("p0", "decline")
        g.handle("p1", "bid", {"amount": 30})
        with self.assertRaises(InvalidAction):
            g.handle("p0", "bid", {"amount": 20})
        g.handle("p0", "fold")
        self.assertEqual(g.s["properties"]["3"]["owner"], "p1")
        self.assertEqual(g.p("p1")["money"], 1470)
        self.assertIsNone(g.s["auction"])

    def test_even_build_and_house_rent(self):
        g = started(rolls=[1, 2])
        give(g, "p1", 1, 3)
        g.handle("p1", "build", {"tile": 3})
        with self.assertRaises(InvalidAction):
            g.handle("p1", "build", {"tile": 3})
        g.handle("p1", "build", {"tile": 1})
        g.handle("p0", "roll")             # lands on 3 with 1 house -> 20
        self.assertEqual(g.p("p0")["money"], 1480)

    def test_mortgage_blocks_rent(self):
        g = started(rolls=[1, 2])
        give(g, "p1", 3)
        g.handle("p1", "mortgage", {"tile": 3})
        self.assertEqual(g.p("p1")["money"], 1530)
        g.handle("p0", "roll")
        self.assertEqual(g.p("p0")["money"], 1500)

    def test_railroad_rent_scales(self):
        g = started(rolls=[2, 3])
        give(g, "p1", 5, 15, 25)
        g.handle("p0", "roll")             # lands on 5
        self.assertEqual(g.p("p0")["money"], 1500 - 100)

    def test_trade(self):
        g = started()
        give(g, "p0", 1)
        give(g, "p1", 3)
        g.handle("p0", "propose_trade", {"to": "p1", "offer_props": [1], "request_props": [3], "offer_money": 50})
        tid = next(iter(g.s["trades"]))
        g.handle("p1", "accept_trade", {"trade": tid})
        self.assertEqual(g.s["properties"]["1"]["owner"], "p1")
        self.assertEqual(g.s["properties"]["3"]["owner"], "p0")
        self.assertEqual(g.p("p1")["money"], 1550)

    def test_bankruptcy_to_player_and_winner(self):
        g = started(rolls=[3, 4])
        g.p("p0")["position"] = 32
        g.p("p0")["money"] = 100
        give(g, "p0", 1)
        give(g, "p1", 37, 39, houses=5)   # Banani hotel rent 1500
        g.handle("p0", "roll")             # lands on 39 (Gulshan, hotel 2000)
        self.assertLess(g.p("p0")["money"], 0)
        with self.assertRaises(InvalidAction):
            g.handle("p0", "end_turn")
        g.handle("p0", "bankrupt")
        self.assertEqual(g.s["status"], "finished")
        self.assertEqual(g.s["winner"], "p1")
        self.assertEqual(g.s["properties"]["1"]["owner"], "p1")
        self.assertEqual(g.p("p1")["money"], 1500 + 100)

    def test_jail_three_turns_then_fine(self):
        g = started(rolls=[1, 2, 1, 2, 1, 2])
        g._send_to_jail(g.p("p0"))
        for _ in range(2):
            g.handle("p0", "roll")
            self.assertTrue(g.p("p0")["in_jail"])
            g.handle("p0", "end_turn")
            g.s["turn"] = 0
            g.s["phase"] = "roll"
        g.handle("p0", "roll")
        self.assertFalse(g.p("p0")["in_jail"])
        self.assertEqual(g.p("p0")["position"], 13)

    def test_jail_free_card(self):
        g = started(rolls=[3, 4])
        g.s["decks"]["chance"] = [7] + [i for i in range(16) if i != 7]
        g.handle("p0", "roll")             # lands on 7, chance
        self.assertEqual(g.p("p0")["jail_cards"], ["chance"])
        self.assertNotIn(7, g.s["decks"]["chance"])

    def test_settings_host_only(self):
        state = new_game("X")
        g = Game(state, ScriptedRng())
        g.add_player("a", "A")
        g.add_player("b", "B")
        with self.assertRaises(InvalidAction):
            g.handle("b", "update_settings", {"starting_cash": 3000})
        g.handle("a", "update_settings", {"starting_cash": 99999})
        self.assertEqual(g.s["settings"]["starting_cash"], 5000)

    def test_offline_player_folds_auction(self):
        g = started(n=3, rolls=[1, 2])
        g.handle("p0", "roll")
        g.handle("p0", "decline")
        g.handle("p1", "bid", {"amount": 20})
        g.set_online("p2", False)
        g.handle("p0", "fold")
        self.assertEqual(g.s["properties"]["3"]["owner"], "p1")


if __name__ == "__main__":
    unittest.main()
