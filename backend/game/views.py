import asyncio
import json
import logging
import secrets

from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .map_requests import MapRequestError, RateLimiter, clean_map_request, discord_message, send_discord
from .store import store

log = logging.getLogger(__name__)
map_request_limiter = RateLimiter(limit=3, window=600)


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR", "")

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I to avoid confusion


@csrf_exempt
@require_POST
async def create_room(request):
    for _ in range(20):
        code = "".join(secrets.choice(ALPHABET) for _ in range(6))
        if not await store.exists(code):
            return JsonResponse({"code": code})
    return JsonResponse({"error": "try_again"}, status=503)


async def health(request):
    return JsonResponse({"ok": True})


def frontend(request):
    index = settings.FRONTEND_DIST / "index.html"
    if not index.exists():
        return HttpResponse(
            "Frontend not built. Run `npm run build` in frontend/, "
            "or use `npm run dev` on port 5173 while developing.",
            content_type="text/plain", status=404,
        )
    return FileResponse(open(index, "rb"), content_type="text/html")


@csrf_exempt
@require_POST
async def map_request(request):
    """Anyone can suggest a new map. Saved to the database (see /admin/) and,
    if DISCORD_WEBHOOK_URL is set, posted to your Discord channel."""
    from .models import MapRequest

    if not map_request_limiter.allow(_client_ip(request)):
        return JsonResponse({"error": "slow_down"}, status=429)
    try:
        data = json.loads(request.body or b"{}")
        clean = clean_map_request(data)
    except ValueError as exc:  # bad JSON or MapRequestError
        key = exc.key if isinstance(exc, MapRequestError) else "bad_request"
        field = exc.field if isinstance(exc, MapRequestError) else None
        return JsonResponse({"error": key, "field": field}, status=400)
    if clean is None:  # honeypot: pretend it worked so bots move on
        return JsonResponse({"ok": True})

    obj = await MapRequest.objects.acreate(**clean)

    if settings.DISCORD_WEBHOOK_URL:
        admin_url = request.build_absolute_uri(f"/admin/game/maprequest/{obj.id}/change/")
        content = discord_message(clean, obj.id, admin_url)
        try:
            await asyncio.to_thread(send_discord, settings.DISCORD_WEBHOOK_URL, content)
        except Exception:  # the request is saved either way
            log.exception("Could not post map request to Discord")

    return JsonResponse({"ok": True, "id": obj.id})
