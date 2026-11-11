// Small client-side helpers mirroring server rules (for enabling buttons only;
// the server always has the final say).
export const groupTiles = (board, group) => board.filter((t) => t.group === group).map((t) => t.id);

export const ownsGroup = (game, board, pid, group) =>
  groupTiles(board, group).every((id) => game.properties[id]?.owner === pid);

export const groupHasHouses = (game, board, group) =>
  groupTiles(board, group).some((id) => (game.properties[id]?.houses ?? 0) > 0);

export const ownedBy = (game, pid) =>
  Object.entries(game.properties)
    .filter(([, p]) => p.owner === pid)
    .map(([id]) => Number(id))
    .sort((a, b) => a - b);
