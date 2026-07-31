import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Ungrouping a group that has been moved: the move is baked into the members' world
 * coordinates, the positions hold after ungrouping, and the members move individually
 * from then on.
 *
 * group.spec covers "move a group" and "ungroup without moving -> move individually",
 * but the path where the group transform is baked into the members on "move ->
 * ungroup" had no coverage.
 */

/** Draws two rectangles and marquee-groups them (A center 370,260 / B center 630,260) */
async function groupTwoRects(
	canvas: CanvasDriver,
): Promise<{ a: string; b: string }> {
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

	await canvas.drag({ x: 260, y: 160 }, { x: 740, y: 360 }, 12);
	await canvas.group();
	return { a, b };
}

test("keeps the positions when a moved group is ungrouped and moves the members individually afterwards", async ({
	canvas,
}) => {
	const { a, b } = await groupTwoRects(canvas);

	// Move the whole group by +100,+40.
	await canvas.deselect();
	await canvas.selectAt({ x: 370, y: 260 });
	await canvas.drag({ x: 370, y: 260 }, { x: 470, y: 300 });
	await expect
		.poll(() => canvas.objectById(a).getAttribute("transform"))
		.toBe("matrix(1, 0, 0, 1, 470, 300)");
	expect(await canvas.objectById(b).getAttribute("transform")).toBe(
		"matrix(1, 0, 0, 1, 730, 300)",
	);

	// Ungrouping bakes the moved world coordinates into the members, so they hold.
	await canvas.ungroup();
	expect(await canvas.objectById(a).getAttribute("transform")).toBe(
		"matrix(1, 0, 0, 1, 470, 300)",
	);
	expect(await canvas.objectById(b).getAttribute("transform")).toBe(
		"matrix(1, 0, 0, 1, 730, 300)",
	);

	// After ungrouping they move individually (moving A leaves B put).
	await canvas.deselect();
	await canvas.selectAt({ x: 470, y: 300 });
	await canvas.drag({ x: 470, y: 300 }, { x: 570, y: 300 });
	await expect
		.poll(() => canvas.objectById(a).getAttribute("transform"))
		.toBe("matrix(1, 0, 0, 1, 570, 300)");
	expect(await canvas.objectById(b).getAttribute("transform")).toBe(
		"matrix(1, 0, 0, 1, 730, 300)",
	);
});
