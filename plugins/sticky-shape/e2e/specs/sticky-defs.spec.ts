import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * The `svgDefs` seam (ObjectSvgDefsRegistry): a registered type's shared SVG
 * resources reach the canvas-wide `<defs>`, and its instances resolve against
 * them. Sticky is the only shipped shape using it — the eight gradients its
 * shadow's soft edge is painted with. Guarded here rather than in a unit test
 * because a broken wiring (registry not provided, `<defs>` not rendered) still
 * leaves the sticky visible, just unshadowed, so the shape-level specs stay green.
 *
 * That the edge is gradients and not a blur filter is the point of #133: an SVG
 * filter rasterizes each note into its own surface on every zoom / pan / drag
 * frame, so the absence of one is checked here too.
 */
test.describe("sticky svgDefs", () => {
	test("renders the gradients the sticky shadow references", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Sticky");

		// The contribution renders once per canvas, in the single <defs>.
		await expect(
			canvas.page.locator('defs > [id^="sticky-shadow-"]'),
		).toHaveCount(8);

		// Every piece of the soft edge points at one of them, and nothing is filtered.
		const fills = await canvas
			.objectById(id)
			.locator("rect[fill^='url(']")
			.evaluateAll((rects) => rects.map((rect) => rect.getAttribute("fill")));
		expect(fills).toHaveLength(8);
		for (const fill of fills) {
			await expect(
				canvas.page.locator(`defs > ${(fill ?? "").slice(4, -1)}`),
			).toHaveCount(1);
		}
		await expect(canvas.objectById(id).locator("[filter]")).toHaveCount(0);
	});
});
