# জমিদারি (Jomidari)

A real-time multiplayer property-trading game set across Bangladesh, in Bangla and English, with text chat and a built-in voice call.

## Run it locally

You need Python 3.11+ and Node 18+.

Backend (terminal 1):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate          # silences the "unapplied migrations" warning
python manage.py runserver       # daphne serves HTTP + WebSockets on :8000
```

Frontend (terminal 2):

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

Open http://localhost:5173, create a room, then open the invite link in a second browser (or a private window) to play against yourself.

To test from your phone on the same Wi-Fi, open `http://<your-PC-IP>:5173`. Everything except voice will work; voice needs HTTPS outside localhost (see below).

Run the engine tests:

```bash
cd backend
python -m unittest discover -s game/tests -t .
```

## How it fits together

```
React (Vite)  ──WebSocket /ws/game/<ROOM>/──►  Django Channels consumer
                                                   │
                                                   ▼
                                           game/engine.py  (pure Python rules)
                                                   │
                                                   ▼
                                     store: memory (dev) or Redis (prod)
```

The server is authoritative. Clients only send intents; the engine rolls dice, validates every move and broadcasts the new state to the room. This keeps everyone in sync and makes cheating impossible from the browser.

| Path | What it does |
| --- | --- |
| `backend/game/maps/` | The maps: shared layout in `base.py`, one file per map |
| `backend/game/cards.py` | ভাগ্য and জনকল্যাণ cards (place names filled in per map) |
| `backend/game/engine.py` | All rules: turns, doubles, jail, buying, auctions, rent, houses, mortgages, trades, bankruptcy |
| `backend/game/consumers.py` | WebSocket handler: actions, chat, voice signaling relay |
| `backend/game/store.py` | Where live games live (in-memory or Redis) |
| `frontend/src/lib/store.js` | Zustand store + socket message handling |
| `frontend/src/lib/useVoice.js` | WebRTC voice call |
| `frontend/src/locales/` | Bangla and English text |
| `frontend/src/components/` | Lobby, board, action panel, trades, chat, voice |

### WebSocket messages

Client to server: `{"type":"action","action":"roll","payload":{}}`, `{"type":"chat","text":"..."}`, `{"type":"voice","on":true}`, `{"type":"rtc","to":"<pid>","data":{...}}`.

Server to client: `welcome` (board, cards, your id), `state` (full public state + new events), `chat`, `rtc`, `error` (an i18n key such as `not_enough_money`).

Actions: `update_settings`, `choose_color`, `kick`, `leave`, `start`, `roll`, `pay_fine`, `use_card`, `buy`, `decline`, `bid`, `fold`, `end_turn`, `build`, `sell_house`, `mortgage`, `unmortgage`, `propose_trade`, `accept_trade`, `decline_trade`, `cancel_trade`, `bankrupt`.

### Auctions

When a player doesn't buy a property, it goes to a timed auction. A 10-second countdown starts and every player, including the one who passed, can bid at any time with the quick-bid buttons (+2, +10, +50, +100). Each new bid gives everyone at least 6 more seconds. When the clock reaches zero, the highest bidder pays and gets the property; with no bids, it stays unsold. The server runs the clock, so every player sees the same countdown and a late bid can't sneak in.

### Sounds

Dice, buying, rent, cards, jail, bids, the auction hammer, your-turn alerts and chat all have short sounds, made in the browser with the Web Audio API (no audio files). Each player can mute them with the 🔊 button.

### Room rules (host can change in the lobby)

Map, max players, starting cash, money for passing Start, auctions, a "Tea break" pot for taxes and fines, no rent while in the traffic jam, even building, double rent on full sets, mortgages and random turn order.

## Maps

Five maps are included, and the host picks one in the lobby:

- **সারা বাংলাদেশ**: districts and divisional cities up to Gulshan
- **ঢাকা শহর**: Dhaka neighbourhoods
- **ভ্রমণ বাংলাদেশ**: tourist spots
- **বিশ্ব ভ্রমণ**: one country per colour group, with country flags, from Nepal up to Switzerland
- **MIST × BUP ক্যাম্পাস**: the Mirpur Cantonment campus, with its own corners (ভর্তি, রিটেক, ক্যান্টিন আড্ডা, ড্রেস কোড ভঙ্গ!), its own card decks (নোটিশ বোর্ড and ব্যাচ গ্রুপ) and a funny one-liner on every place

Every map shares the same 40-slot layout from `maps/base.py`: the same prices, rents, colour groups and tile types. A map supplies names, icons and optionally taglines, corner names and its own cards, so all maps are equally balanced. Tile 39 is always the priciest property, which is why cards can point at tile numbers on any map.

To add a map:

1. Copy `backend/game/maps/dhaka.py` (simple) or `cantonment.py` (with taglines, corners and custom cards) to a new file.
2. Change the `id`, names and description, and give every ownable slot a name. Slots go from cheapest (1, 3) to priciest (37, 39); 5, 15, 25 and 35 are transport, and 12 and 28 are utilities. Each entry is `(name_bn, name_en, icon, tagline_bn, tagline_en)`; the last three are optional.
3. Optionally rename corners (slots 0, 10, 20, 30) and taxes (4, 38), rename the card tiles with `deck_names`, and give the map its own `decks`.
4. Import it in `backend/game/maps/__init__.py` and add it to `MAPS`.
5. Run the tests. `test_maps.py` checks the map is complete and plays random games on it.

The lobby shows the new map automatically, and interface text such as "stuck in Retake" uses the map's own corner names.

## Map requests

Anyone can suggest a new map at `/request-map` (linked from the home page and the lobby): a map name, what it's about, the place names, and optionally their name and contact. A hidden bot trap and a limit of 3 requests per 10 minutes per person keep out spam.

Each request is **emailed to you**. Render's free plan blocks normal email (SMTP), so the game sends mail through Resend's web API instead:

1. Sign up at resend.com **with the email address that should receive the requests**. On the free plan, Resend only delivers to that address (3,000 emails a month, 100 a day).
2. In Resend, open **API Keys** and create a key (it starts with `re_`).
3. In Render, open the service's **Environment** tab and add `RESEND_API_KEY` (the key) and `MAP_REQUEST_EMAIL` (your address). Keep them out of the code, since the repository is public.

When a requester gives an email address as their contact, you can reply to the email to answer them directly.

Requests are also saved in the database, and you can optionally post them to a Discord channel by setting `DISCORD_WEBHOOK_URL`.

## Voice calls

Voice uses WebRTC in a mesh: each player connects directly to every other player in the call, and the Django socket only relays the connection setup messages. Audio never passes through your server, so it costs you no bandwidth. A mesh works well for audio with up to about 8 people.

Browsers never let a website turn on the microphone by itself, so each player taps Allow once. The game makes that easy: before the browser asks, it explains what's coming; if the microphone was blocked, it shows step-by-step instructions for that player's browser (Chrome, Edge, Firefox, Safari, Samsung Internet, Android, iPhone) with a "Try again" button; and if the link was opened inside Facebook, Messenger or Instagram, whose built-in browsers often block the microphone, it asks the player to open it in Chrome or Safari and copies the link for them. Once in the call, a level bar shows that the microphone is working.

Two things matter in production:

1. **HTTPS is required.** Browsers only allow microphone access on `https://` pages (or `localhost`).
2. **Add a TURN server.** Free STUN servers are configured, which is enough when both players are on normal Wi-Fi. Many Bangladeshi mobile networks use carrier-grade NAT, where direct connections fail and audio needs to be relayed through a TURN server. Run [coturn](https://github.com/coturn/coturn) on a small VPS (or use a hosted TURN service) and set `VITE_TURN_URL`, `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL` in `frontend/.env` (see `.env.example`).

For calls with many more people, swap the mesh for an SFU such as LiveKit; the UI can stay the same.

## Hosting (easiest: Render, free)

The whole game runs as one service: Django serves the game server and the built React site from the same address.

1. Put the project on GitHub (the `dhoni-hou` folder is the repository root).
2. Sign up at render.com, then choose **New > Blueprint** and pick your repository. Render reads `render.yaml` and the `Dockerfile` and builds everything.
3. When the build finishes, you get a link like `https://dhoni-hou.onrender.com`. Share it with friends.

HTTPS is automatic, so voice calls work too (add a TURN server for mobile data, see Voice calls). Every time you push to GitHub, Render redeploys.

Free-tier limits to know about: the service sleeps after 15 minutes without visitors and takes about a minute to wake up, and a restart or redeploy ends any games in progress (live games are kept in memory). For a game night with friends this is fine. To keep games across restarts, add Render's Key Value (Redis) service and set `REDIS_URL`.

To check the production setup on your own computer: run `npm run build` in `frontend/`, then `python manage.py runserver` in `backend/`, and open http://localhost:8000.

### Other hosts

Anything that runs a Docker image and supports WebSockets works (Railway, Fly.io, a VPS). Set `DJANGO_DEBUG=0`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS=yourdomain.com` and `WS_ALLOWED_ORIGINS=https://yourdomain.com`.

## Good next steps

- A turn timer and auction countdown (store a deadline in state; a small background task or the next incoming message can enforce it)
- Bots to fill empty seats
- Accounts and match history (the Django ORM is already set up)
- Sound effects for dice, buying and rent
- Public room browser
