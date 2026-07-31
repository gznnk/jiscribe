import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Viewport framing commands (Zoom to Fit / Zoom to Selection).
 *
 * They run from keyboard shortcuts (Ctrl+0 / Ctrl+2) and build the viewBox from
 * the bounding box of the content or of the selection. A broken bounds
 * computation does not blank the screen, so it is easy to miss; the invariant
 * guarded here is that the target ends up inside the frame.
 *
 * A shape's transform (e,f of the matrix = its center) and the viewBox live in
 * the same SVG coordinate system, so the center can be compared against the
 * viewBox range directly, whatever the zoom / pan state.
 */

type ViewBox = { minX: number; minY: number; width: number; height: number };

/** Split a viewBox string of the form "minX minY width height" into numbers */
function parseViewBox(raw: string | null): ViewBox {
	if (!raw) {
		throw new Error("cannot read the viewBox");
	}
	const [minX, minY, width, height] = raw.trim().split(/\s+/).map(Number);
	return { minX, minY, width, height };
}

/** Pull the center (e,f) out of a shape's transform="matrix(1, 0, 0, 1, e, f)" */
function centerOf(transform: string | null): { x: number; y: number } {
	if (!transform) {
		throw new Error("cannot read the transform");
	}
	const nums = transform.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`cannot parse transform: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

/** Whether a point lies inside the viewBox rect, boundary included */
function contains(box: ViewBox, point: { x: number; y: number }): boolean {
	return (
		point.x >= box.minX &&
		point.x <= box.minX + box.width &&
		point.y >= box.minY &&
		point.y <= box.minY + box.height
	);
}

/** Center of the shape with the given data-id */
async function centerOfObject(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const obj = (await canvas.captureObjects()).find((o) => o.id === id);
	if (!obj) {
		throw new Error(`shape ${id} not found`);
	}
	return centerOf(obj.transform);
}

test.describe("viewport framing", () => {
	test("fits every shape inside the frame on Zoom to Fit", async ({
		canvas,
	}) => {
		// Spread the shapes over an area well under the viewport (1440x900), so the fit
		// zooms in and the viewBox width ends up smaller than the initial one.
		const leftId = await canvas.drawShape(
			"Rectangle",
			{ x: 200, y: 200 },
			{ x: 360, y: 300 },
		);
		const rightId = await canvas.drawShape(
			"Rectangle",
			{ x: 1000, y: 600 },
			{ x: 1160, y: 720 },
		);
		await canvas.deselect();

		const before = parseViewBox(await canvas.getViewBox());

		await canvas.zoomToFit();

		await expect
			.poll(() => canvas.getViewBox(), {
				message: "Zoom to Fit changes the viewBox",
			})
			.not.toBe(
				`${before.minX} ${before.minY} ${before.width} ${before.height}`,
			);

		const after = parseViewBox(await canvas.getViewBox());
		const leftCenter = await centerOfObject(canvas, leftId);
		const rightCenter = await centerOfObject(canvas, rightId);

		expect(
			contains(after, leftCenter),
			"the left shape is inside the frame",
		).toBe(true);
		expect(
			contains(after, rightCenter),
			"the right shape is inside the frame",
		).toBe(true);
		// The content is smaller than the viewport, so the fit zooms in and narrows the frame.
		expect(after.width).toBeLessThan(before.width);
	});

	test("frames only the selected shape on Zoom to Selection, leaving unselected ones outside", async ({
		canvas,
	}) => {
		const selectedId = await canvas.drawShape(
			"Rectangle",
			{ x: 200, y: 200 },
			{ x: 360, y: 300 },
		);
		const otherId = await canvas.drawShape(
			"Rectangle",
			{ x: 1000, y: 600 },
			{ x: 1160, y: 720 },
		);

		// Select only the left shape; right after drawShape the right one is selected.
		await canvas.selectAt({ x: 280, y: 250 });

		const before = parseViewBox(await canvas.getViewBox());

		await canvas.zoomToSelection();

		await expect
			.poll(() => canvas.getViewBox(), {
				message: "Zoom to Selection changes the viewBox",
			})
			.not.toBe(
				`${before.minX} ${before.minY} ${before.width} ${before.height}`,
			);

		const after = parseViewBox(await canvas.getViewBox());
		const selectedCenter = await centerOfObject(canvas, selectedId);

		expect(
			contains(after, selectedCenter),
			"the selected shape is inside the frame",
		).toBe(true);
		// Selection frames the selection rather than the whole content, so a distant
		// unselected shape falls outside. Viewport culling (#212) removes out-of-frame
		// shapes from the DOM, so "absent from the DOM" counts as being outside too.
		const other = (await canvas.captureObjects()).find((o) => o.id === otherId);
		expect(
			other === undefined || !contains(after, centerOf(other.transform)),
			"the unselected shape is outside the frame",
		).toBe(true);
		expect(after.width).toBeLessThan(before.width);
	});

	test("does nothing on Zoom to Fit when there are no shapes", async ({
		canvas,
	}) => {
		const before = await canvas.getViewBox();

		await canvas.zoomToFit();

		// canExecute is false with 0 objects, so the viewBox is unchanged.
		await expect.poll(() => canvas.getViewBox()).toBe(before);
	});

	test("does nothing on Zoom to Selection when nothing is selected", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		const before = await canvas.getViewBox();

		await canvas.zoomToSelection();

		// canExecute is false with 0 selectedIds, so the viewBox is unchanged.
		await expect.poll(() => canvas.getViewBox()).toBe(before);
	});
});
