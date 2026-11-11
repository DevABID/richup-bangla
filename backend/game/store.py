"""Where live games are kept.

Dev:  in-process dict (single server process only).
Prod: set REDIS_URL and games are stored in Redis with a 24h TTL, with a
      Redis lock per room so several server workers can't race each other.
"""
import asyncio
import copy
import json
import os
from collections import defaultdict

TTL_SECONDS = 60 * 60 * 24


class MemoryStore:
    def __init__(self):
        self._data = {}
        self._locks = defaultdict(asyncio.Lock)

    async def get(self, room):
        state = self._data.get(room)
        return copy.deepcopy(state) if state is not None else None

    async def save(self, room, state):
        self._data[room] = copy.deepcopy(state)

    async def exists(self, room):
        return room in self._data

    def lock(self, room):
        return self._locks[room]


class RedisStore:
    def __init__(self, url):
        import redis.asyncio as redis
        self.r = redis.from_url(url, decode_responses=True)

    async def get(self, room):
        raw = await self.r.get(f"game:{room}")
        return json.loads(raw) if raw else None

    async def save(self, room, state):
        await self.r.set(f"game:{room}", json.dumps(state), ex=TTL_SECONDS)

    async def exists(self, room):
        return bool(await self.r.exists(f"game:{room}"))

    def lock(self, room):
        return self.r.lock(f"lock:{room}", timeout=5, blocking_timeout=5)


_url = os.environ.get("REDIS_URL")
store = RedisStore(_url) if _url else MemoryStore()
