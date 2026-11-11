import unittest

from game.map_requests import MapRequestError, RateLimiter, clean_map_request, discord_message

GOOD = {
    "map_name": "চট্টগ্রাম শহর",
    "theme": "চট্টগ্রামের এলাকা আর মেজবানি",
    "places": "পতেঙ্গা, জিইসি মোড়, আগ্রাবাদ, নিউমার্কেট",
    "requester_name": "Rafi",
    "contact": "rafi@example.com",
    "language": "bn",
}


class MapRequestTests(unittest.TestCase):
    def test_valid_request(self):
        clean = clean_map_request(GOOD)
        self.assertEqual(clean["map_name"], "চট্টগ্রাম শহর")
        self.assertEqual(clean["language"], "bn")

    def test_name_and_places_required(self):
        for field in ("map_name", "places"):
            with self.subTest(field=field):
                with self.assertRaises(MapRequestError) as ctx:
                    clean_map_request({**GOOD, field: "  "})
                self.assertEqual((ctx.exception.key, ctx.exception.field), ("required", field))

    def test_optional_fields_can_be_empty(self):
        clean = clean_map_request({"map_name": "Sylhet", "places": "Jaflong, Ratargul, Bisnakandi"})
        self.assertEqual(clean["contact"], "")
        self.assertEqual(clean["language"], "")

    def test_length_limits(self):
        with self.assertRaises(MapRequestError) as ctx:
            clean_map_request({**GOOD, "places": "x" * 5000})
        self.assertEqual(ctx.exception.key, "too_long")
        with self.assertRaises(MapRequestError):
            clean_map_request({**GOOD, "places": "short"})

    def test_wrong_types_rejected(self):
        with self.assertRaises(MapRequestError):
            clean_map_request({**GOOD, "places": ["a", "b"]})
        with self.assertRaises(MapRequestError):
            clean_map_request("not a dict")

    def test_honeypot_returns_none(self):
        self.assertIsNone(clean_map_request({**GOOD, "website": "http://spam.example"}))

    def test_rate_limit(self):
        rl = RateLimiter(limit=3, window=600)
        self.assertTrue(all(rl.allow("1.2.3.4", now=t) for t in (0, 1, 2)))
        self.assertFalse(rl.allow("1.2.3.4", now=3))
        self.assertTrue(rl.allow("5.6.7.8", now=3))      # other people unaffected
        self.assertTrue(rl.allow("1.2.3.4", now=700))    # allowed again later

    def test_discord_message_fits_and_has_details(self):
        msg = discord_message(clean_map_request(GOOD), 7, "https://x.onrender.com/admin/")
        self.assertIn("চট্টগ্রাম শহর", msg)
        self.assertIn("#7", msg)
        self.assertIn("Rafi", msg)
        long = clean_map_request({**GOOD, "places": "জায়গা " * 550, "theme": "t" * 1000})
        self.assertLessEqual(len(discord_message(long, 1, "https://x/admin/")), 2000)


if __name__ == "__main__":
    unittest.main()
