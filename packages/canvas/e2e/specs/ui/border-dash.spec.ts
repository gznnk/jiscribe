import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Dash type of a rectangle's border (strokeDashType in the border-style section).
 *
 * object-menu.spec covers the line-style (dashed) of a polyline and connector-style
 * covers the dash type of a connector, but dashed / dotted borders of a shape had no
 * coverage. RectElement draws stroke-dasharray as an SVG attribute, so the dash type is
 * verified through the attribute pattern
 * (dashed = equal pair "n n", dotted = 1:2 pair "n 2n", solid = no attribute).
 *
 * Note: the border-style dropdown stays open after a choice, so calling the driver's
 * setStrokeDashType repeatedly would toggle it closed. Opening it only when the set
 * button is not visible supports several changes in a row.
 */

/** Sets strokeDashType in border-style, opening the section only when needed */
async function setBorderDash(
	canvas: CanvasDriver,
	value: "solid" | "dashed" | "dotted",
) {
	const setButton = canvas.page.locator(
		selectors.objectMenuSet("strokeDashType", value),
	);
	if (!(await setButton.isVisible())) {
		await canvas.openObjectMenu("border-style");
	}
	await setButton.click();
}

/** The rect's stroke-dasharray attribute (null when unset) */
async function dashArray(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.objectById(id).getAttribute("stroke-dasharray");
}

/** Splits "a b" into a numeric pair */
function pair(value: string | null): [number, number] {
	const [a, b] = (value ?? "").trim().split(/\s+/).map(Number);
	return [a, b];
}

test.describe("rectangle border dash type (border-style)", () => {
	test("switches the stroke-dasharray pattern for dashed and dotted", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await setBorderDash(canvas, "dashed");
		await expect.poll(() => dashArray(canvas, id)).not.toBeNull();
		const [dashOn, dashOff] = pair(await dashArray(canvas, id));
		// A dashed border is an equal pair (n n).
		expect(dashOn).toBeGreaterThan(0);
		expect(dashOn).toBe(dashOff);

		await setBorderDash(canvas, "dotted");
		await expect
			.poll(async () => {
				const [on, off] = pair(await dashArray(canvas, id));
				return on > 0 && off === on * 2;
			})
			.toBe(true);
	});

	test("drops stroke-dasharray when switched back to solid", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await setBorderDash(canvas, "dashed");
		await expect.poll(() => dashArray(canvas, id)).not.toBeNull();

		await setBorderDash(canvas, "solid");
		await expect.poll(() => dashArray(canvas, id)).toBeNull();
	});
});
