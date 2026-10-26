import type { CanvasMode } from "../CanvasTypes";

/**
 * Neither editing text nor armed to draw. One frozen instance every writer that
 * returns to normal hands over, so a reset that changes nothing leaves the
 * reference memoized readers compare by.
 */
export const NORMAL_MODE: CanvasMode = Object.freeze({ kind: "normal" });
