import { Button } from "@/components/ui/button";
import { NAME, type CamoPublicState } from "@/lib/camo-engine";
import { sqName, type Color } from "@/lib/chess";
import { cn } from "@/lib/utils";

type Props = {
  state: CamoPublicState;
  viewer: Color | null;
  canAct: boolean;
  revealArmed: boolean;
  onToggleReveal: () => void;
};

export function BattleshipStatus({ state, viewer, canAct, revealArmed, onToggleReveal }: Props) {
  const lastMiss = state.guesses.at(-1);

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card shadow-glow">
      {(["w", "b"] as const).map((color, index) => {
        const status = state.bishopStatus[color];
        const own = viewer === color;
        const canUnhide = own && canAct && status === "hidden";
        const hasRevealMove = state.revealLegal.length > 0;
        const missApplies =
          !own && status === "hidden" && lastMiss && !lastMiss.hit && lastMiss.actor === viewer;
        return (
          <div
            key={color}
            className={cn(
              "flex min-h-24 flex-col justify-between gap-2 px-3 py-2.5 sm:px-4",
              index === 1 && "border-l border-border",
            )}
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {NAME[color]}&apos;s {color === "w" ? "light-square" : "dark-square"} bishop
              </p>
              <p className="mt-0.5 text-sm capitalize text-torch">{status}</p>
              {missApplies && (
                <p className="mt-0.5 text-xs text-muted-foreground">Not on {sqName(lastMiss.sq)}</p>
              )}
            </div>
            {canUnhide && (
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant={revealArmed ? "default" : "outline"}
                  className="h-auto min-h-8 w-full whitespace-normal px-2 py-1 text-xs"
                  onClick={onToggleReveal}
                  disabled={!revealArmed && !hasRevealMove}
                >
                  {revealArmed
                    ? "Cancel unhide"
                    : hasRevealMove
                      ? "Unhide & move bishop"
                      : "No legal unhide move"}
                </Button>
                {revealArmed && (
                  <p className="mt-1 text-center text-xs font-medium text-torch">
                    Select the bishop—it must move now.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
