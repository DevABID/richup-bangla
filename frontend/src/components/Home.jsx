import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getName, setName } from "../lib/identity";
import LanguageToggle from "./LanguageToggle";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setNameState] = useState(getName());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready = () => {
    if (!name.trim()) {
      setError(t("home.needName"));
      return false;
    }
    setName(name);
    return true;
  };

  const create = async () => {
    if (!ready()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/rooms/", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      navigate(`/room/${data.code}`);
    } catch {
      setError(t("home.createFailed"));
    } finally {
      setBusy(false);
    }
  };

  const join = (e) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (ready() && clean) navigate(`/room/${clean}`);
  };

  return (
    <main className="home">
      <div className="home-card">
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <h1 className="home-logo"><Logo /></h1>
        <p className="tagline">{t("app.tagline")}</p>
        <div className="panel" style={{ display: "grid", gap: 14 }}>
          <label className="field">
            {t("home.yourName")}
            <input
              className="input"
              value={name}
              maxLength={20}
              placeholder={t("home.namePlaceholder")}
              onChange={(e) => {
                setNameState(e.target.value);
                setError("");
              }}
            />
          </label>
          <button className="btn hot" onClick={create} disabled={busy}>
            {t("home.create")}
          </button>
          <div className="divider">{t("home.orJoin")}</div>
          <form className="row" onSubmit={join} style={{ flexWrap: "nowrap" }}>
            <input
              className="input"
              value={code}
              maxLength={10}
              placeholder={t("home.codePlaceholder")}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ letterSpacing: "0.12em" }}
            />
            <button className="btn primary" type="submit">{t("home.join")}</button>
          </form>
          {error && <div className="debt" role="alert">{error}</div>}
        </div>
        <p className="cta-line">
          {t("request.cta")} <Link to="/request-map">{t("request.ctaLink")} →</Link>
        </p>
      </div>
    </main>
  );
}
