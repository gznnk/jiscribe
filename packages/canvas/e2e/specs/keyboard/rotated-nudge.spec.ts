import { test, expect } from "../../fixtures";

/**
 * Guards that nudging a rotated shape
 *   - moves along the world axes (screen up/down/left/right), not the shape's
 *     local axes
 *   - moves by a constant world amount (1px, 10px with Shift)
 *   - leaves the rotation components (a,b,c,d of the matrix) untouched.
 *
 * Nudge is a pure translation: moveSelection (moveByDelta) adds the world delta
 * to the center and never touches rotation. Changing it to "nudge along the
 * local axes" or "movement that accounts for rotation" would make rotated shapes
 * travel diagonally or change a,b,c,d. The existing nudge.spec / rotated-resize
 * cover unrotated nudge and rotated resize, but not the orthogonality of
 * rotation and nudge.
 *
 * From createSvgTransform, with no flip a=cosθ, b=sinθ, c=-sinθ, d=cosθ, and e,f
 * is the center. Rotation is around the center, so (e,f) stays (500,260) after
 * rotating.
 */

const CENTER = { x: 500, y: 260 };
const HALF_WIDTH = 100;
const HALF_HEIGHT = 60;
/** Distance from the center at which the cursor is placed; only the angle matters. */
const CURSOR_RADIUS = 150;
/** Rotation to apply, in degrees. Tilted enough to tell apart from no rotation. */
const ROTATE_DEG = 40;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

const parseMatrix = (transform: string | null): number[] => {
	const match = transform?.match(/^matrix\((.+)\)$/);
	if (!match) {
		throw new Error(`transform is not in matrix form: ${transform}`);
	}
	return match[1].split(",").map((s) => Number(s.trim()));
};

/**
 * Content coordinates to place the cursor at for an absolute rotation of the
 * given angle, measured from the direction of the top-right corner.
 */
const cursorForRotation = (degrees: number): { x: number; y: number } => {
	const refAngle = Math.atan2(-HALF_HEIGHT, HALF_WIDTH);
	const target = refAngle + toRadians(degrees);
	return {
		x: CENTER.x + CURSOR_RADIUS * Math.cos(target),
		y: CENTER.y + CURSOR_RADIUS * Math.sin(target),
	};
};

test.describe("nudging a rotated shape", () => {
	test("moves along the world axes and leaves the rotation components unchanged", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);

		// Rotate the shape by about 40 degrees.
		await canvas.dragTransformHandle("rotation", cursorForRotation(ROTATE_DEG));
		await expect
			.poll(async () => parseMatrix(await rect.getAttribute("transform"))[1], {
				message: "rotation moves the b component (sinθ) off 0",
			})
			.not.toBe(0);

		const rotated = parseMatrix(await rect.getAttribute("transform"));
		const [a0, b0, c0, d0, e0, f0] = rotated;
		// Rotation is around the center, so (e,f) is unchanged from drawing time.
		expect(e0).toBeCloseTo(CENTER.x, 6);
		expect(f0).toBeCloseTo(CENTER.y, 6);
		// Confirm it really rotated, i.e. not the a=1,b=0 of no rotation.
		expect(Math.abs(b0)).toBeGreaterThan(0.1);

		// Right nudge: world x +1. The rotation components (a,b,c,d) and f are unchanged.
		await canvas.nudge("right");
		await expect
			.poll(async () => parseMatrix(await rect.getAttribute("transform"))[4], {
				message: "the right nudge moves world x by +1px",
			})
			.toBeCloseTo(e0 + 1, 6);
		{
			const [a, b, c, d, , f] = parseMatrix(
				await rect.getAttribute("transform"),
			);
			expect(a).toBeCloseTo(a0, 10);
			expect(b).toBeCloseTo(b0, 10);
			expect(c).toBeCloseTo(c0, 10);
			expect(d).toBeCloseTo(d0, 10);
			expect(f).toBeCloseTo(f0, 6); // y does not move
		}

		// Down nudge: world y +1.
		await canvas.nudge("down");
		await expect
			.poll(async () => parseMatrix(await rect.getAttribute("transform"))[5], {
				message: "the down nudge moves world y by +1px",
			})
			.toBeCloseTo(f0 + 1, 6);

		// Shift+left nudge: world x -10, so e0+1-10 = e0-9 in total.
		await canvas.nudge("left", { large: true });
		await expect
			.poll(async () => parseMatrix(await rect.getAttribute("transform"))[4], {
				message: "the Shift+left nudge moves world x by -10px",
			})
			.toBeCloseTo(e0 - 9, 6);

		// The rotation components survive the whole nudge sequence intact.
		const [a, b, c, d] = parseMatrix(await rect.getAttribute("transform"));
		expect(a).toBeCloseTo(a0, 10);
		expect(b).toBeCloseTo(b0, 10);
		expect(c).toBeCloseTo(c0, 10);
		expect(d).toBeCloseTo(d0, 10);
	});
});
