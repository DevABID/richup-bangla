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
        headers={"Content-Type": "application/json", "User-Agent": "Jomidari (map requests)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status


# ---------------------------------------------------------------- email (Resend)
# Render's free plan blocks normal email (SMTP) ports, so mail goes through
# Resend's HTTPS API instead. Free plan: send from onboarding@resend.dev to the
# email address you signed up to Resend with.

def _looks_like_email(value):
    return bool(value) and "@" in value and " " not in value and "." in value.split("@")[-1]


def email_subject(req):
    name = " ".join(req["map_name"].split())  # no line breaks in a subject
    return f"🗺️ জমিদারি: নতুন ম্যাপের অনুরোধ — {name}"[:150]


def email_text(req, request_id=None):
    parts = [
        f"নতুন ম্যাপের অনুরোধ / New map request{f' #{request_id}' if request_id else ''}",
        "",
        f"ম্যাপের নাম / Map name: {req['map_name']}",
    ]
    if req.get("theme"):
        parts += ["", "ম্যাপটা কী নিয়ে / About:", req["theme"]]
    parts += ["", "জায়গাগুলো / Places:", req["places"], ""]
    parts.append(f"নাম / Name: {req.get('requester_name') or '—'}")
    parts.append(f"যোগাযোগ / Contact: {req.get('contact') or '—'}")
    if _looks_like_email(req.get("contact")):
        parts.append("(Reply to this email to answer them directly.)")
    return "\n".join(parts)


def send_resend(api_key, to, subject, text, reply_to=None, timeout=8):
    payload = {
        "from": "Jomidari <onboarding@resend.dev>",
        "to": [to],
        "subject": subject,
        "text": text,
    }
    if _looks_like_email(reply_to):
        payload["reply_to"] = reply_to
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Jomidari (map requests)",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status
