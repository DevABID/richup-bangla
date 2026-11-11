"""Authoritative game engine.

Pure Python, no Django: the whole game is a JSON-serialisable dict so it can
live in Redis. Clients send intents ("roll", "buy", ...) and the engine
validates them, mutates the state and records log events.

Validation happens before any mutation, so if an action raises InvalidAction
the caller can simply discard the (deep-copied) state.
"""
import random
import time
import uuid

from .maps import BOARD_SIZE, DEFAULT_MAP, GO_SALARY, JAIL_FINE, JAIL_POSITION, MAPS, OWNABLE, get_map

COLORS = ["#e63946", "#3a86ff", "#2a9d8f", "#f4a261", "#9b5de5", "#ff006e", "#06d6a0", "#8d99ae"]

DEFAULT_SETTINGS = {
    "map": DEFAULT_MAP,
    "max_players": 6,
    "starting_cash": 1500,
    "go_salary": GO_SALARY,      # money for passing Start, set by the host
    "auction": True,             # unbought property goes to auction
    "free_parking_pot": False,   # taxes/fines collect on "Tea break"
    "no_rent_in_jail": False,    # owners in jail don't collect rent
    "even_build": True,          # houses must be built evenly across a set
    "double_rent_full_set": True,
    "mortgage": True,
    "randomize_order": True,
}

SETTING_RULES = {
    "max_players": (int, 2, 8),
    "starting_cash": (int, 500, 5000),
    "go_salary": (int, 0, 1000),
}

LOG_LIMIT = 80
CHAT_LIMIT = 100


class InvalidAction(Exception):
    """Raised with an i18n key the client can translate."""

    def __init__(self, key, **params):
        super().__init__(key)
        self.key = key
        self.params = params


def new_game(room):
    return {
        "room": room,
        "status": "lobby",          # lobby | playing | finished
        "host": None,
        "settings": dict(DEFAULT_SETTINGS),
        "players": [],
        "order": [],
        "turn": 0,
        "phase": "roll",            # roll | buy | auction | end
        "dice": [1, 1],
        "doubles_count": 0,
        "extra_roll": False,
        "pending_buy": None,
        "auction": None,
        "properties": {},           # "tile_id" -> {owner, houses, mortgaged}
        "trades": {},
        "pot": 0,
        "winner": None,
        "decks": {},
        "log": [],
        "chat": [],
        "seq": 0,
    }


def public_state(state):
    """State as sent to clients (hides deck order)."""
    return {k: v for k, v in state.items() if k != "decks"}


class Game:
    def __init__(self, state, rng=None):
        self.s = state
        self.rng = rng or random.SystemRandom()
        self.events = []

    # ------------------------------------------------------------------ map
    # Read on every access: the host can switch maps while in the lobby.
    @property
    def map(self):
        return get_map(self.s["settings"].get("map"))

    @property
    def tiles(self):
        return self.map.TILES

    @property
    def groups(self):
        return self.map.GROUPS

    @property
    def decks(self):
        return self.map.DECKS

    # ------------------------------------------------------------------ helpers
    def p(self, pid):
        for pl in self.s["players"]:
            if pl["id"] == pid:
                return pl
        raise InvalidAction("unknown_player")

    def has(self, pid):
        return any(pl["id"] == pid for pl in self.s["players"])

    @property
    def current_id(self):
        if not self.s["order"]:
            return None
        return self.s["order"][self.s["turn"]]

    def alive(self):
        return [pl for pl in self.s["players"] if not pl["bankrupt"]]

    def _log(self, kind, **params):
        self.s["seq"] += 1
        ev = {"id": self.s["seq"], "type": kind, "ts": int(time.time()), **params}
        self.s["log"].append(ev)
        self.s["log"] = self.s["log"][-LOG_LIMIT:]
        self.events.append(ev)

    def _prop(self, tile):
        return self.s["properties"].get(str(tile))

    def _owned_by(self, pid, group):
        return [t for t in self.groups[group] if (self._prop(t) or {}).get("owner") == pid]

    def _owns_group(self, pid, group):
        return len(self._owned_by(pid, group)) == len(self.groups[group])

    def _group_has_houses(self, group):
        return any((self._prop(t) or {}).get("houses", 0) > 0 for t in self.groups[group])

    def _require_playing(self):
        if self.s["status"] != "playing":
            raise InvalidAction("game_not_running")

    def _require_turn(self, pid):
        self._require_playing()
        if pid != self.current_id:
            raise InvalidAction("not_your_turn")

    def _require_phase(self, *phases):
        if self.s["phase"] not in phases:
            raise InvalidAction("wrong_phase")

    def _require_owner(self, pid, tile):
        prop = self._prop(tile)
        if not prop or prop["owner"] != pid:
            raise InvalidAction("not_owner")
        return prop

    def _credit(self, pl, amount):
        pl["money"] += amount
        if pl["money"] >= 0:
            pl["debt_to"] = None

    def _pay(self, payer, amount, creditor=None, reason="bank"):
        """Money may go negative; the player must then raise cash or go bankrupt."""
        payer["money"] -= amount
        if creditor is not None:
            self._credit(creditor, amount)
        elif reason in ("tax", "jail_fine", "card", "repairs") and self.s["settings"]["free_parking_pot"]:
            self.s["pot"] += amount
        if payer["money"] < 0:
            payer["debt_to"] = creditor["id"] if creditor else None

    # ------------------------------------------------------------------ lobby
    def add_player(self, pid, name):
        if self.has(pid):
            pl = self.p(pid)
            pl["online"] = True
            if self.s["status"] == "lobby" and name:
                pl["name"] = name
            return pl
        if self.s["status"] != "lobby":
            raise InvalidAction("game_started")
        if len(self.s["players"]) >= self.s["settings"]["max_players"]:
            raise InvalidAction("room_full")
        used = {pl["color"] for pl in self.s["players"]}
        color = next(c for c in COLORS if c not in used)
        pl = {
            "id": pid, "name": name or "Player", "color": color, "money": 0,
            "position": 0, "in_jail": False, "jail_turns": 0, "jail_cards": [],
            "bankrupt": False, "debt_to": None, "online": True, "voice": False,
        }
        self.s["players"].append(pl)
        if not self.s["host"]:
            self.s["host"] = pid
        self._log("joined", player=pid)
        return pl

    def set_online(self, pid, online):
        if self.has(pid):
            pl = self.p(pid)
            pl["online"] = online
            if online:
                return
            pl["voice"] = False
            # Hand the lobby to someone who is still here
            if self.s["status"] == "lobby" and self.s["host"] == pid:
                here = [p for p in self.s["players"] if p["online"]]
                if here:
                    self.s["host"] = here[0]["id"]
            # Don't let an offline player stall an auction
            auc = self.s["auction"]
            if auc and pid in auc["active"] and auc["high_bidder"] != pid:
                auc["active"].remove(pid)
                self._log("fold", player=pid)
                self._check_auction()

    def a_update_settings(self, pid, payload):
        if pid != self.s["host"] or self.s["status"] != "lobby":
            raise InvalidAction("host_only")
        for key, value in (payload or {}).items():
            if key not in DEFAULT_SETTINGS:
                continue
            if key == "map":
                if value not in MAPS:
                    raise InvalidAction("unknown_map")
            elif key in SETTING_RULES:
                _, lo, hi = SETTING_RULES[key]
                try:
                    value = max(lo, min(hi, int(value)))
                except (TypeError, ValueError):
                    continue
                if key == "max_players":
                    value = max(value, len(self.s["players"]))
            else:
                value = bool(value)
            self.s["settings"][key] = value

    def a_choose_color(self, pid, payload):
        if self.s["status"] != "lobby":
            raise InvalidAction("game_started")
        color = (payload or {}).get("color")
        if color not in COLORS or any(pl["color"] == color for pl in self.s["players"] if pl["id"] != pid):
            raise InvalidAction("color_taken")
        self.p(pid)["color"] = color

    def a_kick(self, pid, payload):
        target = (payload or {}).get("player")
        if pid != self.s["host"] or self.s["status"] != "lobby" or target == pid:
            raise InvalidAction("host_only")
        self.p(target)
        self.s["players"] = [pl for pl in self.s["players"] if pl["id"] != target]
        self._log("left", player=target)

    def a_leave(self, pid, _):
        if self.s["status"] == "lobby":
            self.s["players"] = [pl for pl in self.s["players"] if pl["id"] != pid]
            if self.s["host"] == pid:
                self.s["host"] = self.s["players"][0]["id"] if self.s["players"] else None
            self._log("left", player=pid)
        elif self.s["status"] == "playing" and not self.p(pid)["bankrupt"]:
            pl = self.p(pid)
            pl["debt_to"] = None
            self._bankrupt(pl)

    def a_start(self, pid, _):
        if pid != self.s["host"] or self.s["status"] != "lobby":
            raise InvalidAction("host_only")
        if len(self.s["players"]) < 2:
            raise InvalidAction("need_two_players")
        order = [pl["id"] for pl in self.s["players"]]
        if self.s["settings"]["randomize_order"]:
            self.rng.shuffle(order)
        for pl in self.s["players"]:
            pl["money"] = self.s["settings"]["starting_cash"]
        decks = {}
        for name, cards in self.decks.items():
            idx = list(range(len(cards)))
            self.rng.shuffle(idx)
            decks[name] = idx
        self.s.update(order=order, turn=0, phase="roll", status="playing", decks=decks)
        self._log("game_started")
        self._log("turn", player=self.current_id)

    # ------------------------------------------------------------------ turn flow
    def a_roll(self, pid, _):
        self._require_turn(pid)
        self._require_phase("roll")
        pl = self.p(pid)
        if pl["money"] < 0:
            raise InvalidAction("in_debt")
        d1, d2 = self.rng.randint(1, 6), self.rng.randint(1, 6)
        self.s["dice"] = [d1, d2]
        doubles = d1 == d2
        self.s["extra_roll"] = False
        self._log("rolled", player=pid, dice=[d1, d2])

        if pl["in_jail"]:
            if doubles:
                pl["in_jail"], pl["jail_turns"] = False, 0
                self._log("jail_doubles", player=pid)
            else:
                pl["jail_turns"] += 1
                if pl["jail_turns"] < 3:
                    self.s["phase"] = "end"
                    return
                self._pay(pl, JAIL_FINE, reason="jail_fine")
                pl["in_jail"], pl["jail_turns"] = False, 0
                self._log("jail_fine_paid", player=pid, amount=JAIL_FINE)
        elif doubles:
            self.s["doubles_count"] += 1
            if self.s["doubles_count"] >= 3:
                self._log("three_doubles", player=pid)
                self._send_to_jail(pl)
                self.s["phase"] = "end"
                return
            self.s["extra_roll"] = True

        self._move_by(pl, d1 + d2)
        self._after_move()

    def a_pay_fine(self, pid, _):
        self._require_turn(pid)
        self._require_phase("roll")
        pl = self.p(pid)
        if not pl["in_jail"]:
            raise InvalidAction("not_in_jail")
        if pl["money"] < JAIL_FINE:
            raise InvalidAction("not_enough_money")
        self._pay(pl, JAIL_FINE, reason="jail_fine")
        pl["in_jail"], pl["jail_turns"] = False, 0
        self._log("jail_fine_paid", player=pid, amount=JAIL_FINE)

    def a_use_card(self, pid, _):
        self._require_turn(pid)
        self._require_phase("roll")
        pl = self.p(pid)
        if not pl["in_jail"] or not pl["jail_cards"]:
            raise InvalidAction("no_jail_card")
        deck = pl["jail_cards"].pop()
        jail_idx = next(i for i, c in enumerate(self.decks[deck]) if c["action"]["type"] == "jail_free")
        self.s["decks"][deck].append(jail_idx)
        pl["in_jail"], pl["jail_turns"] = False, 0
        self._log("jail_card_used", player=pid)

    def a_end_turn(self, pid, _):
        self._require_turn(pid)
        self._require_phase("end")
        if self.p(pid)["money"] < 0:
            raise InvalidAction("in_debt")
        self._next_turn()

    def _after_move(self):
        if self.s["phase"] in ("buy", "auction"):
            return
        pl = self.p(self.current_id)
        self.s["phase"] = "roll" if self.s["extra_roll"] and not pl["in_jail"] else "end"

    def _next_turn(self):
        if self.s["status"] != "playing":
            return
        self.s["doubles_count"] = 0
        self.s["extra_roll"] = False
        n = len(self.s["order"])
        for step in range(1, n + 1):
            idx = (self.s["turn"] + step) % n
            if not self.p(self.s["order"][idx])["bankrupt"]:
                self.s["turn"] = idx
                break
        self.s["phase"] = "roll"
        self._log("turn", player=self.current_id)

    # ------------------------------------------------------------------ movement
    def _salary(self, pl):
        amount = self.s["settings"].get("go_salary", GO_SALARY)
        if amount > 0:
            self._credit(pl, amount)
            self._log("passed_go", player=pl["id"], amount=amount)

    def _move_by(self, pl, steps):
        old = pl["position"]
        new = (old + steps) % BOARD_SIZE
        if steps > 0 and new < old:
            self._salary(pl)
        pl["position"] = new
        self._log("moved", player=pl["id"], to=new)
        self._land(pl)

    def _move_to(self, pl, tile, special=None):
        if tile < pl["position"]:
            self._salary(pl)
        pl["position"] = tile
        self._log("moved", player=pl["id"], to=tile)
        self._land(pl, special)

    def _send_to_jail(self, pl):
        pl.update(position=JAIL_POSITION, in_jail=True, jail_turns=0)
        self.s["extra_roll"] = False
        self._log("jail", player=pl["id"])

    def _land(self, pl, special=None):
        tile = self.tiles[pl["position"]]
        kind = tile["type"]
        if kind in OWNABLE:
            prop = self._prop(tile["id"])
            if prop is None:
                self.s["pending_buy"] = tile["id"]
                self.s["phase"] = "buy"
            elif prop["owner"] != pl["id"] and not prop["mortgaged"]:
                owner = self.p(prop["owner"])
                if owner["in_jail"] and self.s["settings"]["no_rent_in_jail"]:
                    return
                rent = self._rent(tile["id"], special)
                if rent > 0:
                    self._pay(pl, rent, owner)
                    self._log("paid_rent", player=pl["id"], owner=owner["id"], tile=tile["id"], amount=rent)
        elif kind == "tax":
            self._pay(pl, tile["amount"], reason="tax")
            self._log("paid", player=pl["id"], amount=tile["amount"], reason="tax")
        elif kind in ("chance", "community"):
            self._draw(pl, kind)
        elif kind == "go_to_jail":
            self._send_to_jail(pl)
        elif kind == "free_parking" and self.s["settings"]["free_parking_pot"] and self.s["pot"] > 0:
            amount, self.s["pot"] = self.s["pot"], 0
            self._credit(pl, amount)
            self._log("pot_collected", player=pl["id"], amount=amount)

    def _rent(self, tile_id, special=None):
        tile = self.tiles[tile_id]
        prop = self._prop(tile_id)
        if not prop or prop["mortgaged"]:
            return 0
        owner = prop["owner"]
        if tile["type"] == "property":
            if prop["houses"] > 0:
                return tile["rent"][prop["houses"]]
            base = tile["rent"][0]
            if self.s["settings"]["double_rent_full_set"] and self._owns_group(owner, tile["group"]):
                base *= 2
            return base
        count = len([t for t in self._owned_by(owner, tile["group"]) if not self._prop(t)["mortgaged"]])
        if tile["type"] == "railroad":
            rent = 25 * 2 ** (count - 1)
            return rent * 2 if special == "nearest" else rent
        mult = 10 if special == "nearest" or count == 2 else 4
        return sum(self.s["dice"]) * mult

    # ------------------------------------------------------------------ cards
    def _draw(self, pl, deck):
        order = self.s["decks"][deck]
        idx = order.pop(0)
        card = self.decks[deck][idx]
        action = card["action"]
        if action["type"] == "jail_free":
            pl["jail_cards"].append(deck)
        else:
            order.append(idx)
        self._log("card", player=pl["id"], deck=deck, card=idx)
        kind = action["type"]
        others = [o for o in self.alive() if o["id"] != pl["id"]]

        if kind == "money":
            if action["amount"] >= 0:
                self._credit(pl, action["amount"])
            else:
                self._pay(pl, -action["amount"], reason="card")
        elif kind == "move_to":
            self._move_to(pl, action["tile"])
        elif kind == "move_by":
            pl["position"] = (pl["position"] + action["steps"]) % BOARD_SIZE
            self._log("moved", player=pl["id"], to=pl["position"])
            self._land(pl)
        elif kind == "go_to_jail":
            self._send_to_jail(pl)
        elif kind == "pay_each":
            for o in others:
                self._pay(pl, action["amount"], o)
        elif kind == "collect_each":
            for o in others:
                self._pay(o, action["amount"], pl)
        elif kind == "repairs":
            houses = hotels = 0
            for prop in self.s["properties"].values():
                if prop["owner"] == pl["id"]:
                    if prop["houses"] == 5:
                        hotels += 1
                    else:
                        houses += prop["houses"]
            cost = houses * action["house"] + hotels * action["hotel"]
            if cost:
                self._pay(pl, cost, reason="repairs")
        elif kind == "nearest":
            pos = pl["position"]
            for step in range(1, BOARD_SIZE + 1):
                t = self.tiles[(pos + step) % BOARD_SIZE]
                if t["type"] == action["kind"]:
                    self._move_to(pl, t["id"], special="nearest")
                    break

    # ------------------------------------------------------------------ buying & auctions
    def a_buy(self, pid, _):
        self._require_turn(pid)
        self._require_phase("buy")
        pl = self.p(pid)
        tile = self.tiles[self.s["pending_buy"]]
        if pl["money"] < tile["price"]:
            raise InvalidAction("not_enough_money")
        self._pay(pl, tile["price"])
        self.s["properties"][str(tile["id"])] = {"owner": pid, "houses": 0, "mortgaged": False}
        self.s["pending_buy"] = None
        self.s["phase"] = "moved"
        self._log("bought", player=pid, tile=tile["id"], amount=tile["price"])
        self._after_move()

    def a_decline(self, pid, _):
        self._require_turn(pid)
        self._require_phase("buy")
        tile = self.s["pending_buy"]
        if self.s["settings"]["auction"]:
            self.s["auction"] = {
                "tile": tile, "high_bid": 0, "high_bidder": None,
                "active": [pl["id"] for pl in self.alive()],
            }
            self.s["phase"] = "auction"
            self._log("auction_started", tile=tile)
        else:
            self.s["pending_buy"] = None
            self.s["phase"] = "moved"
            self._after_move()

    def a_bid(self, pid, payload):
        self._require_playing()
        self._require_phase("auction")
        auc = self.s["auction"]
        if pid not in auc["active"]:
            raise InvalidAction("not_in_auction")
        try:
            amount = int((payload or {}).get("amount"))
        except (TypeError, ValueError):
            raise InvalidAction("bad_amount")
        if amount <= auc["high_bid"]:
            raise InvalidAction("bid_too_low")
        if amount > self.p(pid)["money"]:
            raise InvalidAction("not_enough_money")
        auc["high_bid"], auc["high_bidder"] = amount, pid
        self._log("bid", player=pid, amount=amount)
        self._check_auction()

    def a_fold(self, pid, _):
        self._require_playing()
        self._require_phase("auction")
        auc = self.s["auction"]
        if pid not in auc["active"]:
            raise InvalidAction("not_in_auction")
        if auc["high_bidder"] == pid:
            raise InvalidAction("high_bidder_cannot_fold")
        auc["active"].remove(pid)
        self._log("fold", player=pid)
        self._check_auction()

    def _check_auction(self):
        auc = self.s["auction"]
        if not auc:
            return
        active = auc["active"]
        done = len(active) == 0 or (len(active) == 1 and auc["high_bidder"] == active[0])
        if not done:
            return
        tile = auc["tile"]
        if auc["high_bidder"]:
            winner = self.p(auc["high_bidder"])
            self._pay(winner, auc["high_bid"])
            self.s["properties"][str(tile)] = {"owner": winner["id"], "houses": 0, "mortgaged": False}
            self._log("auction_won", player=winner["id"], tile=tile, amount=auc["high_bid"])
        else:
            self._log("auction_unsold", tile=tile)
        self.s["auction"] = None
        self.s["pending_buy"] = None
        self.s["phase"] = "moved"
        self._after_move()

    # ------------------------------------------------------------------ building & mortgages
    def a_build(self, pid, payload):
        self._require_playing()
        tile_id = int((payload or {}).get("tile", -1))
        prop = self._require_owner(pid, tile_id)
        tile = self.tiles[tile_id]
        if tile["type"] != "property" or not self._owns_group(pid, tile["group"]):
            raise InvalidAction("need_full_set")
        group = self.groups[tile["group"]]
        if any(self._prop(t)["mortgaged"] for t in group):
            raise InvalidAction("set_mortgaged")
        if prop["houses"] >= 5:
            raise InvalidAction("max_buildings")
        if self.s["settings"]["even_build"] and prop["houses"] > min(self._prop(t)["houses"] for t in group):
            raise InvalidAction("build_evenly")
        pl = self.p(pid)
        if pl["money"] < tile["house_cost"]:
            raise InvalidAction("not_enough_money")
        self._pay(pl, tile["house_cost"])
        prop["houses"] += 1
        self._log("built", player=pid, tile=tile_id, houses=prop["houses"])

    def a_sell_house(self, pid, payload):
        self._require_playing()
        tile_id = int((payload or {}).get("tile", -1))
        prop = self._require_owner(pid, tile_id)
        if prop["houses"] <= 0:
            raise InvalidAction("no_buildings")
        tile = self.tiles[tile_id]
        group = self.groups[tile["group"]]
        if self.s["settings"]["even_build"] and prop["houses"] < max(self._prop(t)["houses"] for t in group):
            raise InvalidAction("sell_evenly")
        prop["houses"] -= 1
        self._credit(self.p(pid), tile["house_cost"] // 2)
        self._log("sold_house", player=pid, tile=tile_id, houses=prop["houses"])

    def a_mortgage(self, pid, payload):
        self._require_playing()
        if not self.s["settings"]["mortgage"]:
            raise InvalidAction("mortgage_disabled")
        tile_id = int((payload or {}).get("tile", -1))
        prop = self._require_owner(pid, tile_id)
        tile = self.tiles[tile_id]
        if prop["mortgaged"]:
            raise InvalidAction("already_mortgaged")
        if self._group_has_houses(tile["group"]):
            raise InvalidAction("sell_buildings_first")
        prop["mortgaged"] = True
        self._credit(self.p(pid), tile["price"] // 2)
        self._log("mortgaged", player=pid, tile=tile_id, amount=tile["price"] // 2)

    def a_unmortgage(self, pid, payload):
        self._require_playing()
        tile_id = int((payload or {}).get("tile", -1))
        prop = self._require_owner(pid, tile_id)
        if not prop["mortgaged"]:
            raise InvalidAction("not_mortgaged")
        cost = int(self.tiles[tile_id]["price"] // 2 * 1.1)
        pl = self.p(pid)
        if pl["money"] < cost:
            raise InvalidAction("not_enough_money")
        self._pay(pl, cost)
        prop["mortgaged"] = False
        self._log("unmortgaged", player=pid, tile=tile_id, amount=cost)

    # ------------------------------------------------------------------ trading
    def _validate_trade_side(self, pid, money, props):
        if money < 0:
            raise InvalidAction("bad_amount")
        for t in props:
            prop = self._prop(t)
            if not prop or prop["owner"] != pid:
                raise InvalidAction("trade_invalid")
            if self._group_has_houses(self.tiles[t]["group"]):
                raise InvalidAction("sell_buildings_first")

    def a_propose_trade(self, pid, payload):
        self._require_playing()
        payload = payload or {}
        to = payload.get("to")
        if to == pid or not self.has(to) or self.p(to)["bankrupt"] or self.p(pid)["bankrupt"]:
            raise InvalidAction("trade_invalid")
        try:
            offer_money = int(payload.get("offer_money") or 0)
            request_money = int(payload.get("request_money") or 0)
            offer_props = sorted({int(t) for t in payload.get("offer_props") or []})
            request_props = sorted({int(t) for t in payload.get("request_props") or []})
        except (TypeError, ValueError):
            raise InvalidAction("trade_invalid")
        if not (offer_money or request_money or offer_props or request_props):
            raise InvalidAction("trade_empty")
        self._validate_trade_side(pid, offer_money, offer_props)
        self._validate_trade_side(to, request_money, request_props)
        tid = uuid.uuid4().hex[:8]
        self.s["trades"][tid] = {
            "id": tid, "from": pid, "to": to,
            "offer_money": offer_money, "offer_props": offer_props,
            "request_money": request_money, "request_props": request_props,
        }
        self._log("trade_proposed", player=pid, to=to)

    def _get_trade(self, payload):
        trade = self.s["trades"].get((payload or {}).get("trade"))
        if not trade:
            raise InvalidAction("trade_not_found")
        return trade

    def a_accept_trade(self, pid, payload):
        self._require_playing()
        tr = self._get_trade(payload)
        if tr["to"] != pid:
            raise InvalidAction("trade_not_found")
        a, b = self.p(tr["from"]), self.p(tr["to"])
        self._validate_trade_side(a["id"], tr["offer_money"], tr["offer_props"])
        self._validate_trade_side(b["id"], tr["request_money"], tr["request_props"])
        if a["money"] < tr["offer_money"] or b["money"] < tr["request_money"]:
            raise InvalidAction("not_enough_money")
        self._pay(a, tr["offer_money"], b)
        self._pay(b, tr["request_money"], a)
        for t in tr["offer_props"]:
            self._prop(t)["owner"] = b["id"]
        for t in tr["request_props"]:
            self._prop(t)["owner"] = a["id"]
        del self.s["trades"][tr["id"]]
        self._log("trade_accepted", player=b["id"], to=a["id"])

    def a_decline_trade(self, pid, payload):
        tr = self._get_trade(payload)
        if tr["to"] != pid:
            raise InvalidAction("trade_not_found")
        del self.s["trades"][tr["id"]]
        self._log("trade_declined", player=pid, to=tr["from"])

    def a_cancel_trade(self, pid, payload):
        tr = self._get_trade(payload)
        if tr["from"] != pid:
            raise InvalidAction("trade_not_found")
        del self.s["trades"][tr["id"]]

    # ------------------------------------------------------------------ bankruptcy
    def a_bankrupt(self, pid, _):
        self._require_playing()
        pl = self.p(pid)
        if pl["bankrupt"]:
            raise InvalidAction("already_bankrupt")
        self._bankrupt(pl)

    def _bankrupt(self, pl):
        creditor = None
        if pl["money"] < 0 and pl["debt_to"] and self.has(pl["debt_to"]):
            creditor = self.p(pl["debt_to"])
            if creditor["bankrupt"]:
                creditor = None
        if creditor:
            # creditor was credited in full; take back what the debtor couldn't cover
            creditor["money"] += min(0, pl["money"])
        for key, prop in list(self.s["properties"].items()):
            if prop["owner"] != pl["id"]:
                continue
            if creditor:
                refund = prop["houses"] * self.tiles[int(key)]["house_cost"] // 2
                creditor["money"] += refund
                prop.update(owner=creditor["id"], houses=0)
            else:
                del self.s["properties"][key]
        pl.update(money=0, bankrupt=True, in_jail=False, debt_to=None, jail_cards=[])
        self.s["trades"] = {k: t for k, t in self.s["trades"].items() if pl["id"] not in (t["from"], t["to"])}
        self._log("bankrupt", player=pl["id"], creditor=creditor["id"] if creditor else None)

        auc = self.s["auction"]
        if auc and pl["id"] in auc["active"]:
            auc["active"].remove(pl["id"])
            if auc["high_bidder"] == pl["id"]:
                auc["high_bidder"], auc["high_bid"] = None, 0

        if self._check_winner():
            return
        if self.s["auction"]:
            self._check_auction()
        if self.current_id == pl["id"]:
            self.s["auction"] = None
            self.s["pending_buy"] = None
            self._next_turn()

    def _check_winner(self):
        alive = self.alive()
        if self.s["status"] == "playing" and len(alive) == 1:
            self.s["status"] = "finished"
            self.s["winner"] = alive[0]["id"]
            self.s["auction"] = None
            self._log("winner", player=alive[0]["id"])
            return True
        return False

    # ------------------------------------------------------------------ dispatch
    ACTIONS = {
        "update_settings", "choose_color", "kick", "leave", "start",
        "roll", "pay_fine", "use_card", "end_turn", "buy", "decline", "bid", "fold",
        "build", "sell_house", "mortgage", "unmortgage",
        "propose_trade", "accept_trade", "decline_trade", "cancel_trade", "bankrupt",
    }

    def handle(self, pid, action, payload=None):
        if action not in self.ACTIONS:
            raise InvalidAction("unknown_action")
        if not self.has(pid):
            raise InvalidAction("spectator")
        try:
            getattr(self, f"a_{action}")(pid, payload)
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise InvalidAction("bad_request") from exc
        return self.events

    def add_chat(self, pid, text):
        text = (text or "").strip()[:300]
        if not text:
            return None
        name = self.p(pid)["name"] if self.has(pid) else "?"
        msg = {"id": uuid.uuid4().hex[:10], "player": pid, "name": name, "text": text, "ts": int(time.time())}
        self.s["chat"].append(msg)
        self.s["chat"] = self.s["chat"][-CHAT_LIMIT:]
        return msg
