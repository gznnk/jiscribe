import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Styling a stretch of a Sticky's body rather than the whole slot.
 *
 * Sticky draws its own group instead of going through createFrameObject, so it
 * reads its slot itself and hands the overlay the text: reading it in the plain
 * form flattens the runs away, and the styling disappears on commit while staying
 * in the saved document. Core's counterpart is
 * packages/canvas/e2e/specs/ui/text-range-style.spec.ts.
 */
test.describe("Sticky per-range text styling", () => {
	test("keeps a bolded stretch of the body after the commit", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Sticky");
		const box = await canvas.objectById(id).boundingBox();
		if (!box) {
			throw new Error("cannot get the boundingBox of the Sticky");
		}
		const center = canvas.toContent({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});

		await canvas.typeTextAt(center, "Payment failed");

		// Select the leading "Payment".
		await canvas.page.keyboard.press("Home");
		for (let i = 0; i < "Payment".length; i++) {
			await canvas.page.keyboard.press("Shift+ArrowRight");
		}
		await canvas.page.keyboard.press("ControlOrMeta+b");

		// The editor draws the runs itself while it is open.
		await expect
			.poll(() => canvas.drawnTextRuns(id), {
				message: "bold applies to the selected stretch alone",
			})
			.toEqual([
				expect.objectContaining({ text: "Payment", fontWeight: "700" }),
				expect.objectContaining({ text: " failed", fontWeight: "400" }),
			]);

		// Committing hands the drawing back to the Sticky's own overlay.
		await canvas.commitText();
		expect(await canvas.drawnTextRuns(id)).toEqual([
			expect.objectContaining({ text: "Payment", fontWeight: "700" }),
			expect.objectContaining({ text: " failed", fontWeight: "400" }),
		]);
	});
});
