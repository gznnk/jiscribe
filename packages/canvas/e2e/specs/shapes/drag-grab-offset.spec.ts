import { test, expect } from "../../fixtures";

/**
 * Guards that dragging a shape by a point other than its center keeps the grab
 * offset: the shape moves by the cursor delta rather than jumping onto the cursor.
 *
 * The move test in draw.spec grabs the center (500,260), so its offset is 0 and
 * it cannot catch the regression where the grab point is ignored and the center
 * snaps onto the cursor. Here the grab carries an offset, and the transform's
 * e,f pin the center to the delta instead of the cursor's absolute position.
 *
 * zoom=1 with no other objects (no snap candidates), so the delta matches exactly.
 */
test.describe("grab offset kept while dragging", () => {
	test("moves the shape by the drag delta without jumping to the cursor when grabbed off-center", async ({
		canvas,
	}) => {
		// 200 x 120 rect centered at (500,260) (x:400-600, y:200-320).
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();
		expect(await canvas.objectById(id).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 500, 260)",
		);

		// Grab a point inside the shape offset (+60,+40) from the center, carry it to (700,500).
		// The cursor delta is (700-560, 500-300) = (+140,+200).
		const grab = { x: 560, y: 300 };
		const drop = { x: 700, y: 500 };
		await canvas.drag(grab, drop);

		// The center lands on the delta (640,460), not on the cursor's absolute (700,500).
		// The jump-to-cursor regression would give (700,500) and fail here.
		await expect
			.poll(() => canvas.objectById(id).getAttribute("transform"), {
				message: "the center moves by the delta to (640,460)",
			})
			.toBe("matrix(1, 0, 0, 1, 640, 460)");
	});
});
