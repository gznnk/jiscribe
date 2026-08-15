import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

test.describe("markdown drawing", () => {
	test("creates a rect element carrying the default Markdown body for Markdown", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Markdown",
			{ x: 400, y: 200 },
			{ x: 700, y: 400 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		// The markdown shape draws its card body as a rect; only the body text is Markdown-rendered
		expect(created?.tag).toBe("rect");
		// The default text renders (checked through textContent because innerHTML is escaped)
		await expect
			.poll(() => canvas.page.evaluate(() => document.body.textContent ?? ""))
			.toContain("Title");
	});
});
