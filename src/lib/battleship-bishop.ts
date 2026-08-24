import {
  applyMove,
  inCheck,
  initialBoard,
  inside,
  safeMoves,
  same,
  type Board,
  type Color,
  type Piece,
  type Sq,
} from "@/lib/chess";

export type HiddenBishop = { piece: Piece; sq: Sq };
export type HiddenBishops = Record<Color, HiddenBishop | null>;

export function createBattleshipBoard(): { board: Board; hidden: HiddenBishops } {
  const board = initialBoard();
  const white = board[7]![5]!;
  const black = board[0]![5]!;
  board[7]![5] = null;
  board[0]![5] = null;
  return {
    board,
    hidden: {
      w: { piece: white, sq: { r: 7, c: 5 } },
      b: { piece: black, sq: { r: 0, c: 5 } },
    },
  };
}

/** Legal destinations for an ordinary piece. Every hidden bishop is intangible. */
export function battleshipPieceMoves(
  board: Board,
  hidden: HiddenBishops,
  from: Sq,
  epTarget: Sq | null,
  _activeHiddenCheck: Color | null,
): Sq[] {
  const piece = board[from.r]?.[from.c];
  if (!piece) return [];
  return safeMoves(board, from, epTarget).filter((to) => {
    if (piece.type === "k" && Math.abs(to.c - from.c) === 2) {
      const step = to.c > from.c ? 1 : -1;
      const mid = applyMove(board, from, { r: from.r, c: from.c + step }, null).board;
      if (inCheck(board, piece.color) || inCheck(mid, piece.color)) {
        return false;
      }
    }
    const result = applyMove(board, from, to, epTarget);
    return !inCheck(result.board, piece.color);
  });
}

/**
 * A hidden bishop is intangible: it passes through and may share a square with
 * every other piece. Because it has no chess effect, it cannot answer check.
 */
export function hiddenBishopMoves(
  board: Board,
  hidden: HiddenBishops,
  color: Color,
  _activeHiddenCheck: Color | null,
): Sq[] {
  const bishop = hidden[color];
  if (!bishop || inCheck(board, color)) return [];
  const out: Sq[] = [];
  for (const [dr, dc] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    let r = bishop.sq.r + dr;
    let c = bishop.sq.c + dc;
    while (inside(r, c)) {
      out.push({ r, c });
      r += dr;
      c += dc;
    }
  }
  return out;
}

/** Legal destinations when a player reveals and must move the hidden bishop. */
export function revealedBishopMoves(board: Board, hidden: HiddenBishops, color: Color): Sq[] {
  const bishop = hidden[color];
  if (!bishop) return [];
  const boardWithBishop = board.map((row) => row.slice());
  // A different piece may share the hiding square. Temporarily replace it so
  // the normal move generator can start from the bishop; the original occupant
  // remains in place after the bishop leaves.
  boardWithBishop[bishop.sq.r]![bishop.sq.c] = bishop.piece;
  return safeMoves(boardWithBishop, bishop.sq, null).filter((to) => {
    const result = applyMove(boardWithBishop, bishop.sq, to, null);
    const restored = result.board.map((row) => row.slice());
    restored[bishop.sq.r]![bishop.sq.c] = board[bishop.sq.r]![bishop.sq.c] ?? null;
    return !inCheck(restored, color);
  });
}

export function battleshipInCheck(
  board: Board,
  _hidden: HiddenBishops,
  color: Color,
  _activeHiddenCheck: Color | null,
): boolean {
  return inCheck(board, color);
}

export function battleshipHasAnyMove(
  board: Board,
  hidden: HiddenBishops,
  color: Color,
  epTarget: Sq | null,
  activeHiddenCheck: Color | null,
): boolean {
  if (hiddenBishopMoves(board, hidden, color, activeHiddenCheck).length) return true;
  if (revealedBishopMoves(board, hidden, color).length) return true;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (
        board[r]![c]?.color === color &&
        battleshipPieceMoves(board, hidden, { r, c }, epTarget, activeHiddenCheck).length
      ) {
        return true;
      }
    }
  }
  return false;
}

export function hiddenAt(hidden: HiddenBishops, sq: Sq): HiddenBishop | null {
  return Object.values(hidden).find((bishop) => bishop && same(bishop.sq, sq)) ?? null;
}
