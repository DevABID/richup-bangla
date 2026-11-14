import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGame } from "../lib/store";
import { getName, setName } from "../lib/identity";
import { useVoice } from "../lib/useVoice";
import GameView from "./GameView";
import LanguageToggle from "./LanguageToggle";
import Logo from "./Logo";
import SoundToggle from "./SoundToggle";
import ThemeToggle from "./ThemeToggle";
import Lobby from "./Lobby";
import Toasts from "./Toasts";

export default function Room() {
  const { code } = useParams();
  const { t } = useTranslation();
  const [name, setNameState] = useState(getName());
  const [draft, setDraft] = useState("");
  const room = code.toUpperCase();

  const game = useGame((s) => s.game);
  const connected = useGame((s) => s.connected);
  const connect = useGame((s) => s.connect);

  useEffect(() => {
    if (name) return connect(room, name);
  }, [room, name, connect]);

  const voice = useVoice();

  if (!name) {
    return (
      <main className="home">
        <form
          className="home-card panel"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            setName(draft);
            setNameState(draft.trim());
          }}
        >
          <label className="field">
            {t("home.yourName")}
            <input className="input" autoFocus value={draft} maxLength={20}
              placeholder={t("home.namePlaceholder")} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <button className="btn hot" type="submit">{t("home.join")}</button>
        </form>
      </main>
    );
  }

  return (
    <>
      <header className="topbar">
        <Link to="/" className="topbar-logo" aria-label={t("app.title")}><Logo /></Link>
        <div className="row">
          {!connected && <span className="status-pill">{game ? t("app.reconnecting") : t("app.connecting")}</span>}
          <SoundToggle />
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>
      {game && (game.status === "lobby" ? <Lobby voice={voice} /> : <GameView voice={voice} />)}
      <Toasts />
    </>
  );
}
