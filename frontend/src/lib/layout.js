// Maps tile index (0-39) to its cell on the 11x11 board grid.
// Start (0) is bottom-right, play runs clockwise like the classic board.
export function gridPos(i) {
  if (i <= 10) return { row: 11, col: 11 - i, side: "bottom" };
  if (i <= 20) return { row: 11 - (i - 10), col: 1, side: "left" };
  if (i <= 30) return { row: 1, col: 1 + (i - 20), side: "top" };
  return { row: 1 + (i - 30), col: 11, side: "right" };
}

// Must match --cols in styles.css (corners are 1.6x wider)
const WIDTHS = [1.6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.6];
const TOTAL = WIDTHS.reduce((a, b) => a + b, 0);
const centerOf = (k) => ((WIDTHS.slice(0, k - 1).reduce((a, b) => a + b, 0) + WIDTHS[k - 1] / 2) / TOTAL) * 100;

export function tileCenter(i) {
  const { row, col } = gridPos(i);
  return { x: centerOf(col), y: centerOf(row) };
}
