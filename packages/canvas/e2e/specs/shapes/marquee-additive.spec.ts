import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Additive marquee selection.
 *
 * Holding Ctrl / Meta / Shift makes a marquee add to the selection instead of
 * replacing it: the press must not clear what is selected, and every frame of
 * the drag must fold the base selection back in. Both halves are easy to lose —
 * clearing on press leaves the base gone before the drag even starts — so they
 * are guarded through the result of a bulk nudge.
 */
test.describe("additive marquee (base selection plus the enclosed shapes)", () => {
	/** A: center (320,260) / B: center (540,260) / C: center (720,260). */
	const drawRow = async (canvas: CanvasDriver) => {
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 260, y: 200 },
			{ x: 380, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 480, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 660, y: 200 },
			{ x: 780, y: 320 },
		);
		await canvas.deselect();
		return { a, b, c };
	};

	test("keeps the clicked shape and adds the enclosed ones with Shift held", async ({
		canvas,
	}) => {
		const { a, b, c } = await drawRow(canvas);

		await canvas.selectAt({ x: 320, y: 260 });

		// Marquee (440,160)-(820,360) encloses B and C; A sits left of it.
		await canvas.page.keyboard.down("Shift");
		await canvas.drag({ x: 440, y: 160 }, { x: 820, y: 360 }, 12);
		await canvas.page.keyboard.up("Shift");

		// All three are selected: a 1px nudge moves every one of them.
		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "the base selection A moves too",
			})
			.toBe("matrix(1, 0, 0, 1, 321, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 541, 260)",
		);
		expect(await canvas.objectById(c).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 721, 260)",
		);
	});

	test("replaces the selection when no modifier is held", async ({
		canvas,
	}) => {
		const { a, b, c } = await drawRow(canvas);

		await canvas.selectAt({ x: 320, y: 260 });

		// The same marquee without a modifier: A drops out of the selection.
		await canvas.drag({ x: 440, y: 160 }, { x: 820, y: 360 }, 12);

		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(b).getAttribute("transform"), {
				message: "the enclosed B moves",
			})
			.toBe("matrix(1, 0, 0, 1, 541, 260)");
		expect(await canvas.objectById(c).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 721, 260)",
		);
		expect(await canvas.objectById(a).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 320, 260)",
		);
	});
});
