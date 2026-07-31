import { test, expect } from "../../fixtures";

/**
 * Additive selection via Ctrl/Meta+click.
 *
 * Multi-selection is the core "handle several shapes together without grouping
 * them" feature, but the existing tests only covered marquee selection
 * (basic-gestures) and grouping (group); adding to the selection with
 * Ctrl+click, and moving everything after a Ctrl+A select-all, were uncovered.
 * The selection model (the additive branch of determineSelection, and moving as
 * a unit through multiSelectGroup) is easy to break in a refactor, so it is
 * guarded through the observable "they move together" behavior.
 *
 * Additive selection is Ctrl/Meta+click; Shift is axis locking during a move and
 * is not used here. It goes through canvas.ctrlClickAt, which applies the
 * coordinate transform.
 */

test.describe("multi-selection (Ctrl+click / Ctrl+A)", () => {
	test("adds to the selection on Ctrl+click and moves them together", async ({
		canvas,
	}) => {
		// A: center (370,260), B: center (630,260)
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

		await canvas.selectAt({ x: 370, y: 260 });
		await canvas.ctrlClickAt({ x: 630, y: 260 });

		// Dragging A by (+50,+40) moves the additively selected B by the same amount.
		await canvas.drag({ x: 370, y: 260 }, { x: 420, y: 300 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A moves",
			})
			.toBe("matrix(1, 0, 0, 1, 420, 300)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 680, 300)",
		);
	});

	test("selects everything on Ctrl+A and moves them together", async ({
		canvas,
	}) => {
		// A: center (370,260), B: center (630,260)
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

		// After select-all, dragging A by (+50,+40) moves every shape by the same amount.
		await canvas.selectAll();
		await canvas.drag({ x: 370, y: 260 }, { x: 420, y: 300 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A moves",
			})
			.toBe("matrix(1, 0, 0, 1, 420, 300)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 680, 300)",
		);
	});

	test("drops an already selected shape on Ctrl+click (toggle off)", async ({
		canvas,
	}) => {
		// Three rects in a row. A center (300,260) / B center (550,260) / C center (800,260).
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 230, y: 200 },
			{ x: 370, y: 320 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 480, y: 200 },
			{ x: 620, y: 320 },
		);
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 730, y: 200 },
			{ x: 870, y: 320 },
		);
		await canvas.deselect();

		// Select all (A, B, C), then Ctrl+click to drop B from the selection.
		await canvas.selectAll();
		await canvas.ctrlClickAt({ x: 550, y: 260 });

		// Drag the remaining selection (A, C) from A by (+100,+50).
		await canvas.drag({ x: 300, y: 260 }, { x: 400, y: 310 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A moves",
			})
			.toBe("matrix(1, 0, 0, 1, 400, 310)");
		expect(await canvas.objectById(c).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 900, 310)",
		);
		// B was toggled off, so it stays put.
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 550, 260)",
		);
	});
});
