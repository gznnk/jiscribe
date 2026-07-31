import { test, expect } from "../../fixtures";

/**
 * Guards that duplicate (Ctrl+D) carries the contents over.
 *
 * The existing clipboard / duplicate-paste-offset specs guard "the count grows"
 * and "the position shifts by +20", but not that the duplicate inherits the
 * original's style (background color) and text. Duplicate is a deep copy of the
 * state plus fresh IDs, so a missed field, where only the color or only the text
 * drops, is easy to introduce in a refactor and hard to notice because the
 * screen still looks right. Guarded through observable results: the computed
 * fill matches on both shapes, and the text ends up rendered twice.
 */
test.describe("duplicate carries the contents over", () => {
	test("carries the background color over on duplicate", async ({ canvas }) => {
		const srcId = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const customFill = await canvas.normalizeColor("#22c55e");
		await canvas.setColor("bg-color", "#22c55e");
		await expect
			.poll(() => canvas.computedColor(srcId, "fill"))
			.toBe(customFill);

		// Hand focus back from the color input to the canvas; if the input takes
		// Ctrl+D nothing is duplicated. Clicking the shape again keeps the
		// selection and returns focus to the canvas.
		await canvas.selectAt({ x: 500, y: 260 });

		await canvas.duplicate();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);

		const objects = await canvas.captureObjects();
		const cloned = objects.find((obj) => obj.id !== srcId);
		expect(cloned?.id).toBeTruthy();
		expect(await canvas.computedColor(srcId, "fill")).toBe(customFill);
		expect(await canvas.computedColor(cloned!.id!, "fill")).toBe(customFill);
	});

	test("carries the text over on duplicate", async ({ canvas }) => {
		const text = "Duplicate Me";
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });
		await canvas.deselect();

		await canvas.typeTextAt({ x: 500, y: 260 }, text);
		await canvas.commitText();
		await expect(canvas.page.locator("body")).toContainText(text);

		await canvas.selectAt({ x: 500, y: 260 });
		await canvas.duplicate();
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
				{ message: "the text appears in two places after duplicating" },
			)
			.toBe(2);
	});
});
