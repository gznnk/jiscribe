import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards re-attaching the callout tail:
 * - a handle (selection:callout:tailTip) appears at the tail tip on selection
 * - free-dragging that handle changes side / position and the path follows
 *
 * The callout is drawn out of the annotation category flyout, which is where it
 * lives since it moved to @jiscribe/plugin-annotation-shapes.
 */

const TAIL_HANDLE =
	'[data-kind="control"][data-part="selection:callout:tailTip"]';

/** Creates a callout by diagonal drag out of the annotation flyout and returns its new id. */
async function createCallout(
	canvas: CanvasDriver,
	from: { x: number; y: number },
	to: { x: number; y: number },
): Promise<string> {
	return canvas.drawShapeFromFlyout("annotation", "callout", from, to);
}

/** Reads the source endpoint (the first point) of the given connector. */
async function connectorSourceY(
	canvas: CanvasDriver,
	id: string,
): Promise<number | null> {
	return canvas.page.evaluate((connectorId) => {
		const el = document.querySelector(
			`polyline[data-kind="connector"][data-id="${connectorId}"]`,
		);
		const first = el?.getAttribute("points")?.split(" ")[0];
		const y = first?.split(",")[1];
		return y === undefined ? null : Number(y);
	}, id);
}

/** Reads the d attribute of the given callout's path. */
async function calloutPathD(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.page.evaluate((objectId) => {
		const el = document.querySelector(`[data-id="${objectId}"]`);
		return el?.getAttribute("d") ?? null;
	}, id);
}

test.describe("callout tail re-attach", () => {
	test("turns the tail right and updates the path when the tip handle is dragged to the right edge", async ({
		canvas,
	}) => {
		// 200x160 callout (content coordinates x=[300,500], y=[220,380]).
		const id = await createCallout(
			canvas,
			{ x: 300, y: 220 },
			{ x: 500, y: 380 },
		);

		// Selected right after creation, with the handle at the default tail tip
		// (bottom edge, position 0.2 = x=340, y=380).
		const handle = canvas.page.locator(TAIL_HANDLE);
		await expect(handle).toBeVisible();

		const before = await calloutPathD(canvas, id);
		expect(before).toBeTruthy();

		// Drag the tip to the middle of the right edge (x=500, y=300): side=right / position=0.5.
		await canvas.drag({ x: 340, y: 380 }, { x: 500, y: 300 });

		// The path changes and the tip moves to the local right edge center (100, 0)
		// (local coordinates are centered, so a 200x160 callout has its right edge at x=100).
		await expect
			.poll(async () => calloutPathD(canvas, id), {
				message: "the path updates when the tail is re-attached",
			})
			.not.toBe(before);
		const after = await calloutPathD(canvas, id);
		expect(after).toContain("L 100 0");
	});

	test("re-resolves an attached connector when the tail leaves its edge", async ({
		canvas,
	}) => {
		await createCallout(canvas, { x: 300, y: 220 }, { x: 500, y: 380 });

		// With the tail on the bottom edge, the tail band takes the bottom quarter,
		// so the bottom anchor sits on the body edge at y=340 rather than y=380.
		const connectorId = await canvas.createConnector("bottomCenter", {
			x: 400,
			y: 600,
		});
		expect(await connectorSourceY(canvas, connectorId)).toBeCloseTo(340, 0);

		await canvas.selectAt({ x: 400, y: 250 });
		await expect(canvas.page.locator(TAIL_HANDLE)).toBeVisible();

		// Tail to the middle of the right edge: the bottom edge is now flat, so the
		// anchor belongs at the bounding-box edge (y=380).
		await canvas.drag({ x: 340, y: 380 }, { x: 500, y: 300 });

		await expect
			.poll(async () => connectorSourceY(canvas, connectorId), {
				message: "the connector endpoint follows the moved tail",
			})
			.toBeCloseTo(380, 0);
	});
});
