import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getName } from "../lib/identity";
import { num } from "../lib/format";
import LanguageToggle from "./LanguageToggle";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const EMPTY = { map_name: "", theme: "", places: "", requester_name: getName(), contact: "", website: "" };

export default function MapRequest() {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const placeCount = form.places.split(/[\n,،]+/).map((x) => x.trim()).filter(Boolean).length;

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/map-requests/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, language: i18n.language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data);
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError({ error: "network" });
      setStatus("error");
    }
  };

  const errorText = error && (
    error.field
      ? t(`request.errors.${error.error}`, { field: t(`request.fields.${error.field}`) })
      : t(`request.errors.${error.error}`, { defaultValue: t("request.errors.network") })
  );

  return (
    <>
      <header className="topbar">
        <Link to="/" className="topbar-logo" aria-label={t("app.title")}><Logo /></Link>
        <div className="row"><ThemeToggle /><LanguageToggle /></div>
      </header>

      <main className="request-page">
        {status === "sent" ? (
          <div className="panel request-done">
            <div className="big-emoji" aria-hidden="true">🗺️</div>
            <h2>{t("request.thanksTitle")}</h2>
            <p>{t("request.thanksBody", { name: form.map_name })}</p>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn" onClick={() => { setForm({ ...EMPTY, requester_name: form.requester_name, contact: form.contact }); setStatus("idle"); }}>
                {t("request.another")}
              </button>
              <Link className="btn primary" to="/">{t("request.backHome")}</Link>
            </div>
          </div>
        ) : (
          <form className="panel request-form" onSubmit={submit}>
            <div>
              <h2>{t("request.title")}</h2>
              <p className="muted">{t("request.intro")}</p>
            </div>

            <label className="field">
              <span>{t("request.fields.map_name")} <span className="req">*</span></span>
              <input className="input" value={form.map_name} onChange={set("map_name")} maxLength={80} required
                placeholder={t("request.ph.map_name")} />
            </label>

            <label className="field">
              {t("request.fields.theme")}
              <textarea className="input" rows={2} value={form.theme} onChange={set("theme")} maxLength={1000}
                placeholder={t("request.ph.theme")} />
            </label>

            <label className="field">
              <span>{t("request.fields.places")} <span className="req">*</span></span>
              <span className="hint">{t("request.placesHint")}</span>
              <textarea className="input" rows={8} value={form.places} onChange={set("places")} maxLength={4000} required
                placeholder={t("request.ph.places")} />
              <span className="hint">{t("request.placeCount", { count: num(placeCount, i18n.language) })}</span>
            </label>

            <div className="two-col">
              <label className="field">
                {t("request.fields.requester_name")}
                <input className="input" value={form.requester_name} onChange={set("requester_name")} maxLength={60} />
              </label>
              <label className="field">
                {t("request.fields.contact")}
                <input className="input" value={form.contact} onChange={set("contact")} maxLength={120}
                  placeholder={t("request.ph.contact")} />
              </label>
            </div>

            {/* Spam trap: hidden from people, bots fill it in */}
            <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={form.website} onChange={set("website")} name="website" />

            {status === "error" && <div className="debt" role="alert">{errorText}</div>}

            <button className="btn hot" type="submit" disabled={status === "sending"}>
              {status === "sending" ? t("request.sending") : t("request.submit")}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
