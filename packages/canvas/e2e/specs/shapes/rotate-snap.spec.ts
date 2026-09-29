import { test, expect } from "../../fixtures";

/**
 * Guards the two halves of the rotation angle contract: a plain drag turns the
 * shape freely (no sticking to steps of 15 or 45 degrees), and a drag with Shift
 * held snaps it to the nearest multiple of 15.
 *
 * rotate-angle.spec only checks 30/90/150/210/300, all multiples of 15, so a
 * "always snaps to 15 degree steps" regression would slip past it. Here the free
 * targets sit off the steps (8, 37, 52 degrees) and must land exactly there, and
 * the same cursor positions under Shift must land on their nearest step instead.
 *
 * From createSvgTransform, a=cos(t), b=sin(t) when unflipped, so the recovered
 * angle is atan2(b,a).
 */

const CENTER = { x: 500, y: 260 };
const HALF_WIDTH = 100;
const HALF_HEIGHT = 60;
const CURSOR_RADIUS = 150;
/** Angle tolerance in degrees, kept small so it only absorbs the whole-degree rounding and sub-pixel quantization */
const ANGLE_TOLERANCE_DEG = 1.5;
/** The snap step the implementation (handleRotationDrag) applies while Shift is held */
const SNAP_STEP_DEG = 15;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;
const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;

const angleDiffDeg = (a: number, b: number): number => {
	const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b)) % 360;
	return diff > 180 ? 360 - diff : diff;
};

const matrixAngleDeg = (transform: string | null): number => {
	const match = transform?.match(/^matrix\((.+)\)$/);
	if (!match) {
		throw new Error(`the transform is not in matrix form: ${transform}`);
	}
	const [a, b] = match[1].split(",").map((s) => Number(s.trim()));
	return normalizeDeg(toDegrees(Math.atan2(b, a)));
};

/** Content coordinates to put the cursor at for an absolute rotation of N degrees (N degrees off the top right corner) */
const cursorForRotation = (degrees: number): { x: number; y: number } => {
	const refAngle = Math.atan2(-HALF_HEIGHT, HALF_WIDTH);
	const target = refAngle + toRadians(degrees);
	return {
		x: CENTER.x + CURSOR_RADIUS * Math.cos(target),
		y: CENTER.y + CURSOR_RADIUS * Math.sin(target),
	};
};

/** Distance from the nearest multiple of 15 degrees: near 0 if it snapped, large under free rotation */
const distanceToNearest15 = (deg: number): number => {
	const nearest = Math.round(deg / SNAP_STEP_DEG) * SNAP_STEP_DEG;
	return angleDiffDeg(deg, nearest);
};

test.describe("rotation without Shift is free", () => {
	for (const target of [8, 37, 52]) {
		test(`stops exactly at ${target} degrees when turned there (no snapping to 15 degree steps)`, async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			expect(await canvas.objectById(id).getAttribute("transform")).toBe(
				"matrix(1, 0, 0, 1, 500, 260)",
			);

			await canvas.dragTransformHandle("rotation", cursorForRotation(target));

			await expect
				.poll(
					async () =>
						angleDiffDeg(
							matrixAngleDeg(
								await canvas.objectById(id).getAttribute("transform"),
							),
							target,
						),
					{ message: `it turns to exactly ${target} degrees` },
				)
				.toBeLessThanOrEqual(ANGLE_TOLERANCE_DEG);

			// The result also stays well clear of the nearest multiple of 15, which is
			// what shows there was no snapping. 8/37/52 each sit about 7 degrees from
			// their nearest multiple, so snapping would collapse this distance to near
			// 0 and fail.
			const finalAngle = matrixAngleDeg(
				await canvas.objectById(id).getAttribute("transform"),
			);
			expect(distanceToNearest15(finalAngle)).toBeGreaterThan(3);
		});
	}
});

test.describe("rotation with Shift snaps to 15 degree steps", () => {
	for (const { target, snapped } of [
		{ target: 8, snapped: 15 },
		{ target: 37, snapped: 30 },
		{ target: 52, snapped: 45 },
	]) {
		test(`snaps ${target} degrees to ${snapped} while Shift is held`, async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			expect(await canvas.objectById(id).getAttribute("transform")).toBe(
				"matrix(1, 0, 0, 1, 500, 260)",
			);

			await canvas.dragTransformHandle("rotation", cursorForRotation(target), {
				shift: true,
			});

			await expect
				.poll(
					async () =>
						angleDiffDeg(
							matrixAngleDeg(
								await canvas.objectById(id).getAttribute("transform"),
							),
							snapped,
						),
					{ message: `it snaps to ${snapped} degrees` },
				)
				.toBeLessThanOrEqual(ANGLE_TOLERANCE_DEG);
		});
	}
});
