import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/** The icon category put on the toolbar (gcpStencilCategory.id). */
const CATEGORY = "gcp";

/** Compute Engine's preset id: `gcpIcon` with the icon name in PascalCase after it. */
const COMPUTE_ENGINE_PRESET = "gcpIconComputeEngine";

test.describe("drawing a gcpIcon", () => {
	test("placing one from the palette gives a <g> labelled with the product name", async ({
		canvas,
	}) => {
		// gcpIcon is supportsBounds: false, so a click alone places it.
		const id = await canvas.placeShapeFromFlyout(
			CATEGORY,
			COMPUTE_ENGINE_PRESET,
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("g");

		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).map((run) => run.text))
			.toContain("Compute Engine");
	});

	test("the placed icon draws its picture", async ({ canvas }) => {
		const id = await canvas.placeShapeFromFlyout(
			CATEGORY,
			COMPUTE_ENGINE_PRESET,
		);

		const shape = canvas.objectById(id);
		await expect(shape.locator("path").first()).toBeAttached();
	});
});
