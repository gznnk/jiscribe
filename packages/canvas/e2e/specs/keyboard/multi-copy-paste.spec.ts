import { test, expect } from "../../fixtures";

/**
 * Guards that copy-pasting a multi-selection keeps the relative placement.
 *
 * clipboard.spec guards single-shape copy-paste by object count only; whether
 * the shapes keep their positions relative to each other when copy-pasted
 * together was uncovered. Cloning several shapes (cloneObjects plus a uniform
 * offset) is prone to a regression that shifts each shape separately and breaks
 * the relative placement. Guarded through transform: both pasted shapes sit
 * +20,+20 from their source and the original 260px gap is kept.
 */
test.describe("multi-selection copy-paste", () => {
	test("keeps the relative placement and offsets by +20,+20 when two shapes are copy-pasted together", async ({
		canvas,
	}) => {
		// A: center (370,260) / B: center (630,260), 260px apart horizontally.
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		await canvas.deselect();

		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "copy-paste adds two shapes, for four in total",
			})
			.toBe(4);

		expect(await canvas.objectById(a).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 370, 260)",
		);
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 260)",
		);

		// The two pasted shapes sit +20,+20 from A and B, keeping the 260px gap.
		const pastedTransforms = (await canvas.captureObjects())
			.filter((obj) => obj.id !== a && obj.id !== b)
			.map((obj) => obj.transform)
			.sort();
		expect(pastedTransforms).toEqual([
			"matrix(1, 0, 0, 1, 390, 280)",
			"matrix(1, 0, 0, 1, 650, 280)",
		]);
	});
});
