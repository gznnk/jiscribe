import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

test.describe("icon drawing", () => {
	test("places Icon with a click and creates a g element", async ({
		canvas,
	}) => {
		// Icon is a place-on-click type (supportsBounds: false)
		const id = await canvas.placeShape("Icon");
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		// The Icon root is <g data-kind="object">
		expect(created?.tag).toBe("g");
	});

	test("draws the line art of the default icon inside the placed shape", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Icon");

		// The default icon ("star") is a single path; the art group holds it, and the
		// grab area underneath is a rect covering the box.
		const shape = canvas.objectById(id);
		await expect(shape.locator("path")).toHaveCount(1);
		await expect(shape.locator("rect")).toHaveCount(1);
	});

	test("scales the art uniformly, so the icon is never stretched", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Icon");

		// One scale factor, not two: a `scale(a b)` here would mean a stretched icon.
		const transform = await canvas
			.objectById(id)
			.locator("g[transform]")
			.first()
			.getAttribute("transform");
		expect(transform).toMatch(/scale\((\d|\.)+\)/);
	});
});
