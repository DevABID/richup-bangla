import { useState } from "react";
import { useTranslation } from "react-i18next";
import { play, setSoundOn, soundOn } from "../lib/sound";

export default function SoundToggle() {
  const { t } = useTranslation();
  const [on, setOn] = useState(soundOn);
  const toggle = () => {
    setSoundOn(!on);
    setOn(!on);
    if (!on) play("coin");
  };
  return (
    <button className="btn small ghost" onClick={toggle} aria-pressed={on}
      aria-label={on ? t("sound.mute") : t("sound.unmute")} title={on ? t("sound.mute") : t("sound.unmute")}>
      {on ? "🔊" : "🔇"}
    </button>
  );
}
