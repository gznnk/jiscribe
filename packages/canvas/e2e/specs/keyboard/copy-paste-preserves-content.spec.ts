import { test, expect } from "../../fixtures";

/**
 * Guards that copy-paste (Ctrl+C then Ctrl+V) carries the contents over.
 *
 * clipboard.spec only guards that pasting increases the object count.
 * Copy-paste takes a different path from duplicate (Ctrl+D): CopyCommand
 * serializes into ClipboardData and paste rebuilds from it, so style or text can
 * be lost during serialization even when duplicate is fine. Guarded through
 * observable results: the computed fill matches on source and paste, and the
 * text ends up rendered twice.
 */
test.describe("copy-paste carries the contents over", () => {
	test("carries the background color over on copy-paste", async ({
		canvas,
	}) => {
		const srcId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const customFill = await canvas.normalizeColor("#f59e0b");
		await canvas.setColor("bg-color", "#f59e0b");
		await expect
			.poll(() => canvas.computedColor(srcId, "fill"))
			.toBe(customFill);

		// Hand focus back from the color input to the canvas before copy-pasting;
		// focus in the input would steal Ctrl+C/V.
		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.copy();
		await canvas.paste();

		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		const objects = await canvas.captureObjects();
		const pasted = objects.find((obj) => obj.id !== srcId);
		expect(pasted?.id).toBeTruthy();
		expect(await canvas.computedColor(srcId, "fill")).toBe(customFill);
		expect(await canvas.computedColor(pasted!.id!, "fill")).toBe(customFill);
	});

	test("carries the text over on copy-paste", async ({ canvas }) => {
		const text = "Copy Me";
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, text);
		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText(text);

		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		await expect
			.poll(
				() =>
					canvas.page.evaluate((needle) => {
						const haystack = document.body.textContent ?? "";
						return haystack.split(needle).length - 1;
					}, text),
				{ message: "the text appears in two places after pasting" },
			)
			.toBe(2);
	});
});
