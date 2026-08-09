import { centeredPolygonOutline } from "@jiscribe/canvas-sdk";

import { calcGearPoints } from "./calcGearPoints";

/**
 * Gear outline (centered): the toothed rim itself. The bounding box overshoots
 * it by more than 40% on the diagonals — the gear never reaches a box corner —
 * so a connector aimed at one would stop well clear of the drawing.
 *
 * The rim is star-shaped about the center (calcGearPoints), so following it
 * exactly still moves a connector's endpoint continuously; it just moves fast
 * across a tooth.
 */
export const gearOutline = centeredPolygonOutline(calcGearPoints);
