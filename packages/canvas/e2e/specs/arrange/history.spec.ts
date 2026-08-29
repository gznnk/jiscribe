import { test, expect } from "../../fixtures";

/**
 * Undo / redo history integrity.
 *
 * The existing undo tests were limited to delete (selection), resize
 * (driver-transform) and connector creation (connector-undo-redo). Here each
 * representative edit - draw, move, color change - must roll back with one undo and be
 * reapplied by redo, and a history of several operations must unwind / replay in the
 * right order (last in, first out).
 *
 * Stack order and entry granularity break easily under refactors without crashing, so
 * they are verified through invariants (shape count, transform, color).
 */
test.describe("undo / redo history integrity", () => {
	test("removes a drawn shape on undo and brings back the same id and position on redo", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const transform = await canvas.objectById(id).getAttribute("transform");

		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "undo removes the drawn shape",
			})
			.toBe(0);

		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "redo brings the shape back",
			})
			.toBe(1);
		// Restored with the same id and position
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			transform,
		);
	});

	test("restores the original position of a move on undo and reapplies it on redo", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// Selected right after drawing. Drag the center (500,260) to (560,300) (+60,+40)
		await canvas.drag({ x: 500, y: 260 }, { x: 560, y: 300 });
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 560, 300)");

		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "undo restores the original position",
			})
			.toBe("matrix(1, 0, 0, 1, 500, 260)");

		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "redo reapplies the move",
			})
			.toBe("matrix(1, 0, 0, 1, 560, 300)");
	});

	test("restores the original color on undo and reapplies the color change on redo", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const originalFill = await canvas.computedColor(id, "fill");
		const newFill = await canvas.normalizeColor("#6366f1");
		expect(originalFill).not.toBe(newFill);

		await canvas.setColor("bg-color", "#6366f1");
		await expect.poll(() => canvas.computedColor(id, "fill")).toBe(newFill);

		await canvas.undo();
		await expect
			.poll(() => canvas.computedColor(id, "fill"), {
				message: "undo restores the original color",
			})
			.toBe(originalFill);

		await canvas.redo();
		await expect
			.poll(() => canvas.computedColor(id, "fill"), {
				message: "redo reapplies the color change",
			})
			.toBe(newFill);
	});

	test("unwinds several operations last in first out and restores them in order on redo", async ({
		canvas,
	}) => {
		// Operation 1: draw A
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 440, y: 320 },
		);
		await canvas.deselect();
		// Operation 2: draw B
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 700, y: 320 },
		);
		// Operation 3: move B (center 630,260 -> 700,300, +70,+40)
		await canvas.drag({ x: 630, y: 260 }, { x: 700, y: 300 });
		await expect
			.poll(() => canvas.objectById(b).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 700, 300)");

		// undo 1: only B's move is rolled back (still 2 shapes, B back where it was)
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(b).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 630, 260)");
		expect(await canvas.captureObjects()).toHaveLength(2);

		// undo 2: drawing B is rolled back (only A is left)
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		expect(await canvas.objectById(a).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 370, 260)",
		);

		// undo 3: drawing A is rolled back (nothing is left)
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);

		// redo restores them in the same order
		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
		await canvas.redo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(2);
		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(b).getAttribute("transform"), {
				message: "the last redo restores B's move as well",
			})
			.toBe("matrix(1, 0, 0, 1, 700, 300)");
	});
});
