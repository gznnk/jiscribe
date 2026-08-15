import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * The `svgDefs` seam (ObjectSvgDefsRegistry): a registered type's shared SVG
 * resources reach the canvas-wide `<defs>`, and its instances resolve against
 * them. Sticky is the only shipped shape using it — the blur filter its body
 * references. Guarded here rather than in a unit test because a broken wiring
 * (registry not provided, `<defs>` not rendered) still leaves the sticky
 * visible, just unfiltered, so the shape-level specs stay green.
 */
test.describe("sticky svgDefs", () => {
	test("renders the blur filter the sticky body references", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Sticky");

		// The contribution renders once per canvas, in the single <defs>.
		await expect(canvas.page.locator("defs > #sticky-blur")).toHaveCount(1);

		const filterRef = await canvas
			.objectById(id)
			.locator("[filter]")
			.first()
			.getAttribute("filter");
		expect(filterRef).toBe("url(#sticky-blur)");
	});
});
