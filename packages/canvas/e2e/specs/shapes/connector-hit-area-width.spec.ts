import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks the width of a connector's hit area.
 *
 * Besides the thin visual line (ConnectorElement, pointer-events: none), a connector is drawn
 * with a thick transparent hit-area line (ConnectorHitArea, stroke-width: 12, pointer-events:
 * stroke) so a click can select it without hitting the line itself dead on.
 *
 * The hit-area line's stroke-width is 12, i.e. a half width of 6px from the center line. At
 * zoom=1 world coordinates equal content coordinates, so the click positions are built relative
 * to the connector's points.
 */

type Vec = { x: number; y: number };

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("cannot read the points attribute");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

/** Locator for the ObjectMenu line-color toggle that appears when a connector is selected */
function lineColorToggle(canvas: CanvasDriver) {
	return canvas.page.locator('[data-part="toggle:line-color"]');
}

/** Joins two side-by-side rectangles rightCenter → leftCenter into a horizontal straight connector. */
async function buildHorizontalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 760, y: 200 }, { x: 920, y: 300 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 250 });
	const id = await canvas.createConnector("rightCenter", { x: 840, y: 250 });
	await canvas.deselect();
	return id;
}

test.describe("connector hit area width", () => {
	test("selects on a click slightly off the line inside the band but not outside it", async ({
		canvas,
	}) => {
		const connectorId = await buildHorizontalConnector(canvas);

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		// The route is straight (2 vertices), so the hit area is probed at its midpoint.
		expect(points.length).toBe(2);
		const mid = {
			x: (points[0].x + points[1].x) / 2,
			y: (points[0].y + points[1].y) / 2,
		};

		await canvas.clickAt({ x: mid.x, y: mid.y + 4 });
		await expect(
			lineColorToggle(canvas),
			"a click 4px off the center line, inside the ±6px hit area, selects",
		).toBeVisible();

		await canvas.deselect();

		await canvas.clickAt({ x: mid.x, y: mid.y + 20 });
		await expect(
			lineColorToggle(canvas),
			"a click 20px off the center line, outside the hit area, does not select",
		).toHaveCount(0);
		expect(
			await canvas.hasAnyControl(),
			"the outside click brings up no selection control",
		).toBe(false);

		// Confirms the hit area is live at all.
		await canvas.clickAt({ x: mid.x, y: mid.y });
		await expect(
			lineColorToggle(canvas),
			"a click on the line selects",
		).toBeVisible();
	});
});
