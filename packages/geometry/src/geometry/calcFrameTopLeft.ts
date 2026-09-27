import { calcFrameKeyPoints } from "./calcFrameKeyPoints";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Where a frame's top-left corner lands once its rotation and flips are applied:
 * the local `(-width / 2, -height / 2)` corner in world coordinates, named for the
 * position it holds before the transform. The corner a box grown from its content
 * is anchored on, and the coordinate a `geometry: "point"` document stores.
 *
 * Read off {@link calcFrameKeyPoints} so the corner is computed in one place;
 * {@link calcFrameCenterFromTopLeft} is the way back.
 *
 * @param frame - The box in world coordinates plus the transform applied to it; rotation is in degrees
 * @returns The corner in world coordinates, unrounded
 */
export const calcFrameTopLeft = (frame: TransformedFrame): Point =>
	calcFrameKeyPoints(frame).topLeft;
