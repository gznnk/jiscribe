import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/** The icon category put on the toolbar (azureStencilCategory.id). */
const CATEGORY = "azure";

/** Virtual Machines' preset id: `azureIcon` with the icon name in PascalCase after it. */
const VM_PRESET = "azureIconVirtualMachine";

test.describe("drawing an azureIcon", () => {
	test("placing one from the palette gives a <g> labelled with the product name", async ({
		canvas,
	}) => {
		// azureIcon is supportsBounds: false, so a click alone places it.
		const id = await canvas.placeShapeFromFlyout(CATEGORY, VM_PRESET);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		expect(created?.tag).toBe("g");

		await expect
			.poll(async () => (await canvas.drawnTextRuns(id)).map((run) => run.text))
			.toContain("Virtual Machines");
	});

	test("the placed icon draws its picture, gradients included", async ({
		canvas,
	}) => {
		const id = await canvas.placeShapeFromFlyout(CATEGORY, VM_PRESET);

		const shape = canvas.objectById(id);
		await expect(shape.locator("path").first()).toBeAttached();
		await expect(shape.locator("linearGradient").first()).toBeAttached();
	});
});
