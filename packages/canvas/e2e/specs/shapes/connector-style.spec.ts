import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Applying and persisting connector style settings (line color and dash type).
 *
 * object-menu.spec covers making a shape (polyline) dashed, but styling the connector itself was
 * uncovered. A connector is drawn as two elements — a hit target (transparent, with data-id) and a
 * visual one (styled, without data-kind) — and the style only lands on the visual one. Guards
 * through computed style that a setting reaches the visual element and survives deselection.
 */

/** Joins two stacked rectangles with a vertical connector and returns its id (the selection is cleared afterwards). */
async function buildConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();
	return connectorId;
}

/**
 * Reads the computed style of the visual polyline (the one without data-kind). Its points differ
 * from the hit target because the visual element insets its ends by the arrow size. The only
 * polylines on the canvas are the hit target (with data-kind) and the visual one, but the shape
 * icons in the toolbar (the Polyline tool and so on) are also drawn as <polyline> without
 * data-kind and come before the canvas content in the DOM, so icons inside buttons are excluded to
 * pick the visual element.
 */
async function visualStyle(
	canvas: CanvasDriver,
	prop: "stroke" | "stroke-dasharray",
): Promise<string> {
	return canvas.page.evaluate((p) => {
		const visual = [
			...document.querySelectorAll("polyline:not([data-kind])"),
		].find((el) => !el.closest("button"));
		return visual ? getComputedStyle(visual).getPropertyValue(p) : "";
	}, prop);
}

/** Computed styles of every visual polyline (without data-kind, toolbar icons excluded). */
async function allVisualStyles(
	canvas: CanvasDriver,
	prop: "stroke" | "stroke-dasharray",
): Promise<string[]> {
	return canvas.page.evaluate(
		(p) =>
			[...document.querySelectorAll("polyline:not([data-kind])")]
				.filter((el) => !el.closest("button"))
				.map((el) => getComputedStyle(el).getPropertyValue(p)),
		prop,
	);
}

test.describe("connector style", () => {
	test("applies a line color to the visual element and keeps it after deselection", async ({
		canvas,
	}) => {
		await buildConnector(canvas);

		// Click the line to select it; the connector ObjectMenu appears.
		await canvas.clickAt({ x: 500, y: 350 });
		await expect(
			canvas.page.locator('[data-part="toggle:line-color"]'),
		).toBeVisible();

		const customStroke = await canvas.normalizeColor("#e11d48");
		await canvas.setColor("line-color", "#e11d48");
		await expect
			.poll(() => visualStyle(canvas, "stroke"), {
				message: "the line color lands on the visual polyline",
			})
			.toBe(customStroke);

		// The color survives deselection.
		await canvas.deselect();
		expect(await visualStyle(canvas, "stroke")).toBe(customStroke);
	});

	test("sets the dasharray of the visual element when the dash type is set to dashed", async ({
		canvas,
	}) => {
		await buildConnector(canvas);

		await canvas.clickAt({ x: 500, y: 350 });
		await expect(
			canvas.page.locator('[data-part="toggle:line-style"]'),
		).toBeVisible();

		// The default is solid, with no dasharray.
		expect(await visualStyle(canvas, "stroke-dasharray")).toBe("none");

		await canvas.setStrokeDashType("line-style", "dashed");
		await expect
			.poll(() => visualStyle(canvas, "stroke-dasharray"), {
				message: "dasharray is set when the line is made dashed",
			})
			.not.toBe("none");
	});

	test("carries the line color over to a connector duplicated by copy and paste", async ({
		canvas,
	}) => {
		await buildConnector(canvas);

		// Select the connector and set its line color.
		await canvas.clickAt({ x: 500, y: 350 });
		await expect(
			canvas.page.locator('[data-part="toggle:line-color"]'),
		).toBeVisible();
		const customStroke = await canvas.normalizeColor("#e11d48");
		await canvas.setColor("line-color", "#e11d48");
		await expect.poll(() => visualStyle(canvas, "stroke")).toBe(customStroke);
		await canvas.deselect();

		// Select all, copy and paste -> there are two connectors.
		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(
				async () =>
					(await canvas.captureObjects()).filter((o) => o.tag === "polyline")
						.length,
				{ message: "copy and paste gives two connectors" },
			)
			.toBe(2);

		// Deselect to remove the highlight polyline of the selected connector from the rendering.
		await canvas.deselect();

		// Exactly two visual polylines (the original plus the copy) carry the configured line color.
		// Decorative UI polylines in other colors are also on screen, so the count is taken over
		// polylines matching the configured color rather than over all of them. If the clone drops
		// the style, this becomes 1 and the test fails.
		const strokes = await allVisualStyles(canvas, "stroke");
		const styledCount = strokes.filter((s) => s === customStroke).length;
		expect(styledCount).toBe(2);
	});
});
