import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import bn from "../locales/bn.json";
import en from "../locales/en.json";

const saved = localStorage.getItem("lang") || "bn";

i18n.use(initReactI18next).init({
  resources: { bn: { translation: bn }, en: { translation: en } },
  lng: saved,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("lang", lng);
  document.documentElement.lang = lng;
});

export default i18n;
