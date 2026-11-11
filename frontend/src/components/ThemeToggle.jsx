import { useState } from "react";
import { useTranslation } from "react-i18next";
import { currentTheme, setTheme } from "../lib/theme";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setState] = useState(currentTheme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button className="btn small ghost" aria-label={t("theme.switch")}
      onClick={() => { setTheme(next); setState(next); }}>
      {next === "dark" ? "🌙 " + t("theme.dark") : "☀️ " + t("theme.light")}
    </button>
  );
}
