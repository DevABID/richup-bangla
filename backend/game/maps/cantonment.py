"""MIST × BUP: the Mirpur Cantonment campus map.

Real campus names on the tiles, the jokes in taglines and cards.
Each place: (name_bn, name_en, icon, tagline_bn, tagline_en).
Want to swap a department or add an inside joke? Just edit the text here.
"""
from .base import GameMap

PLACES = {
    # ---- corners
    0: ("ভর্তি", "Admission", "🎓"),
    10: ("রিটেক", "Retake", "📝"),
    20: ("ক্যান্টিন আড্ডা", "Canteen Adda", "☕"),
    30: ("ড্রেস কোড ভঙ্গ!", "Dress Code Violation!", "👔"),

    # ---- taxes
    4: ("সেমিস্টার ফি", "Semester Fee", "💸"),
    38: ("লেট ফাইন", "Late Fine", "⏰"),

    # ---- brown: the street economy
    1: ("চায়ের দোকান", "Tea Stall", "🍵",
        "বাকির খাতা এখান থেকেই শুরু", "Where every credit ledger begins"),
    3: ("বাদাম তলা", "Badam Tola", "🥜",
        "আড্ডা ফ্রি, বাদাম না", "The adda is free. The peanuts are not"),

    # ---- light blue: adda spots
    6: ("লেক সাইড", "Lake Side", "🌊",
        "প্রেম আর অ্যাসাইনমেন্ট — দুটোই পেন্ডিং", "Love and assignments: both still pending"),
    8: ("সল্ট ব্রিজ", "Salt Bridge", "🌉",
        "নাম লবণের, আলাপ মিষ্টি", "Salty name, sweet conversations"),
    9: ("মুক্ত মঞ্চ", "Mukto Moncho", "🎤",
        "গান, বিতর্ক আর ফ্রি উপদেশ", "Songs, debates and free unsolicited advice"),

    # ---- pink: MIST food
    11: ("ওল্ড ক্যাফে", "Old Cafe", "🥪",
         "পুরনো ক্যাফে, পুরনো বাকি", "Old cafe, older dues"),
    13: ("পিটস্টপ", "Pitstop", "🏎️",
         "দশ মিনিটের ব্রেক, যেটা এক ঘণ্টা হয়ে যায়", "A ten-minute break that somehow lasts an hour"),
    14: ("MIST ক্যাফেটেরিয়া", "MIST Cafeteria", "🍛",
         "লাঞ্চ টাইমে সিট পাওয়াই আসল অর্জন", "Finding a seat at lunch is the real achievement"),

    # ---- orange: hangouts
    16: ("Amitié ক্যাফে", "Amitié Cafe", "🥐",
         "নাম ফরাসি, বিল দেশি", "French name, very local bill"),
    18: ("ভিস্তা ক্যাফেটেরিয়া", "Vista Cafeteria", "🍽️",
         "ভিউ সুন্দর, লাইন আরও লম্বা", "Great view. Even greater queue"),
    19: ("MIST প্লাজা", "MIST Plaza", "🏛️",
         "এখানে সবাই কারো না কারো অপেক্ষায়", "Everyone here is waiting for someone"),

    # ---- red: BUP faculties
    21: ("FASS", "FASS", "📚",
         "আলোচনা শেষ হয় না, ক্লাস শেষ হয়ে যায়", "The discussion never ends. The class does"),
    23: ("FSSS", "FSSS", "🛡️",
         "নিরাপত্তা নিয়ে পড়ে, ক্যান্টিনের সিট নিরাপদ না", "Studies security. Still can't secure a canteen seat"),
    24: ("FBS", "FBS", "💼",
         "প্রেজেন্টেশনে স্যুট, পকেটে ফাঁকা", "Full suit for the presentation, empty wallet underneath"),

    # ---- yellow: MIST departments
    26: ("CE", "CE", "🏗️",
         "ব্রিজের লোড হিসাব পারে, নিজের লোড না", "Can calculate a bridge's load, not their own"),
    27: ("EECE", "EECE", "🔌",
         "সার্কিট মেলে, ঘুম মেলে না", "The circuit closes. The eyes don't"),
    29: ("CSE", "CSE", "💻",
         "একটা বাগ ঠিক করলে তিনটা নতুন বাগ", "Fix one bug, get three free"),

    # ---- green: landmarks
    31: ("ওসমানী হল", "Osmani Hall", "🛏️",
         "রুমমেটের অ্যালার্মে আপনার ঘুম ভাঙে", "Your roommate's alarm, your wake-up call"),
    32: ("লাইব্রেরি", "Library", "📖",
         "পরীক্ষার আগের সপ্তাহে হাউসফুল", "Fully booked the week before exams"),
    34: ("অডিটোরিয়াম", "Auditorium", "🎭",
         "এসি ঠান্ডা, সেমিনার লম্বা", "Cold AC, long seminars"),

    # ---- dark blue: the two central fields
    37: ("MIST সেন্ট্রাল ফিল্ড", "MIST Central Field", "⚽",
         "ইন্টার-ডিপার্টমেন্ট ফাইনাল মানেই যুদ্ধ", "Inter-department final = full-scale war"),
    39: ("BUP সেন্ট্রাল ফিল্ড", "BUP Central Field", "🏟️",
         "বিকেলে আড্ডা আর ফুটবল একসাথে চলে", "Afternoon adda and football, at the same time"),

    # ---- transport
    5: ("MIST লোকাল বাস", "MIST Local Bus", "🚌",
        "প্রতিটা স্টপে থামে — ধৈর্যের পরীক্ষা", "Stops at every stop. A test of patience"),
    15: ("BUP বাস", "BUP Bus", "🚍",
         "মিস করলে ক্লাসও মিস", "Miss the bus, miss the class"),
    25: ("MIST বাস (আর্মি থিম)", "MIST Bus (Army theme)", "🪖",
         "ডিসিপ্লিনে চলে, এক মিনিটও দেরি না", "Runs on discipline. Not one minute late"),
    35: ("স্বপ্নফেরি", "Shopnoferi", "🚎",
         "দ্য বাংলা বেঞ্জ", "The Bangla Benz"),

    # ---- utilities
    12: ("ক্যাম্পাস Wi-Fi", "Campus Wi-Fi", "📶",
         "পাসওয়ার্ড সবাই জানে, স্পিড কেউ জানে না", "Everyone knows the password. Nobody has seen the speed"),
    28: ("ফটোকপির দোকান", "Photocopy Shop", "🖨️",
         "পরীক্ষার আগে সবার নোট এখানেই", "Everyone's notes end up here before exams"),
}

DECK_NAMES = {
    "chance": ("নোটিশ বোর্ড", "Notice Board", "📌"),
    "community": ("ব্যাচ গ্রুপ", "Batch Group", "💬"),
}


def _c(bn, en, **action):
    return {"bn": bn, "en": en, "action": action}


NOTICE_BOARD = [
    _c("নতুন সেমিস্টার শুরু! ভর্তিতে যান, উপবৃত্তি নিন",
       "New semester! Go to Admission, collect your stipend", type="move_to", tile=0),
    _c("{name}-এ ফ্রেন্ডলি ম্যাচ! এখনই চলে যান",
       "Friendly match at {name}! Go there now", type="move_to", tile=39),
    _c("{name}-এ সারপ্রাইজ CT! দৌড়ান",
       "Surprise CT at {name}! Run", type="move_to", tile=24),
    _c("{name}-এ এক্সট্রা ক্লাস নোটিশ। চলে যান",
       "Extra class notice at {name}. Off you go", type="move_to", tile=11),
    _c("বাস মিস করবেন না! নিকটতম বাসে উঠুন। মালিক থাকলে দ্বিগুণ ভাড়া",
       "Don't miss the bus! Take the nearest one. If owned, pay double", type="nearest", kind="railroad"),
    _c("ল্যাব রিপোর্ট প্রিন্ট করতে হবে! নিকটতম Wi-Fi বা ফটোকপিতে যান। মালিক থাকলে চালের ১০ গুণ",
       "Lab report to print! Go to the nearest Wi-Fi or photocopy shop. If owned, pay 10× the dice",
       type="nearest", kind="utility"),
    _c("ডিনস লিস্টে নাম উঠেছে! ৳২০০", "You made the Dean's List! ৳200", type="money", amount=200),
    _c("মেডিকেল সার্টিফিকেট: রিটেক থেকে একবার মুক্তি — রেখে দিন",
       "Medical certificate: skip one Retake — keep this card", type="jail_free"),
    _c("আইডি কার্ড হলে ফেলে এসেছেন! ৩ ঘর পিছিয়ে যান",
       "You left your ID card in the hall! Go back 3 spaces", type="move_by", steps=-3),
    _c("সিনিয়রকে ইন্ট্রো দেননি! সোজা রিটেকে যান",
       "You didn't give the senior your intro! Straight to Retake", type="go_to_jail"),
    _c("হলের রুম ইন্সপেকশন: প্রতি বাড়ি ৳২৫, প্রতি হোটেল ৳১০০",
       "Hall room inspection: ৳25 per house, ৳100 per hotel", type="repairs", house=25, hotel=100),
    _c("সিনিয়রকে সালাম দেননি! শাস্তি হিসেবে সিনিয়রদের চা খাওয়ান: ৳৫০",
       "You didn't greet the senior with salam! Buy the seniors tea as penance: ৳50", type="money", amount=-50),
    _c("{name}-এ চড়ে বসুন, বাংলা বেঞ্জের সফর শুরু",
       "Hop on {name} — the Bangla Benz awaits", type="move_to", tile=35),
    _c("আপনি CR! শেষ ক্লাসে ফ্যাকাল্টির জন্য কেক কাটা — প্রত্যেকের কাছ থেকে ৳২০ চাঁদা তুলুন",
       "You're the CR! Cake for the faculty's last class — collect ৳20 from each player",
       type="collect_each", amount=20),
    _c("প্রজেক্ট শোকেসে পুরস্কার জিতলেন! ৳১৫০", "You won the project showcase! ৳150", type="money", amount=150),
    _c("প্রক্সি দিতে গিয়ে ধরা খেলেন! সোজা রিটেকে যান",
       "Caught giving proxy attendance! Straight to Retake", type="go_to_jail"),
]

BATCH_GROUP = [
    _c("উপবৃত্তি এসেছে! ভর্তিতে যান, টাকা নিন", "Stipend arrived! Go to Admission and collect it",
       type="move_to", tile=0),
    _c("টিউশনির বেতন একসাথে পেলেন! ৳২০০", "All your tuition money came at once! ৳200", type="money", amount=200),
    _c("জুনিয়রদের চা খাওয়ালেন — ভালো সিনিয়র হওয়ার খরচ ৳৫০",
       "You bought the juniors tea — the price of being a good senior: ৳50", type="money", amount=-50),
    _c("পুরনো বই বিক্রি করলেন! ৳৫০", "Sold your old textbooks! ৳50", type="money", amount=50),
    _c("বন্ধুর ক্লাস নোট: রিটেক থেকে একবার মুক্তি — রেখে দিন",
       "A friend's class notes: skip one Retake — keep this card", type="jail_free"),
    _c("শার্ট ইন করা ছিল না! সোজা রিটেকে যান", "Shirt not tucked in! Straight to Retake", type="go_to_jail"),
    _c("ঈদ সালামি পেলেন! ৳১০০", "Eid salami! ৳100", type="money", amount=100),
    _c("ফটোকপির দোকান ভুল করে কম বিল নিল! ৳২০", "The photocopy shop undercharged you! ৳20",
       type="money", amount=20),
    _c("জন্মদিনের ট্রিট! প্রত্যেককে ৳২০ দিন", "Birthday treat! Pay each player ৳20", type="pay_each", amount=20),
    _c("ক্লাব ফেস্টের ভলান্টিয়ার সম্মানী ৳১০০", "Club fest volunteer honorarium: ৳100", type="money", amount=100),
    _c("ল্যাপটপের চার্জার হারিয়েছেন! ৳১০০", "Lost your laptop charger! ৳100", type="money", amount=-100),
    _c("লাইব্রেরির বই ফেরত দিতে দেরি! জরিমানা ৳৫০", "Library book overdue! Fine ৳50", type="money", amount=-50),
    _c("আপনার নোট পুরো ব্যাচ ফটোকপি করেছে — প্রত্যেকে ৳১০ দিন",
       "The whole batch photocopied your notes — collect ৳10 from each player", type="collect_each", amount=10),
    _c("হলের ফ্যান মেরামত: প্রতি বাড়ি ৳৪০, প্রতি হোটেল ৳১১৫",
       "Hall fan repairs: ৳40 per house, ৳115 per hotel", type="repairs", house=40, hotel=115),
    _c("টার্ম ফাইনালের আগের রাতে চা-কফি খরচ ৳৫০", "Tea and coffee the night before the term final: ৳50",
       type="money", amount=-50),
    _c("CT-তে ফুল মার্ক! আম্মুর কাছ থেকে পুরস্কার ৳২৫", "Full marks in a CT! A reward from Ammu: ৳25",
       type="money", amount=25),
]

MAP = GameMap(
    id="cantonment",
    name_bn="MIST × BUP ক্যাম্পাস",
    name_en="MIST × BUP Campus",
    desc_bn="চায়ের দোকান থেকে সেন্ট্রাল ফিল্ড — সিনিয়রকে সালাম দিতে ভুলবেন না!",
    desc_en="From the tea stall to the central field — don't forget to greet your seniors!",
    places=PLACES,
    deck_names=DECK_NAMES,
    decks={"chance": NOTICE_BOARD, "community": BATCH_GROUP},
)
