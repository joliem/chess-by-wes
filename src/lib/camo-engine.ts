import {
  applyMove,
  isLight,
  key,
  other,
  PIECE_NAME,
  same,
  sqName,
  type Board,
  type Color,
  type Piece,
  type PieceType,
  type Sq,
} from "@/lib/chess";
import {
  battleshipHasAnyMove,
  battleshipInCheck,
  battleshipPieceMoves,
  createBattleshipBoard,
  hiddenBishopMoves,
  revealedBishopMoves,
  type HiddenBishops,
} from "@/lib/battleship-bishop";
import { emptyLost, sortLost, type Lost } from "@/lib/captures";

export const NAME: Record<Color, string> = { w: "White", b: "Black" };
export type GuessRecord = { sq: Sq; hit: boolean; actor: Color; id: number };
export type Notice = { id: number; text: string } | null;
export type CamoState = {
  board: Board;
  hidden: HiddenBishops;
  turn: Color;
  phase: "move" | "guess" | "over";
  guessingColor: Color | null;
  hiddenCheck: Color | null;
  bishopStatus: Record<Color, "hidden" | "revealed" | "captured">;
  epTarget: Sq | null;
  lastMove: { from: Sq; to: Sq; hidden: boolean; color: Color } | null;
  guesses: GuessRecord[];
  lost: Lost;
  winner: Color | null;
  log: Record<Color, string[]>;
  notice: Record<Color, Notice>;
  eventId: number;
  ply: number;
};
export type CamoPublicState = Omit<
  CamoState,
  "log" | "board" | "hidden" | "notice" | "guessingColor"
> & {
  board: Board;
  overlays: Record<string, Piece>;
  log: string[];
  notice: Notice;
  check: boolean;
  checkColor: Color | null;
  legal: Record<string, Sq[]>;
  hiddenLegal: Sq[];
  revealLegal: Sq[];
  guessColor: "light" | "dark" | null;
  revealed: string[];
};
export type CamoAction =
  | {
      kind: "move";
      from: Sq;
      to: Sq;
      hidden?: boolean;
      reveal?: boolean;
      promoteTo?: PieceType;
    }
  | { kind: "guess"; sq: Sq };
export type CamoOutcome = { ok: true; state: CamoState } | { ok: false; error: string };

const say = (log: string[], line: string) => [line, ...log].slice(0, 8);
const BATTLESHIP_INTRO = "Hunt the hidden bishop before it attacks!";
function addLost(lost: Lost, piece: Piece): Lost {
  return { ...lost, [piece.color]: sortLost([...lost[piece.color], piece.type]) };
}
function normalizedBishopStatus(state: CamoState): CamoState["bishopStatus"] {
  if (state.bishopStatus) return state.bishopStatus;
  return Object.fromEntries(
    (["w", "b"] as const).map((color) => {
      if (state.hidden[color]) return [color, "hidden"];
      const onBoard = state.board.some((row) => row.some((piece) => piece?.id === `${color}-b-5`));
      return [color, onBoard ? "revealed" : "captured"];
    }),
  ) as CamoState["bishopStatus"];
}
function finishTurn(
  state: CamoState,
  board: Board,
  hidden: HiddenBishops,
  next: Color,
  log: Record<Color, string[]>,
  hiddenCheck: Color | null,
) {
  const checked = battleshipInCheck(board, hidden, next, hiddenCheck);
  const noMoves = !battleshipHasAnyMove(board, hidden, next, state.epTarget, hiddenCheck);
  if (!noMoves) return { phase: "move" as const, winner: null, log };
  const winner = checked ? other(next) : null;
  const line = checked ? `🏆 ${NAME[winner!]} wins by checkmate!` : "🤝 Stalemate — draw.";
  return { phase: "over" as const, winner, log: { w: say(log.w, line), b: say(log.b, line) } };
}
export function createCamoState(): CamoState {
  const { board, hidden } = createBattleshipBoard();
  const opening = BATTLESHIP_INTRO;
  return {
    board,
    hidden,
    turn: "w",
    phase: "move",
    guessingColor: null,
    hiddenCheck: null,
    bishopStatus: { w: "hidden", b: "hidden" },
    epTarget: null,
    lastMove: null,
    guesses: [],
    lost: emptyLost(),
    winner: null,
    log: { w: [opening], b: [opening] },
    notice: { w: null, b: null },
    eventId: 0,
    ply: 0,
  };
}

export function maskCamoState(state: CamoState, viewer: Color | null): CamoPublicState {
  const over = state.phase === "over";
  const bishopStatus = normalizedBishopStatus(state);
  const overlays: Record<string, Piece> = {};
  for (const color of ["w", "b"] as const) {
    const bishop = state.hidden[color];
    if (bishop && (over || color === viewer)) overlays[key(bishop.sq)] = bishop.piece;
  }
  const legal: Record<string, Sq[]> = {};
  let hiddenLegal: Sq[] = [];
  let revealLegal: Sq[] = [];
  if (viewer && !over && state.phase === "move" && state.turn === viewer) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        if (state.board[r]![c]?.color === viewer)
          legal[key({ r, c })] = battleshipPieceMoves(
            state.board,
            state.hidden,
            { r, c },
            state.epTarget,
            state.hiddenCheck,
          );
      }
    const bishop = state.hidden[viewer];
    hiddenLegal = bishop
      ? hiddenBishopMoves(state.board, state.hidden, viewer, state.hiddenCheck)
      : [];
    revealLegal = bishop ? revealedBishopMoves(state.board, state.hidden, viewer) : [];
  }
  const ownHiddenMove = state.lastMove?.hidden && state.lastMove.color === viewer;
  const checkColor =
    state.phase !== "over" &&
    battleshipInCheck(state.board, state.hidden, state.turn, state.hiddenCheck)
      ? state.turn
      : null;
  return {
    board: state.board,
    overlays,
    turn: state.turn,
    phase: state.phase,
    hiddenCheck: state.hiddenCheck,
    epTarget: state.epTarget,
    lastMove:
      state.lastMove && (!state.lastMove.hidden || over || ownHiddenMove) ? state.lastMove : null,
    guesses: viewer
      ? state.guesses
          .filter(
            (guess) =>
              guess.actor === viewer && (guess.hit || bishopStatus[other(viewer)] === "hidden"),
          )
          .slice(-1)
      : [],
    lost: state.lost,
    bishopStatus,
    winner: state.winner,
    log: viewer ? state.log[viewer] : [],
    notice: viewer ? state.notice[viewer] : null,
    eventId: state.eventId,
    ply: state.ply,
    check:
      !!viewer && !over && battleshipInCheck(state.board, state.hidden, viewer, state.hiddenCheck),
    checkColor,
    legal,
    hiddenLegal,
    revealLegal,
    guessColor:
      viewer && state.phase === "guess" && state.guessingColor
        ? state.guessingColor === "w"
          ? "light"
          : "dark"
        : null,
    revealed: [],
  };
}

export function applyCamoAction(state: CamoState, action: CamoAction, actor: Color): CamoOutcome {
  if (state.phase === "over") return { ok: false, error: "This game is already over." };
  if (actor !== state.turn) return { ok: false, error: "It isn't your turn." };
  for (const sq of action.kind === "move" ? [action.from, action.to] : [action.sq]) {
    if (
      !Number.isInteger(sq.r) ||
      !Number.isInteger(sq.c) ||
      sq.r < 0 ||
      sq.r > 7 ||
      sq.c < 0 ||
      sq.c > 7
    )
      return { ok: false, error: "That square isn't on the board." };
  }
  const eventId = state.eventId + 1;
  const currentBishopStatus = normalizedBishopStatus(state);
  if (action.kind === "guess") {
    if (state.phase !== "guess" || !state.guessingColor)
      return { ok: false, error: "There's no hidden bishop to target right now." };
    const prey = state.hidden[state.guessingColor];
    if (!prey || isLight(action.sq) !== (prey.piece.color === "w"))
      return { ok: false, error: `Pick a ${prey?.piece.color === "w" ? "light" : "dark"} square.` };
    const hit = same(prey.sq, action.sq),
      foe = other(actor);
    const actorText = hit
      ? "You found and captured their hidden bishop!"
      : "You guessed wrong -- it's still hidden!";
    const foeText = hit
      ? "Your opponent found and captured your hidden bishop!"
      : "Your opponent guessed wrong -- it's still hidden!";
    const hidden = hit ? { ...state.hidden, [foe]: null } : state.hidden;
    const bishopStatus = hit
      ? ({ ...currentBishopStatus, [foe]: "captured" } as CamoState["bishopStatus"])
      : currentBishopStatus;
    const lost = hit ? addLost(state.lost, prey.piece) : state.lost;
    let log = {
      ...state.log,
      [actor]: say(state.log[actor], `🎯 ${actorText}`),
      [foe]: say(state.log[foe], `🎯 ${foeText}`),
    };
    const hiddenCheck = hit && state.hiddenCheck === foe ? null : state.hiddenCheck;
    const end = finishTurn(state, state.board, hidden, actor, log, hiddenCheck);
    log = end.log;
    return {
      ok: true,
      state: {
        ...state,
        hidden,
        bishopStatus,
        hiddenCheck,
        guesses: [...state.guesses, { sq: action.sq, hit, actor, id: eventId }],
        guessingColor: null,
        phase: end.phase,
        winner: end.winner,
        turn: actor,
        lost,
        log,
        notice: {
          w: { id: eventId, text: actor === "w" ? actorText : foeText },
          b: { id: eventId, text: actor === "b" ? actorText : foeText },
        },
        eventId,
      },
    };
  }
  if (state.phase !== "move") return { ok: false, error: "You can't move right now." };
  const ownHidden = state.hidden[actor],
    movingHidden = action.hidden === true,
    revealing = movingHidden && action.reveal === true;
  if (movingHidden && (!ownHidden || !same(ownHidden.sq, action.from)))
    return { ok: false, error: "There's no hidden bishop on that square." };
  const mover = movingHidden ? ownHidden!.piece : state.board[action.from.r]?.[action.from.c];
  if (!mover) return { ok: false, error: "There's no piece on that square." };
  if (mover.color !== actor) return { ok: false, error: "That isn't your piece." };
  const legal = movingHidden
    ? revealing
      ? revealedBishopMoves(state.board, state.hidden, actor)
      : hiddenBishopMoves(state.board, state.hidden, actor, state.hiddenCheck)
    : battleshipPieceMoves(
        state.board,
        state.hidden,
        action.from,
        state.epTarget,
        state.hiddenCheck,
      );
  if (!legal.some((sq) => same(sq, action.to)))
    return { ok: false, error: "That move isn't legal." };
  const foe = other(actor);
  let board: Board,
    hidden = state.hidden,
    bishopStatus = currentBishopStatus,
    epTarget: Sq | null;
  let captured: Piece | null = null,
    promoted = false,
    castled: "king" | "queen" | null = null,
    enPassant = false;
  let quietHiddenMove = false,
    revealedNow = false;
  if (movingHidden) {
    epTarget = null;
    if (revealing) {
      captured = state.board[action.to.r]![action.to.c] ?? null;
      board = state.board.map((row) => row.slice());
      board[action.to.r]![action.to.c] = { ...mover, moved: true, revealed: true };
      hidden = { ...state.hidden, [actor]: null };
      bishopStatus = { ...currentBishopStatus, [actor]: "revealed" };
      revealedNow = true;
    } else {
      board = state.board;
      hidden = { ...state.hidden, [actor]: { piece: { ...mover, moved: true }, sq: action.to } };
      quietHiddenMove = true;
    }
  } else {
    const promoteTo =
      mover.type === "p" && (action.to.r === 0 || action.to.r === 7)
        ? (action.promoteTo ?? "q")
        : "q";
    const result = applyMove(state.board, action.from, action.to, state.epTarget, promoteTo);
    ({ board, captured, promoted, castled, enPassant, epTarget } = result);
    if (captured && captured.id === `${captured.color}-b-5`) {
      bishopStatus = { ...currentBishopStatus, [captured.color]: "captured" };
    }
  }
  const lost = captured ? addLost(state.lost, captured) : state.lost;
  const captureText = captured
    ? ` and captured a ${PIECE_NAME[captured.type]}${enPassant ? " en passant" : ""}`
    : "";
  const moveLine = castled
    ? `${NAME[actor]} castled ${castled}side.`
    : `${NAME[actor]} played ${PIECE_NAME[mover.type]} to ${sqName(action.to)}${captureText}${promoted ? " and promoted!" : ""}.`;
  const baseLog = {
    w: state.ply === 0 ? state.log.w.filter((line) => line !== BATTLESHIP_INTRO) : state.log.w,
    b: state.ply === 0 ? state.log.b.filter((line) => line !== BATTLESHIP_INTRO) : state.log.b,
  };
  let log: Record<Color, string[]> = {
    w: say(
      baseLog.w,
      movingHidden && !revealedNow && actor !== "w"
        ? `${NAME[actor]} moved their hidden bishop.`
        : moveLine,
    ),
    b: say(
      baseLog.b,
      movingHidden && !revealedNow && actor !== "b"
        ? `${NAME[actor]} moved their hidden bishop.`
        : moveLine,
    ),
  };
  const notice: Record<Color, Notice> = { w: null, b: null };
  if (revealedNow) {
    notice[actor] = {
      id: eventId,
      text: `You unhid your bishop${captured ? ` and captured a ${PIECE_NAME[captured.type]}` : ""}!`,
    };
    notice[foe] = {
      id: eventId,
      text: `${NAME[actor]} unhid their bishop${captured ? ` and captured your ${PIECE_NAME[captured.type]}` : ""}!`,
    };
  }
  const hiddenCheck = null;
  const checked = battleshipInCheck(board, hidden, foe, hiddenCheck);
  if (checked) log = { ...log, [foe]: say(log[foe], "⚔️ You are in CHECK!") };
  let phase: CamoState["phase"], winner: Color | null;
  if (quietHiddenMove) {
    phase = "guess";
    winner = null;
    log = {
      ...log,
      [foe]: say(
        log[foe],
        `🎯 Target one ${actor === "w" ? "light" : "dark"} square to find the hidden bishop.`,
      ),
    };
    notice[foe] = {
      id: eventId,
      text: `${NAME[actor]} moved their hidden bishop. Target one ${actor === "w" ? "light" : "dark"} square.`,
    };
  } else {
    const end = finishTurn({ ...state, epTarget }, board, hidden, foe, log, hiddenCheck);
    phase = end.phase;
    winner = end.winner;
    log = end.log;
  }
  return {
    ok: true,
    state: {
      ...state,
      board,
      hidden,
      bishopStatus,
      hiddenCheck,
      turn: foe,
      phase,
      guessingColor: quietHiddenMove ? actor : null,
      epTarget,
      lastMove: {
        from: action.from,
        to: action.to,
        hidden: movingHidden && !revealing,
        color: actor,
      },
      lost,
      winner,
      log,
      notice,
      eventId,
      ply: state.ply + 1,
    },
  };
}
