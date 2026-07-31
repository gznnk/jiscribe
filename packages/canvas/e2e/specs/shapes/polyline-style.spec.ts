import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Line color and line style on a standalone Polyline (the shape the Polyline
 * tool draws), and their persistence.
 *
 * connector-style covers the line style of connectors (automatic routing). The
 * line-color / line-style of a shape drawn with the Polyline tool runs through a
 * different ObjectState and a different menu path. Guarded on computed style:
 * the setting reaches the visual polyline and survives deselection.
 *
 * A Polyline renders as two elements, one for hit testing (has data-id,
 * transparent) and one visual (styled, no data-kind). The style only lands on
 * the visual one, so that is what gets checked.
 */
async function visualStyle(
	canvas: CanvasDriver,
	id: string,
	prop: "stroke" | "stroke-dasharray",
): Promise<string> {
	const visual = await canvas.visualPolylineFor(id);
	return visual.evaluate(
		(el, p) => getComputedStyle(el).getPropertyValue(p),
		prop,
	);
}

test.describe("Polyline style", () => {
	test("applies the line color to the visual element and keeps it after deselection", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 320 },
		);
		// drawShape auto-selects, so the ObjectMenu is up.

		const customStroke = await canvas.normalizeColor("#e11d48");
		await canvas.setColor("line-color", "#e11d48");
		await expect
			.poll(() => visualStyle(canvas, id, "stroke"), {
				message: "the visual polyline takes the line color",
			})
			.toBe(customStroke);

		// Still there after deselecting.
		await canvas.deselect();
		expect(await visualStyle(canvas, id, "stroke")).toBe(customStroke);
	});

	test("makes the visual element dashed when the line style is set to dashed", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 320 },
		);

		// Solid by default, with no dasharray.
		const before = await visualStyle(canvas, id, "stroke-dasharray");
		expect(before === "" || before === "none").toBe(true);

		await canvas.setStrokeDashType("line-style", "dashed");
		await expect
			.poll(() => visualStyle(canvas, id, "stroke-dasharray"), {
				message: "stroke-dasharray gets set when it turns dashed",
			})
			.not.toMatch(/^(none)?$/);
	});
});
