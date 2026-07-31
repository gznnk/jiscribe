import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Checks that the arrow color follows the connector's line color.
 *
 * Arrows are filled with color={strokeColor}, the same resolved stroke color as the line
 * (Connector.tsx). If the two diverge, the line is red while the arrow stays black.
 *
 * Sets a line color and guards that the visual line's stroke and the arrow polygon's fill end
 * up the same color. Colors are applied through emotion CSS, so they are compared as computed
 * style (rgb normalized by the browser).
 */

type ConnectorColors = { arrowFill: string | null; lineStroke: string | null };

/** Reads a connector's arrow fill and visual line stroke as computed style */
async function readColors(
	canvas: CanvasDriver,
	id: string,
): Promise<ConnectorColors> {
	return canvas.page.evaluate((cid) => {
		const arrow = document.querySelector(
			`polygon[data-kind="connector"][data-id="${cid}"]`,
		);
		const hit = document.querySelector(
			`polyline[data-kind="connector"][data-id="${cid}"]`,
		);
		const parent = hit?.parentElement ?? null;
		const visual = parent
			? [...parent.querySelectorAll("polyline")].find(
					(el) => !el.hasAttribute("data-kind") && !el.hasAttribute("data-id"),
				)
			: null;
		return {
			arrowFill: arrow ? getComputedStyle(arrow).fill : null,
			lineStroke: visual ? getComputedStyle(visual).stroke : null,
		};
	}, id);
}

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

test.describe("connector arrow color following", () => {
	test("paints the visual line and the end arrow the same color when a line color is set", async ({
		canvas,
	}) => {
		const connectorId = await buildHorizontalConnector(canvas);

		// With the default color (auto → theme foreground) the arrow fill and line stroke should
		// already agree.
		const initial = await readColors(canvas, connectorId);
		expect(initial.arrowFill).toBeTruthy();
		expect(initial.lineStroke).toBeTruthy();
		expect(
			initial.arrowFill,
			"arrow fill and line stroke agree even by default",
		).toBe(initial.lineStroke);

		const red = "#e11d48";
		await canvas.clickAt({ x: 610, y: 250 });
		await expect(
			canvas.page.locator('[data-part="toggle:line-color"]'),
		).toBeVisible();
		await canvas.setColor("line-color", red);
		await canvas.deselect();

		const expected = await canvas.normalizeColor(red);
		await expect
			.poll(async () => (await readColors(canvas, connectorId)).lineStroke, {
				message: "the line color change reaches the visual line",
			})
			.toBe(expected);

		const after = await readColors(canvas, connectorId);
		expect(after.lineStroke, "the visual line takes the given color").toBe(
			expected,
		);
		expect(after.arrowFill, "the end arrow fill follows the line color").toBe(
			expected,
		);
	});
});
