import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

test.describe("icon drawing", () => {
	test("places Icon with a click and creates a g element", async ({
		canvas,
	}) => {
		// Icon is a place-on-click type (supportsBounds: false)
		const id = await canvas.placeShapeFromFlyout("icon", "lucideIconUser");
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		// The Icon root is <g data-kind="object">
		expect(created?.tag).toBe("g");
	});

	test("draws the line art of the icon it was placed with", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout("icon", "lucideIconUser");

		// "user" is drawn as a path and a circle; the art group holds both, and the grab
		// area underneath is the one rect covering the box.
		const shape = canvas.objectById(id);
		await expect(shape.locator("path")).toHaveCount(1);
		await expect(shape.locator("circle")).toHaveCount(1);
		await expect(shape.locator("rect")).toHaveCount(1);
	});

	test("scales the art uniformly, so the icon is never stretched", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout("icon", "lucideIconUser");

		// One scale factor, not two: a `scale(a b)` here would mean a stretched icon.
		const transform = await canvas
			.objectById(id)
			.locator("g[transform]")
			.first()
			.getAttribute("transform");
		expect(transform).toMatch(/scale\((\d|\.)+\)/);
	});
});

test.describe("icon aspect ratio", () => {
	test("stays square when a corner is dragged", async ({ canvas }) => {
		const id = await canvas.placeShapeFromFlyout("icon", "lucideIconUser");
		const box = () => canvas.objectById(id).boundingBox();
		const before = await box();
		if (before === null) {
			throw new Error("the icon is not laid out");
		}

		// Pulled far wider than it is taller. The drawing is square whatever the box, so
		// the lock is what keeps a resize from leaving dead margin beside it.
		await canvas.dragTransformHandle("bottomRight", {
			x: before.x + before.width * 3,
			y: before.y + before.height * 1.2,
		});

		const after = await box();
		expect(after?.width).toBeGreaterThan(before.width);
		expect(Math.round(after?.width ?? 0)).toBe(Math.round(after?.height ?? 0));
	});
});
