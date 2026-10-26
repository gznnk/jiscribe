import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Where the composite flowchart shapes answer a press, in a real browser: only
 * hit testing over the drawn SVG can tell what a press lands on. A db and a
 * multi-document draw several elements under one group, some of them
 * decoration that must leave the press to the silhouette, and both leave
 * corners of their box unpainted, which must stay empty canvas.
 */

/** One shape per page, drawn in the same 160 x 160 box. */
const FROM = { x: 300, y: 200 };
const TO = { x: 460, y: 360 };

/** Inside the box's top-left corner, outside both shapes' silhouettes. */
const BOX_CORNER = { x: 305, y: 205 };

/** Draws `presetId` from the flowchart flyout in the shared box, leaving nothing selected. */
async function drawPreset(
	canvas: CanvasDriver,
	presetId: string,
): Promise<string> {
	const id = await canvas.drawShapeFromFlyout("flowchart", presetId, FROM, TO);
	await canvas.deselect();
	return id;
}

test.describe("db hit areas", () => {
	test("selects the cylinder by a press on its top cap, above the front edge", async ({
		canvas,
	}) => {
		await drawPreset(canvas, "db");

		// The cap's apex is the box's top edge (y = 200), its front edge dips to
		// 0.24 of the height below that (y = 238.4); this is between the two.
		await canvas.selectAt({ x: 380, y: 220 });
	});

	test("leaves the box's corner outside the cap's curve as empty canvas", async ({
		canvas,
	}) => {
		await drawPreset(canvas, "db");

		await canvas.clickAt(BOX_CORNER);

		await expect(canvas.page.locator(selectors.control)).toHaveCount(0);
	});

	test("leaves a press on the cap's front edge to the body silhouette", async ({
		canvas,
	}) => {
		const id = await drawPreset(canvas, "db");

		const hits = await canvas.page.evaluate((objectId) => {
			const group = document.querySelector(
				`[data-kind="object"][data-id="${objectId}"]`,
			);
			const [bodyPath, capEdgePath] = group
				? [...group.querySelectorAll(":scope > path")]
				: [];
			if (!(capEdgePath instanceof SVGPathElement)) {
				throw new Error("the db draws no cap edge");
			}
			// The edge's lowest point, on the stroke: the box Chrome reports for a
			// path is its geometry, so its bottom is where the arc turns.
			const edgeBox = capEdgePath.getBoundingClientRect();
			const x = edgeBox.x + edgeBox.width / 2;
			const y = edgeBox.bottom - 0.5;
			const asDrawn = document.elementFromPoint(x, y);
			// The same point with the edge made hittable, to show it is on the stroke.
			capEdgePath.style.pointerEvents = "auto";
			const withEdgeHittable = document.elementFromPoint(x, y);
			capEdgePath.style.pointerEvents = "";
			return {
				asDrawnIsBody: asDrawn === bodyPath,
				withEdgeHittableIsEdge: withEdgeHittable === capEdgePath,
			};
		}, id);

		expect(hits.withEdgeHittableIsEdge).toBe(true);
		expect(hits.asDrawnIsBody).toBe(true);
	});
});

test.describe("multiDocument hit areas", () => {
	test("selects the stack by a press on the back sheet where no sheet covers it", async ({
		canvas,
	}) => {
		await drawPreset(canvas, "multiDocument");

		// The back sheet spans x = 325.6..460 from the top edge down; the middle
		// sheet stops at x = 447.2 and starts at y = 212.8.
		await canvas.selectAt({ x: 455, y: 205 });
	});

	test("leaves the box's corner no sheet reaches as empty canvas", async ({
		canvas,
	}) => {
		await drawPreset(canvas, "multiDocument");

		// The sheets step up and to the right by 12.8 px each, so the top-left
		// 12.8 px square of the box is under none of them.
		await canvas.clickAt(BOX_CORNER);

		await expect(canvas.page.locator(selectors.control)).toHaveCount(0);
	});
});
