import secrets

from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .store import store

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
