import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Preset color selection for Sticky.
 *
 * Unlike other shapes, Sticky has a dedicated color menu with no CSS input
 * (StickyColorMenu, presets only), and it was the only one left uncovered. Pressing a
 * preset swatch changes the body fill, and it survives deselect -> reselect.
 *
 * The Sticky body is the second polygon inside the <g> (the first is the shadow), and
 * the fill lands on the SVG fill attribute.
 */
async function stickyFill(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.page.evaluate((stickyId) => {
		const group = document.querySelector(`[data-id="${stickyId}"]`);
		const polygons = group ? [...group.querySelectorAll("polygon")] : [];
		// The first polygon is the shadow, the second one is the body.
		const main = polygons[1] ?? polygons[0];
		return main?.getAttribute("fill") ?? null;
	}, id);
}

test.describe("Sticky preset colors", () => {
	test("changes the body fill from a preset swatch and keeps it after deselecting", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Sticky");
		const box = await canvas.objectById(id).boundingBox();
		if (!box) {
			throw new Error("cannot get the boundingBox of the Sticky");
		}
		const center = canvas.toContent({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});
		await canvas.selectAt(center);

		// The default is Yellow (#fef9c3); switch to the Blue (#bfdbfe) swatch.
		expect(await stickyFill(canvas, id)).toBe("#fef9c3");

		await canvas.openObjectMenu("sticky-color");
		await canvas.page.click(selectors.objectMenuSet("fill", "#bfdbfe"));
		await expect
			.poll(() => stickyFill(canvas, id), {
				message: "picking a preset changes the body fill",
			})
			.toBe("#bfdbfe");

		// Kept across deselect -> reselect.
		await canvas.deselect();
		await canvas.selectAt(center);
		expect(await stickyFill(canvas, id)).toBe("#bfdbfe");
	});
});
