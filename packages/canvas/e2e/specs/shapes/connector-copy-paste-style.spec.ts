import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards that a connector's style (arrows and line color) survives copy and paste.
 *
 * If either is dropped from the serialization through the clipboard, the copy falls back to the
 * defaults: no start arrow and the default color. Checked through the copy's arrow count and
 * arrow fill; the arrow fill is the connector's stroke color, so it covers the line color too.
 */

/** IDs of every data-kind=connector polyline (the connector bodies) */
async function connectorIds(canvas: CanvasDriver): Promise<string[]> {
	return canvas.page.evaluate(
		(sel) =>
			[...document.querySelectorAll(sel)]
				.map((el) => el.getAttribute("data-id"))
				.filter((id): id is string => id !== null),
		selectors.connectorPolyline,
	);
}

/** Number of arrow polygons on the given connector */
async function arrowCount(canvas: CanvasDriver, id: string): Promise<number> {
	return canvas.page.evaluate(
		(cid) =>
			document.querySelectorAll(
				`polygon[data-kind="connector"][data-id="${cid}"]`,
			).length,
		id,
	);
}

/** Computed fill of the given connector's first arrow polygon */
async function arrowFill(canvas: CanvasDriver, id: string): Promise<string> {
	return canvas.page.evaluate((cid) => {
		const arrow = document.querySelector(
			`polygon[data-kind="connector"][data-id="${cid}"]`,
		);
		return arrow ? getComputedStyle(arrow).fill : "";
	}, id);
}

test("carries a connector's startArrow and line color through copy and paste", async ({
	canvas,
}) => {
	// Join two stacked rectangles with a vertical connector.
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 400 }, { x: 600, y: 500 });
	await canvas.deselect();
	await canvas.selectAt({ x: 500, y: 200 });
	const srcConnectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 400,
	});
	await canvas.deselect();

	// Set a start arrow and a line color, neither of which is the default.
	await canvas.clickAt({ x: 500, y: 325 });
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("arrow-head-start")),
	).toBeVisible();
	await canvas.openObjectMenu("arrow-head-start");
	await canvas.page.click(
		selectors.objectMenuSet("startArrow", "FilledTriangle"),
	);
	await canvas.setColor("line-color", "#e11d48");

	// Confirm the settings took effect: start + end gives 2 arrows.
	await expect.poll(() => arrowCount(canvas, srcConnectorId)).toBe(2);
	const expectedFill = await canvas.normalizeColor("#e11d48");

	// While the color input keeps focus it swallows Ctrl+A/C/V, so deselect first to close the
	// menu and hand focus back to the canvas.
	await canvas.deselect();

	await canvas.selectAll();
	await canvas.copy();
	await canvas.paste();
	await expect.poll(async () => (await connectorIds(canvas)).length).toBe(2);

	const clonedConnectorId = (await connectorIds(canvas)).find(
		(id) => id !== srcConnectorId,
	);
	if (!clonedConnectorId) {
		throw new Error("cannot read the data-id of the cloned connector");
	}

	expect(await arrowCount(canvas, clonedConnectorId)).toBe(2);
	expect(await arrowFill(canvas, clonedConnectorId)).toBe(expectedFill);
});
