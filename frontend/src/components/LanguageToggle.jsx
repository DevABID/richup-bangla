import { useTranslation } from "react-i18next";

export default function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const next = i18n.language === "bn" ? "en" : "bn";
  return (
    <button className="btn small ghost" onClick={() => i18n.changeLanguage(next)}>
      {t("app.language")}
    </button>
  );
}
