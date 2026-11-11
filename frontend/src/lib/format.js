const locale = (lang) => (lang === "bn" ? "bn-BD" : "en-IN");

// bn-BD gives Bangla digits with lakh grouping: ১,৫০,০০০
export const num = (n, lang) => new Intl.NumberFormat(locale(lang)).format(n);
export const money = (n, lang) => (n < 0 ? "−৳" : "৳") + num(Math.abs(n), lang);
export const tileName = (tile, lang) => (tile ? (lang === "bn" ? tile.name_bn : tile.name_en) : "");
