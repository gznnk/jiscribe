import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards the flip that happens when a resize handle is dragged past the opposite
 * edge.
 *
 * The implementation expresses a flip as "width/height absolute, sign carried by
 * scaleX/scaleY" (TransformControlHandler: width: Math.abs(newWidth),
 * scaleX: sign(newWidth)). Guarded so a flipped shape stays intact, with width
 * and height positive, and only the matrix signs flip.
 */

type Matrix = {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
};

function parseMatrix(transform: string | null): Matrix {
	const matched = (transform ?? "").match(/matrix\(([^)]+)\)/);
	if (!matched) {
		throw new Error(`cannot parse the matrix: ${transform}`);
	}
	const [a, b, c, d, e, f] = matched[1].split(",").map(Number);
	return { a, b, c, d, e, f };
}

async function matrixOf(canvas: CanvasDriver, id: string): Promise<Matrix> {
	return parseMatrix(await canvas.objectById(id).getAttribute("transform"));
}

async function sizeAttr(
	canvas: CanvasDriver,
	id: string,
): Promise<{ width: number; height: number }> {
	const el = canvas.objectById(id);
	return {
		width: Number(await el.getAttribute("width")),
		height: Number(await el.getAttribute("height")),
	};
}

test.describe("resize flip", () => {
	test("flips horizontally when the right handle is pulled past the left edge (scaleX sign flips, width stays positive)", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		// No rotation, so matrix.a = scaleX, positive to begin with.
		expect((await matrixOf(canvas, id)).a).toBeGreaterThan(0);

		// Pull the right-center handle left of the left edge (x=400) (ctrl: no snapping).
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 320, y: 250 },
			{ ctrl: true },
		);

		const matrix = await matrixOf(canvas, id);
		const size = await sizeAttr(canvas, id);
		expect(matrix.a).toBeLessThan(0); // horizontal flip
		expect(size.width).toBeGreaterThan(0); // width stays positive, so the shape is intact
		expect(size.height).toBeGreaterThan(0);
	});

	test("flips vertically when the bottom handle is pulled past the top edge (scaleY sign flips, height stays positive)", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		// No rotation, so matrix.d = scaleY, positive to begin with.
		expect((await matrixOf(canvas, id)).d).toBeGreaterThan(0);

		// Pull the bottom-center handle above the top edge (y=200).
		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 480, y: 140 },
			{ ctrl: true },
		);

		const matrix = await matrixOf(canvas, id);
		const size = await sizeAttr(canvas, id);
		expect(matrix.d).toBeLessThan(0); // vertical flip
		expect(size.width).toBeGreaterThan(0);
		expect(size.height).toBeGreaterThan(0);
	});

	// Ellipse runs the same matrix-sign path as Rectangle, so both axes must flip
	// for a non-rectangular shape too. An Ellipse has no width/height attributes
	// (rx/ry instead), so "intact" is checked through the boundingBox extent.
	// (Polygon folds the scale into its points, a different path that matrix signs
	// cannot measure, so it is out of scope here.)
	test("Ellipse: flips horizontally when the right handle is pulled past the left edge (scaleX sign flips)", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		expect((await matrixOf(canvas, id)).a).toBeGreaterThan(0);

		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 320, y: 250 },
			{ ctrl: true },
		);

		expect((await matrixOf(canvas, id)).a).toBeLessThan(0); // horizontal flip
		const box = await canvas.objectById(id).boundingBox();
		expect(box?.width ?? 0).toBeGreaterThan(0); // still has extent, so the shape is intact
		expect(box?.height ?? 0).toBeGreaterThan(0);
	});

	test("Ellipse: flips vertically when the bottom handle is pulled past the top edge (scaleY sign flips)", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Ellipse",
			{ x: 400, y: 200 },
			{ x: 560, y: 300 },
		);
		expect((await matrixOf(canvas, id)).d).toBeGreaterThan(0);

		await canvas.dragTransformHandle(
			"bottomCenter",
			{ x: 480, y: 140 },
			{ ctrl: true },
		);

		expect((await matrixOf(canvas, id)).d).toBeLessThan(0); // vertical flip
		const box = await canvas.objectById(id).boundingBox();
		expect(box?.width ?? 0).toBeGreaterThan(0);
		expect(box?.height ?? 0).toBeGreaterThan(0);
	});
});
