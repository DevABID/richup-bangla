"""Map requests: validation, spam protection and the Discord notification.

Plain Python (no Django) so it can be unit-tested on its own.
"""
import json
import time
import urllib.request
from collections import defaultdict

LIMITS = {
    "map_name": (2, 80),
    "theme": (0, 1000),
    "places": (10, 4000),
    "requester_name": (0, 60),
    "contact": (0, 120),
}
REQUIRED = {"map_name", "places"}


class MapRequestError(ValueError):
    def __init__(self, key, field=None):
        super().__init__(key)
        self.key = key
        self.field = field


def clean_map_request(data):
    """Returns a dict of clean fields, or None for a bot (honeypot filled in).

    Raises MapRequestError with an i18n key when something is wrong.
    """
    if not isinstance(data, dict):
        raise MapRequestError("bad_request")
    # Real people never see the "website" field; bots fill it in.
    if str(data.get("website") or "").strip():
        return None
    clean = {}
    for field, (lo, hi) in LIMITS.items():
        value = data.get(field) or ""
        if not isinstance(value, str):
            raise MapRequestError("bad_request", field)
        value = value.strip()
        if field in REQUIRED and not value:
            raise MapRequestError("required", field)
        if value and len(value) < lo:
            raise MapRequestError("too_short", field)
        if len(value) > hi:
            raise MapRequestError("too_long", field)
        clean[field] = value
    lang = data.get("language")
    clean["language"] = lang if lang in ("bn", "en") else ""
    return clean


class RateLimiter:
    """At most `limit` requests per `window` seconds from one address."""

    def __init__(self, limit=3, window=600):
        self.limit, self.window = limit, window
        self.hits = defaultdict(list)

    def allow(self, key, now=None):
        now = time.monotonic() if now is None else now
        recent = [t for t in self.hits[key] if now - t < self.window]
        if len(recent) >= self.limit:
            self.hits[key] = recent
            return False
        recent.append(now)
        self.hits[key] = recent
        return True


def discord_message(req, request_id=None, admin_url=None):
    """Formats a request for Discord (max 2000 characters per message)."""
    lines = [f"🗺️ **নতুন ম্যাপের অনুরোধ / New map request**{f' #{request_id}' if request_id else ''}",
             f"**{req['map_name']}**"]
    if req.get("theme"):
        lines.append(f"> {req['theme'][:400]}")
    lines.append("**Places:**\n" + req["places"][:1200])
    who = " · ".join(x for x in (req.get("requester_name"), req.get("contact")) if x)
    if who:
        lines.append(f"From: {who}")
    if admin_url:
        lines.append(admin_url)
    text = "\n".join(lines)
    return text if len(text) <= 2000 else text[:1990] + "…"


def send_discord(webhook_url, content, timeout=5):
    """Posts a message to a Discord channel webhook. Mentions are disabled so a
    request containing @everyone can't ping your whole server."""
    body = json.dumps({"content": content, "allowed_mentions": {"parse": []}}).encode()
    req = urllib.request.Request(
        webhook_url, data=body, method="POST",
        headers={"Content-Type": "application/json", "User-Agent": "Tanksal (map requests)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status
