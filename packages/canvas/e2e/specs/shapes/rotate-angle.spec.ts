import { test, expect } from "../../fixtures";

/**
 * Checks that a rotation handle drag turns the shape to exactly the intended
 * angle.
 *
 * rotate-undo / basic-gestures only guard that the transform changes and comes
 * back; whether the angle is right (what the rotation matrix holds) is not
 * checked. This goes down to the trigonometric components of the rendered
 * matrix(a,b,c,d,e,f) and pins that
 *
 *   1. turning the handle N degrees around the center rotates the shape exactly N degrees
 *   2. no scaling creeps in (a^2+b^2 == 1, c^2+d^2 == 1)
 *   3. the center (e,f) does not move
 *
 * A wrong sign or a mixed-up matrix (cos and sin swapped, scaling folded in)
 * fails here.
 *
 * The rotation implementation (TransformControlHandler.handleRotationDrag) takes
 * an absolute angle:
 *   newRotation = angle(center -> cursor) - angle(center -> top right corner), rounded to whole degrees.
 * Putting the cursor N degrees off the direction of the top right corner gives
 * the shape an absolute angle of N degrees. Only the angle matters, so the
 * distance to the cursor is free. There is no angle snapping, so any angle can
 * be aimed at.
 *
 * From createSvgTransform, a=cos(t), b=sin(t), c=-sin(t), d=cos(t) when unflipped,
 * so the angle recovered from the render matrix is atan2(b, a).
 */

/** The rect to draw (at zoom=1 the drawing coordinates are the center-origin transform coordinates) */
const RECT_FROM = { x: 400, y: 200 };
const RECT_TO = { x: 600, y: 320 };
const CENTER = { x: 500, y: 260 };
const HALF_WIDTH = 100;
const HALF_HEIGHT = 60;

/** Distance from the center to put the cursor. Free, since only the angle counts, but short of the edge auto-scroll */
const CURSOR_RADIUS = 150;

/** Angle tolerance in degrees, absorbing the whole-degree rounding and the cursor's sub-pixel quantization */
const ANGLE_TOLERANCE_DEG = 1.5;
/** Tolerance that rules out scaling creeping in, as a deviation from 1 */
const SCALE_TOLERANCE = 0.02;
/** Tolerance for the center drifting, in px */
const CENTER_TOLERANCE_PX = 1;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/** Normalizes to 0-360 degrees */
const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

/** Smallest difference between two angles, in degrees (0-180) */
const angleDiffDeg = (a: number, b: number): number => {
	const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b)) % 360;
	return diff > 180 ? 360 - diff : diff;
};

/** Turns "matrix(a, b, c, d, e, f)" into an array of numbers */
const parseMatrix = (transform: string | null): number[] => {
	const match = transform?.match(/^matrix\((.+)\)$/);
	if (!match) {
		throw new Error(`the transform is not in matrix form: ${transform}`);
	}
	return match[1].split(",").map((s) => Number(s.trim()));
};

/** Rotation angle recovered from the render matrix, in degrees (0-360) */
const matrixAngleDeg = (transform: string | null): number => {
	const [a, b] = parseMatrix(transform);
	return normalizeDeg(toDegrees(Math.atan2(b, a)));
};

/**
 * Content coordinates to put the cursor at for an absolute rotation of N degrees:
 * N degrees off the top right corner direction (atan2(-halfH, halfW)).
 */
const cursorForRotation = (degrees: number): { x: number; y: number } => {
	const refAngle = Math.atan2(-HALF_HEIGHT, HALF_WIDTH);
	const target = refAngle + toRadians(degrees);
	return {
		x: CENTER.x + CURSOR_RADIUS * Math.cos(target),
		y: CENTER.y + CURSOR_RADIUS * Math.sin(target),
	};
};

test.describe("exact rotation angles", () => {
	// A spread of arbitrary angles, both directions and past 180, none relying on snapping.
	for (const target of [30, 90, 150, 210, 300]) {
		test(`rotates the shape exactly ${target} degrees when the rotation handle is turned ${target} degrees`, async ({
			canvas,
		}) => {
			const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
			// Unrotated and centered at (500,260) right after drawing; every angle below assumes this.
			expect(await canvas.objectById(id).getAttribute("transform")).toBe(
				"matrix(1, 0, 0, 1, 500, 260)",
			);

			await canvas.dragTransformHandle("rotation", cursorForRotation(target));

			// The recovered angle converges on the target; if the gesture had no effect it fails here.
			await expect
				.poll(
					async () =>
						angleDiffDeg(
							matrixAngleDeg(
								await canvas.objectById(id).getAttribute("transform"),
							),
							target,
						),
					{
						message: `the rotation handle drag turns it ${target} degrees`,
					},
				)
				.toBeLessThanOrEqual(ANGLE_TOLERANCE_DEG);

			// Once converged, check the matrix for scaling and center drift.
			const [a, b, c, d, e, f] = parseMatrix(
				await canvas.objectById(id).getAttribute("transform"),
			);
			// A pure rotation keeps every column vector at length 1; scaling breaks that.
			expect(Math.abs(Math.hypot(a, b) - 1)).toBeLessThanOrEqual(
				SCALE_TOLERANCE,
			);
			expect(Math.abs(Math.hypot(c, d) - 1)).toBeLessThanOrEqual(
				SCALE_TOLERANCE,
			);
			// Rotation happens around the center, so (e,f) stays put.
			expect(Math.abs(e - CENTER.x)).toBeLessThanOrEqual(CENTER_TOLERANCE_PX);
			expect(Math.abs(f - CENTER.y)).toBeLessThanOrEqual(CENTER_TOLERANCE_PX);
		});
	}
});
