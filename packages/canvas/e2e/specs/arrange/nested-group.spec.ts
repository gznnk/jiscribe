import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Nested groups (a group inside a group).
 *
 * group.spec guards moving and ungrouping a single-level group, but a group that is
 * itself grouped had no coverage. The points for nesting are: (1) GroupCommand can
 * create a new group that holds an existing group as a child, (2) clicking a leaf child
 * selects the topmost (root) group (the ancestors[0] path in determineSelection),
 * (3) moving the root moves the grandchildren too, (4) ungroup (Ctrl+Shift+G) peels off
 * only the root level and keeps the inner group. Unit tests
 * (autoSelectParentGroups / determineSelection) exist, but there was no regression
 * guard through the UI.
 */

/**
 * Builds a nested group: A and B into group1, then group1 and C into group2.
 * A center (280,210) / B center (480,210) / C center (680,210). Deselected on return.
 */
async function buildNestedGroup(
	canvas: CanvasDriver,
): Promise<{ a: string; b: string; c: string }> {
	const a = await canvas.drawShape(
		"Rectangle",
		{ x: 220, y: 160 },
		{ x: 340, y: 260 },
	);
	await canvas.deselect();
	const b = await canvas.drawShape(
		"Rectangle",
		{ x: 420, y: 160 },
		{ x: 540, y: 260 },
	);
	await canvas.deselect();

	// Marquee-select A and B and group them (group1).
	await canvas.drag({ x: 180, y: 120 }, { x: 580, y: 300 }, 12);
	await canvas.group();
	await canvas.deselect();

	const c = await canvas.drawShape(
		"Rectangle",
		{ x: 620, y: 160 },
		{ x: 740, y: 260 },
	);
	await canvas.deselect();

	// A marquee around A, B and C selects group1 (folding in A and B) plus C, nesting
	// them into group2 = { group1, C }.
	await canvas.drag({ x: 180, y: 120 }, { x: 780, y: 300 }, 12);
	await canvas.group();
	await canvas.deselect();

	return { a, b, c };
}

test.describe("nested group", () => {
	test("selects the root group when a grandchild is clicked and moves every member together on drag", async ({
		canvas,
	}) => {
		const { a, b, c } = await buildNestedGroup(canvas);

		// Clicking the grandchild A selects the root group2.
		await canvas.selectAt({ x: 280, y: 210 });
		// Drag the root by +100,+50; every nested member (A, B, C) should move by the
		// same amount.
		await canvas.drag({ x: 280, y: 210 }, { x: 380, y: 260 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "the grandchild A follows the root move",
			})
			.toBe("matrix(1, 0, 0, 1, 380, 260)");
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 580, 260)",
		);
		expect(await canvas.objectById(c).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 780, 260)",
		);
	});

	test("peels off only the root level on ungroup and keeps the inner group (A and B)", async ({
		canvas,
	}) => {
		const { a, b, c } = await buildNestedGroup(canvas);

		// Select the root group2 and ungroup it (Ctrl+Shift+G): group2 is gone and group1
		// and C become top level.
		await canvas.selectAt({ x: 280, y: 210 });
		await canvas.ungroup();
		await canvas.deselect();

		// Clicking A selects the inner group1 (it survives group2 being peeled off).
		// Dragging group1 by +100,+50 moves A and B together but leaves C put.
		await canvas.selectAt({ x: 280, y: 210 });
		await canvas.drag({ x: 280, y: 210 }, { x: 380, y: 260 });

		await expect
			.poll(() => canvas.objectById(a).getAttribute("transform"), {
				message: "A follows the move of group1",
			})
			.toBe("matrix(1, 0, 0, 1, 380, 260)");
		// B moves too, which shows group1 is intact.
		expect(await canvas.objectById(b).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 580, 260)",
		);
		// C is outside group1, so it does not move.
		expect(await canvas.objectById(c).getAttribute("transform")).toBe(
			"matrix(1, 0, 0, 1, 680, 210)",
		);
	});
});
