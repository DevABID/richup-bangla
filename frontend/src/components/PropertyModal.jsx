import { useTranslation } from "react-i18next";
import { playerById, useGame } from "../lib/store";
import { money, num, tileName } from "../lib/format";
import { ownedBy, ownsGroup } from "../lib/rules";
import Modal from "./Modal";

export default function PropertyModal({ tileId, onClose }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { game, board, you, act } = useGame();
  const tile = board[tileId];
  const prop = game.properties[tileId];
  const owner = playerById(game, prop?.owner);
  const mine = prop?.owner === you && game.status === "playing";
  const m = (n) => money(n, lang);

  let rows = [];
  let active = -1;
  if (tile.type === "property") {
    const fullSet = prop && ownsGroup(game, board, prop.owner, tile.group);
    rows = [
      [t("property.rent"), m(tile.rent[0])],
      [t("property.rentSet"), m(tile.rent[0] * 2)],
      ...[1, 2, 3, 4].map((n) => [t("property.houses", { count: num(n, lang) }), m(tile.rent[n])]),
      [t("property.hotel"), m(tile.rent[5])],
    ];
    if (prop) active = prop.houses > 0 ? prop.houses + 1 : fullSet ? 1 : 0;
  } else if (tile.type === "railroad") {
    rows = [1, 2, 3, 4].map((n) => [t("property.railRent", { count: num(n, lang) }), m(25 * 2 ** (n - 1))]);
    if (prop) active = ownedBy(game, prop.owner).filter((id) => board[id].type === "railroad").length - 1;
  }

  const mortgageValue = Math.floor(tile.price / 2);

  return (
    <Modal onClose={onClose}>
      <div className="prop-head" style={{ "--c": tile.color ?? "var(--brand)" }}>
        <h2>{tile.icon} {tileName(tile, lang)}</h2>
        {tile.tagline_bn && <p className="tagline">“{lang === "bn" ? tile.tagline_bn : tile.tagline_en}”</p>}
        <div>{t("property.price")}: {m(tile.price)}</div>
      </div>

      <div>
        {rows.map(([k, v], i) => (
          <div key={k} className={`kv ${i === active ? "active" : ""}`}><span>{k}</span><span>{v}</span></div>
        ))}
        {tile.type === "utility" && <p>{t("property.utilRent")}</p>}
        {tile.house_cost && <div className="kv"><span>{t("property.houseCost")}</span><span>{m(tile.house_cost)}</span></div>}
        <div className="kv"><span>{t("property.mortgageValue")}</span><span>{m(mortgageValue)}</span></div>
        <div className="kv">
          <span>{t("property.owner")}</span>
          <span>{owner ? owner.name : t("property.unowned")}{prop?.mortgaged && ` (${t("property.mortgaged")})`}</span>
        </div>
      </div>

      {mine && (
        <div className="row">
          {tile.type === "property" && (
            <>
              <button className="btn primary small" disabled={prop.houses >= 5 || prop.mortgaged}
                onClick={() => act("build", { tile: tileId })}>
                {t("property.build")} ({m(tile.house_cost)})
              </button>
              <button className="btn small" disabled={prop.houses === 0} onClick={() => act("sell_house", { tile: tileId })}>
                {t("property.sell")} (+{m(Math.floor(tile.house_cost / 2))})
              </button>
            </>
          )}
          {game.settings.mortgage && !prop.mortgaged && (
            <button className="btn small" disabled={prop.houses > 0} onClick={() => act("mortgage", { tile: tileId })}>
              {t("property.mortgage")} (+{m(mortgageValue)})
            </button>
          )}
          {prop.mortgaged && (
            <button className="btn small" onClick={() => act("unmortgage", { tile: tileId })}>
              {t("property.unmortgage")} ({m(Math.floor(mortgageValue * 1.1))})
            </button>
          )}
        </div>
      )}
      <button className="btn ghost" onClick={onClose}>{t("property.close")}</button>
    </Modal>
  );
}
