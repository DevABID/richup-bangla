// Light/dark theme. The player's choice is saved; until they choose,
// the device's own setting is used.
const KEY = "theme";

export function savedTheme() {
  const t = localStorage.getItem(KEY);
  return t === "light" || t === "dark" ? t : null;
}

export function currentTheme() {
  return savedTheme() ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
}
