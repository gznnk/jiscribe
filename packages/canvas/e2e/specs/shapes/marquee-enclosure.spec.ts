import { test, expect } from "../../fixtures";

/**
 * Marquee enclosure rule.
 *
 * collectIdsInArea only selects objects whose bounding box is **fully contained**
 * in the rect; merely overlapping it is not enough. That boundary is easy to
 * regress into an intersection test, and when it does, shapes the user never
 * meant to enclose start moving or disappearing. Guarded through the result of a
 * bulk move.
 */
test.describe("marquee enclosure rule (full containment only)", () => {
	test("selects only shapes fully inside the marquee and skips ones sticking out", async ({
		canvas,
	}) => {
		// A: bbox x300-440 / B: bbox x560-700 (both y200-320)
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

		// Marquee (260,160)-(600,360): A is fully inside, B's right edge (700) sticks out past 600.
		await canvas.drag({ x: 260, y: 160 }, { x: 600, y: 360 }, 12);

		// Only A is selected: a 1px nudge to the right moves A alone and leaves B put.
		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "the fully contained A moves",
			})
			.toBe("matrix(1, 0, 0, 1, 371, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 630, 260)",
		);
	});

	test("selects both shapes when the marquee fully contains both", async ({
		canvas,
	}) => {
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

		// Marquee (260,160)-(740,360): both A and B are fully inside.
		await canvas.drag({ x: 260, y: 160 }, { x: 740, y: 360 }, 12);

		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 371, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 631, 260)",
		);
	});
});
