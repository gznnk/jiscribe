import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards that copy-paste and duplicate carry over rotation, meaning the
 * rotation and scale components of the transform matrix.
 *
 * The existing preserves-content specs look at background color, text and font,
 * but whether a transform including rotation survives the clipboard was
 * uncovered. Of matrix(a,b,c,d,e,f), a,b,c,d (rotation plus scale) must match on
 * the clone; e,f differ because of the placement offset.
 */

type Matrix = {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
};

/** Parses a transform string "matrix(a, b, c, d, e, f)" into numbers. */
function parseMatrix(transform: string | null): Matrix {
	const matched = (transform ?? "").match(/matrix\(([^)]+)\)/);
	if (!matched) {
		throw new Error(`cannot parse matrix: ${transform}`);
	}
	const [a, b, c, d, e, f] = matched[1].split(",").map(Number);
	return { a, b, c, d, e, f };
}

/** Reads the transform matrix of the shape with the given id. */
async function matrixOf(canvas: CanvasDriver, id: string): Promise<Matrix> {
	const objects = await canvas.captureObjects();
	const target = objects.find((obj) => obj.id === id);
	return parseMatrix(target?.transform ?? null);
}

/** Draws a rect and rotates it, returning the id. Leaves the shape selected. */
async function drawRotatedRect(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 420, y: 220 },
		{ x: 580, y: 300 },
	);
	await canvas.dragTransformHandle("rotation", { x: 500, y: 120 });
	return id;
}

test.describe("copy-paste / duplicate preserve rotation", () => {
	test("carries rotation (matrix a,b,c,d) over on copy-paste", async ({
		canvas,
	}) => {
		const srcId = await drawRotatedRect(canvas);
		const src = await matrixOf(canvas, srcId);
		// Confirm it really rotated; with no rotation b is about 0 and the check
		// below would pass vacuously.
		expect(Math.abs(src.b)).toBeGreaterThan(0.1);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const cloned = (await canvas.captureObjects()).find(
			(obj) => !beforeIds.has(obj.id),
		);
		const clone = parseMatrix(cloned?.transform ?? null);
		expect(clone.a).toBeCloseTo(src.a, 2);
		expect(clone.b).toBeCloseTo(src.b, 2);
		expect(clone.c).toBeCloseTo(src.c, 2);
		expect(clone.d).toBeCloseTo(src.d, 2);
	});

	test("carries rotation (matrix a,b,c,d) over on duplicate (Ctrl+D)", async ({
		canvas,
	}) => {
		const srcId = await drawRotatedRect(canvas);
		const src = await matrixOf(canvas, srcId);
		expect(Math.abs(src.b)).toBeGreaterThan(0.1);

		const before = await canvas.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);

		const cloned = (await canvas.captureObjects()).find(
			(obj) => !beforeIds.has(obj.id),
		);
		const clone = parseMatrix(cloned?.transform ?? null);
		expect(clone.a).toBeCloseTo(src.a, 2);
		expect(clone.b).toBeCloseTo(src.b, 2);
		expect(clone.c).toBeCloseTo(src.c, 2);
		expect(clone.d).toBeCloseTo(src.d, 2);
	});
});
