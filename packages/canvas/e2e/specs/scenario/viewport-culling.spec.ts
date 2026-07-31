import { expect, test } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Viewport culling (#212).
 *
 * Shapes that do not intersect the visible rect (viewport plus margin) are not
 * rendered into the DOM.
 * - A shape panned off screen drops out of the DOM and is redrawn once brought
 *   back into view
 * - Export clones the live SVG, so it suspends culling to include off-screen
 *   shapes in the output and resumes culling afterwards
 */

const findObject = async (canvas: CanvasDriver, id: string) =>
	(await canvas.captureObjects()).find((obj) => obj.id === id);

test("drops off-screen shapes from the DOM and redraws them when brought back into view", async ({
	canvas,
}) => {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 150, y: 120 },
		{ x: 400, y: 260 },
	);
	await canvas.deselect();
	const before = await findObject(canvas, id);
	expect(before).toBeDefined();

	// Pan 650px left: the shape (right edge at x=400) passes the culling margin and goes off screen.
	await canvas.middleDrag({ x: 800, y: 400 }, { x: 150, y: 400 });
	await expect
		.poll(async () => (await findObject(canvas, id)) === undefined, {
			message: "the off-screen shape drops out of the DOM",
		})
		.toBe(true);

	// Back to the original view: it is redrawn with an unchanged transform.
	await canvas.middleDrag({ x: 150, y: 400 }, { x: 800, y: 400 });
	await expect
		.poll(async () => (await findObject(canvas, id))?.transform ?? null, {
			message: "the shape brought back into view is redrawn",
		})
		.toBe(before!.transform);
});

test("includes culled off-screen shapes in the export", async ({
	canvas,
	page,
}) => {
	const id = await canvas.drawShape(
		"Rectangle",
		{ x: 150, y: 120 },
		{ x: 400, y: 260 },
	);
	await canvas.deselect();

	// Pan to get the shape culled, then export.
	await canvas.middleDrag({ x: 800, y: 400 }, { x: 150, y: 400 });
	await expect
		.poll(async () => (await findObject(canvas, id)) === undefined, {
			message: "the off-screen shape drops out of the DOM",
		})
		.toBe(true);

	await canvas.openContextMenu({ x: 700, y: 500 });
	await canvas.clickContextMenuItem("export");
	await expect(page.getByTestId("export-dialog")).toBeVisible();
	await page.getByTestId("export-dialog:format-svg").check();

	const downloadPromise = page.waitForEvent("download");
	await page.getByTestId("export-dialog:submit").click();
	const download = await downloadPromise;
	const chunks: Buffer[] = [];
	for await (const chunk of await download.createReadStream()) {
		chunks.push(chunk as Buffer);
	}
	const svgText = Buffer.concat(chunks).toString("utf-8");

	// The fit-to-content export contains the shape that was culled from the DOM.
	expect(svgText).toContain(`data-id="${id}"`);

	// Culling is back after the export: the off-screen shape stays out of the DOM.
	await expect
		.poll(async () => (await findObject(canvas, id)) === undefined, {
			message: "culling is still in effect after the export",
		})
		.toBe(true);
});
