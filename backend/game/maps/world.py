"""World map: one country per colour group, from Nepal up to Switzerland.

Each city shows its country's flag (drawn by the frontend, see Flag.jsx),
plus a landmark icon.
"""
from .base import GameMap

# One country per colour group: own the full set, own the country.
FLAGS = {
    1: "np", 3: "np",                 # brown: Nepal
    6: "lk", 8: "lk", 9: "lk",        # light blue: Sri Lanka
    11: "th", 13: "th", 14: "th",     # pink: Thailand
    16: "my", 18: "my", 19: "my",     # orange: Malaysia
    21: "tr", 23: "tr", 24: "tr",     # red: Turkey
    26: "ae", 27: "ae", 29: "ae",     # yellow: UAE
    31: "jp", 32: "jp", 34: "jp",     # green: Japan
    37: "ch", 39: "ch",               # dark blue: Switzerland
    5: "bd", 15: "sg", 25: "gb", 35: "us",   # airports
}

MAP = GameMap(
    id="world",
    name_bn="বিশ্ব ভ্রমণ",
    name_en="World Tour",
    desc_bn="প্রতিটি রঙে একটি দেশ — পুরো সেট কিনলেই দেশটা আপনার! পোখারা থেকে জুরিখ",
    desc_en="Every colour is a country — own the full set, own the country! From Pokhara to Zurich",
    places={
        # ---- corners
        10: ("ইমিগ্রেশনে আটকা", "Stuck at Immigration", "🛂"),
        20: ("ট্রানজিট লাউঞ্জ", "Transit Lounge", "🛋️"),
        30: ("পাসপোর্ট হারিয়েছেন!", "Lost Passport!", "📕"),
        # ---- taxes
        4: ("ভিসা ফি", "Visa Fee", "🧾"),
        38: ("এয়ারপোর্ট ট্যাক্স", "Airport Tax", "💸"),
        # ---- brown: Nepal
        1: ("পোখারা", "Pokhara", "🛶"),
        3: ("কাঠমান্ডু", "Kathmandu", "🏔️"),
        # ---- light blue: Sri Lanka
        6: ("গল", "Galle", "🏰"),
        8: ("ক্যান্ডি", "Kandy", "🐘"),
        9: ("কলম্বো", "Colombo", "🌴"),
        # ---- pink: Thailand
        11: ("ফুকেট", "Phuket", "🏝️"),
        13: ("চিয়াং মাই", "Chiang Mai", "🏮"),
        14: ("ব্যাংকক", "Bangkok", "🛕"),
        # ---- orange: Malaysia
        16: ("পেনাং", "Penang", "🍜"),
        18: ("লংকাউই", "Langkawi", "🚡"),
        19: ("কুয়ালালামপুর", "Kuala Lumpur", "🏢"),
        # ---- red: Turkey
        21: ("আনতালিয়া", "Antalya", "🏖️"),
        23: ("ইজমির", "Izmir", "⛵"),
        24: ("ইস্তাম্বুল", "Istanbul", "🕌"),
        # ---- yellow: UAE
        26: ("শারজাহ", "Sharjah", "📚"),
        27: ("আবুধাবি", "Abu Dhabi", "🏛️"),
        29: ("দুবাই", "Dubai", "🏙️"),
        # ---- green: Japan
        31: ("ওসাকা", "Osaka", "🏯"),
        32: ("কিয়োটো", "Kyoto", "⛩️"),
        34: ("টোকিও", "Tokyo", "🗼"),
        # ---- dark blue: Switzerland
        37: ("জেনেভা", "Geneva", "⛲"),
        39: ("জুরিখ", "Zurich", "🏦"),
        # ---- transport: international airports
        5: ("শাহজালাল বিমানবন্দর", "Shahjalal Airport", "✈️"),
        15: ("চাঙ্গি বিমানবন্দর", "Changi Airport", "🛫"),
        25: ("হিথ্রো বিমানবন্দর", "Heathrow Airport", "🛬"),
        35: ("জেএফকে বিমানবন্দর", "JFK Airport", "🛩️"),
        # ---- utilities
        12: ("ইন্টারনেট", "Internet", "📶"),
        28: ("বিদ্যুৎ", "Electricity", "⚡"),
    },
    flags=FLAGS,
)
