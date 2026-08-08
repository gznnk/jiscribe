import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Guards that a connector's dash type and stroke width survive copy and paste.
 *
 * If either is dropped from the serialization round trip through the clipboard
 * (ConnectorMapper), the copy falls back to the defaults: a solid line at strokeWidth 1/2.
 *
 * The dash pattern is derived from the stroke width by getStrokeDasharray (dashed = 4·sw 4·sw).
 * Setting dashed with strokeWidth=6 and checking the copy's dasharray is "24 24" covers both at
 * once: the default strokeWidth=2 would give 8 8, and a solid line no dasharray at all.
 */

async function connectorIds(canvas: CanvasDriver): Promise<string[]> {
	return canvas.page.evaluate(
		(sel) =>
			[...document.querySelectorAll(sel)]
				.map((el) => el.getAttribute("data-id"))
				.filter((id): id is string => id !== null),
		selectors.connectorPolyline,
	);
}

/** dasharray numbers of the connector's visual line (the polyline under its parent with no data attributes) */
async function dashNumbers(
	canvas: CanvasDriver,
	id: string,
): Promise<number[]> {
	const raw = await canvas.page.evaluate((cid) => {
		const hitEl = document.querySelector(
			`polyline[data-kind="connector"][data-id="${cid}"]`,
		);
		const parent = hitEl?.parentElement ?? null;
		const visualEl = parent
			? [...parent.querySelectorAll("polyline")].find(
					(el) => !el.hasAttribute("data-kind") && !el.hasAttribute("data-id"),
				)
			: null;
		if (!visualEl) {
			return null;
		}
		const attr = visualEl.getAttribute("stroke-dasharray");
		return attr ?? getComputedStyle(visualEl).strokeDasharray;
	}, id);
	if (!raw || raw === "none") {
		return [];
	}
	return [...raw.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

test("carries a connector's dash type (dashed) and stroke width through copy and paste", async ({
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

	await canvas.clickAt({ x: 500, y: 325 });
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("line-style")),
	).toBeVisible();
	await canvas.setStrokeDashType("line-style", "dashed");
	await canvas.setNumberInput("strokeWidth", 6);

	// Confirm the settings took effect before copying.
	await expect
		.poll(() => dashNumbers(canvas, srcConnectorId), {
			message: "the source connector becomes dashed × sw6 (24 24)",
		})
		.toEqual([24, 24]);

	// Leave the number input before selecting all, so the canvas gets the shortcuts.
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

	expect(
		await dashNumbers(canvas, clonedConnectorId),
		"the cloned connector keeps the dash type and stroke width (dashed × sw6 = 24 24)",
	).toEqual([24, 24]);
});
