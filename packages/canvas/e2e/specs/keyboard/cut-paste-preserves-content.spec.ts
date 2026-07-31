import { test, expect } from "../../fixtures";

/**
 * Guards that cut-paste (Ctrl+X then Ctrl+V) carries the contents over.
 *
 * clipboard.spec guards "Ctrl+X removes it, Ctrl+V brings it back" by object
 * count only, and does not check that the restored shape kept its style and
 * text. CutCommand is copy plus delete and involves clipboard serialization, so
 * content can be lost there independently of copy-paste. Guarded by: the cut
 * removes the original, and the paste brings exactly one back with its
 * background color and text.
 */
test.describe("cut-paste carries the contents over", () => {
	test("brings the background color back on cut then paste", async ({
		canvas,
	}) => {
		const srcId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const customFill = await canvas.normalizeColor("#0ea5e9");
		await canvas.setColor("bg-color", "#0ea5e9");
		await expect
			.poll(() => canvas.computedColor(srcId, "fill"))
			.toBe(customFill);

		// Hand focus back from the color input to the canvas before cutting.
		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.cut();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "the cut removes the original shape",
			})
			.toBe(0);

		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "the paste brings one shape back",
			})
			.toBe(1);

		const pasted = (await canvas.captureObjects())[0];
		expect(await canvas.computedColor(pasted.id!, "fill")).toBe(customFill);
	});

	test("brings the text back on cut then paste", async ({ canvas }) => {
		const text = "Cut Me";
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, text);
		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText(text);

		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.cut();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
		await expect(canvas.page.locator("body")).not.toContainText(text);

		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		await expect(canvas.page.locator("body")).toContainText(text);
	});
});
