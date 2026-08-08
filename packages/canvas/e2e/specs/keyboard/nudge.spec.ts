import { test, expect } from "../../fixtures";

/**
 * Arrow-key nudge: 1px normally, 10px with Shift.
 * At the default viewport (zoom=1) the movement lands directly on the e,f of
 * the transform.
 */
test.describe("keyboard: nudge", () => {
	test("moves by 1px on an arrow key", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// Center is (500, 260).
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		await canvas.nudge("right");
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 501, 260)");

		await canvas.nudge("down");
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 501, 261)");
	});

	test("moves by 10px on Shift+arrow", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.nudge("left", { large: true });
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 490, 260)");

		await canvas.nudge("up", { large: true });
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"))
			.toBe("matrix(1, 0, 0, 1, 490, 250)");
	});

	test("reverts consecutive nudges on one selection with a single undo and reapplies them on redo", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		// Center is (500, 260).
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		// Nudge right 5 times without changing the selection (+5px in total).
		// historyCoalesce folds them into a single entry.
		for (let i = 0; i < 5; i++) {
			await canvas.nudge("right");
		}
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "5 nudges move it by +5px",
			})
			.toBe("matrix(1, 0, 0, 1, 505, 260)");

		// One undo reverts all 5px, not 1px at a time, which is what coalescing buys.
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "one undo reverts the consecutive nudges together",
			})
			.toBe("matrix(1, 0, 0, 1, 500, 260)");

		await canvas.redo();
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "one redo reapplies the consecutive nudges together",
			})
			.toBe("matrix(1, 0, 0, 1, 505, 260)");
	});
});
