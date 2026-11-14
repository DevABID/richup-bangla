"""One WebSocket per player per room.

Client -> server messages:
  {"type": "action", "action": "roll", "payload": {...}}
  {"type": "chat", "text": "..."}
  {"type": "voice", "on": true|false}          join/leave the voice call
  {"type": "rtc", "to": "<pid>", "data": {...}} WebRTC offer/answer/ICE relay

Server -> client messages:
  welcome, state, chat, rtc, error
"""
import asyncio
import logging
import re
import time
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.layers import get_channel_layer

from .engine import COLORS, Game, InvalidAction, new_game, public_state
from .maps import maps_for_client
from .store import store

log = logging.getLogger(__name__)
_auction_timers = {}  # room -> asyncio.Task that ends the room's auction on time


async def broadcast(room, state, events):
    await get_channel_layer().group_send(
        f"room_{room}",
        # server_time lets every browser line up its countdown with the server's clock
        {"type": "state.update", "state": public_state(state), "events": events, "server_time": time.time()},
    )


def watch_auction(room, state):
    """Make sure a timer is waiting to end this room's auction, if it has one."""
    task = _auction_timers.get(room)
    if state.get("auction") and not (task and not task.done()):
        _auction_timers[room] = asyncio.ensure_future(_run_auction_timer(room))


async def _run_auction_timer(room):
    try:
        while True:
            state = await store.get(room)
            auc = state and state.get("auction")
            if not auc:
                return
            await asyncio.sleep(max(0.05, auc["ends_at"] - time.time()))
            async with store.lock(room):
                state = await store.get(room)
                if not state or not state.get("auction"):
                    return
                game = Game(state)
                events = game.tick()
                if not events:
                    continue  # a bid added time; wait again
                await store.save(room, state)
            await broadcast(room, state, events)
    except Exception:
        log.exception("auction timer failed for room %s", room)
    finally:
        _auction_timers.pop(room, None)


ROOM_RE = re.compile(r"^[A-Z0-9]{4,10}$")
PID_RE = re.compile(r"^[A-Za-z0-9-]{8,40}$")


class GameConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.room = self.scope["url_route"]["kwargs"]["room"].upper()
        qs = parse_qs(self.scope["query_string"].decode())
        self.pid = qs.get("pid", [""])[0]
        name = qs.get("name", [""])[0].strip()[:20] or "Player"
        if not ROOM_RE.match(self.room) or not PID_RE.match(self.pid):
            await self.close()
            return

        self.group = f"room_{self.room}"
        self.personal = f"p_{self.room}_{self.pid}"
        self.chat_times = []
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.channel_layer.group_add(self.personal, self.channel_name)
        await self.accept()

        async with store.lock(self.room):
            state = await store.get(self.room) or new_game(self.room)
            game = Game(state)
            self.spectator = False
            try:
                game.add_player(self.pid, name)
            except InvalidAction:
                self.spectator = True
            await store.save(self.room, state)

        await self.send_json({
            "type": "welcome",
            "you": self.pid,
            "spectator": self.spectator,
            # Every map is sent once; the client picks the one in state.settings.map
            "maps": maps_for_client(),
            "colors": COLORS,
        })
        await self._broadcast(state, game.events)

    async def disconnect(self, code):
        if not hasattr(self, "group"):
            return
        async with store.lock(self.room):
            state = await store.get(self.room)
            if state:
                Game(state).set_online(self.pid, False)
                await store.save(self.room, state)
        if state:
            await self._broadcast(state, [])
        await self.channel_layer.group_discard(self.group, self.channel_name)
        await self.channel_layer.group_discard(self.personal, self.channel_name)

    async def receive_json(self, msg, **kwargs):
        kind = msg.get("type")
        if kind == "action":
            await self._action(str(msg.get("action")), msg.get("payload") or {})
        elif kind == "chat":
            await self._chat(str(msg.get("text", "")))
        elif kind == "voice":
            await self._voice(bool(msg.get("on")))
        elif kind == "rtc":
            await self._relay(msg)

    # -------------------------------------------------------------- handlers
    async def _action(self, action, payload):
        async with store.lock(self.room):
            state = await store.get(self.room)
            if not state:
                return
            game = Game(state)
            try:
                events = game.handle(self.pid, action, payload)
            except InvalidAction as exc:
                await self.send_json({"type": "error", "key": exc.key, "params": exc.params})
                return
            await store.save(self.room, state)
        await self._broadcast(state, events)

    async def _chat(self, text):
        now = time.monotonic()
        self.chat_times = [t for t in self.chat_times if now - t < 5]
        if len(self.chat_times) >= 5:
            await self.send_json({"type": "error", "key": "slow_down", "params": {}})
            return
        self.chat_times.append(now)
        async with store.lock(self.room):
            state = await store.get(self.room)
            if not state:
                return
            msg = Game(state).add_chat(self.pid, text)
            if not msg:
                return
            await store.save(self.room, state)
        await self.channel_layer.group_send(self.group, {"type": "chat.message", "msg": msg})

    async def _voice(self, on):
        async with store.lock(self.room):
            state = await store.get(self.room)
            if not state:
                return
            game = Game(state)
            if not game.has(self.pid):
                return
            game.p(self.pid)["voice"] = on
            await store.save(self.room, state)
        await self._broadcast(state, [])

    async def _relay(self, msg):
        to = str(msg.get("to", ""))
        if not PID_RE.match(to) or to == self.pid:
            return
        await self.channel_layer.group_send(
            f"p_{self.room}_{to}",
            {"type": "rtc.signal", "from": self.pid, "data": msg.get("data")},
        )

    async def _broadcast(self, state, events):
        await broadcast(self.room, state, events)
        watch_auction(self.room, state)

    # -------------------------------------------------------------- group events
    async def state_update(self, event):
        await self.send_json({"type": "state", "state": event["state"], "events": event["events"],
                              "server_time": event.get("server_time")})

    async def chat_message(self, event):
        await self.send_json({"type": "chat", "msg": event["msg"]})

    async def rtc_signal(self, event):
        await self.send_json({"type": "rtc", "from": event["from"], "data": event["data"]})
