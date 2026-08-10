import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

test.describe("sticky drawing", () => {
	test("places Sticky with a click and creates a g element", async ({
		canvas,
	}) => {
		// Sticky is a place-on-click type
		const id = await canvas.placeShape("Sticky");
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		// The Sticky root is <g data-kind="object">
		expect(created?.tag).toBe("g");
	});
});
