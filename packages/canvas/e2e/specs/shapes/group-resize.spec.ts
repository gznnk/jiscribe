import { test, expect } from "../../fixtures";

/**
 * Multi-select resize.
 *
 * Single shapes are covered by resize / rotated-resize / driver-transform.
 * Resizing a multi-selection instead scales every child against the bounding box
 * of the whole selection (calcMultiSelectGroupBounds), which moves each child's
 * center proportionally as well as its size. That invites regressions where
 * (1) children keep their size and only move, (2) only some children scale, or
 * (3) the history splits so one undo does not restore everything. Guarded by
 * "both grow and the outer child opens further out" and "one undo restores both".
 */

/** Returns the center X (e) of transform="matrix(a,b,c,d,e,f)". */
function centerXOf(transform: string | null): number {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`cannot parse the transform: ${transform}`);
	}
	return nums[4];
}

/** Returns the largest X in a "x1,y1 x2,y2 ..." points string. */
function maxXOf(points: string | null): number {
	if (!points) {
		throw new Error("the points attribute is missing");
	}
	return Math.max(
		...points
			.trim()
			.split(/\s+/)
			.map((pair) => Number(pair.split(",")[0])),
	);
}

test.describe("multi-select resize (proportional scaling)", () => {
	test("scales both shapes proportionally from a multi-select corner handle and restores both with one undo", async ({
		canvas,
	}) => {
		// Two rects side by side (160 x 100 each).
		// A centered at (300,210), B at (700,210). Group bbox: left=220 right=780 top=160 bottom=260.
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 220, y: 160 },
			{ x: 380, y: 260 },
		);
		await canvas.deselect();
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 620, y: 160 },
			{ x: 780, y: 260 },
		);
		await canvas.deselect();

		const aRect = canvas.objectById(a);
		const bRect = canvas.objectById(b);
		const aWidthBefore = Number(await aRect.getAttribute("width"));
		const bWidthBefore = Number(await bRect.getAttribute("width"));
		const aTransformBefore = await aRect.getAttribute("transform");
		const bTransformBefore = await bRect.getAttribute("transform");
		const bCenterXBefore = centerXOf(bTransformBefore);

		// Select both with a marquee (fully enclosing).
		await canvas.drag({ x: 180, y: 120 }, { x: 820, y: 300 }, 12);

		// Drag the group bbox's bottom-right corner (780,260) outward to grow it.
		// With the top-left (220,160) fixed, x grows 560 -> 820 and y grows 100 -> 200.
		await canvas.dragTransformHandle("bottomRight", { x: 1040, y: 360 });

		// Proportional scaling widens both, which rules out the move-only regression.
		await expect
			.poll(() => aRect.getAttribute("width").then(Number), {
				message: "A grows wider",
			})
			.toBeGreaterThan(aWidthBefore);
		expect(Number(await bRect.getAttribute("width"))).toBeGreaterThan(
			bWidthBefore,
		);

		// The outer (right) child opens further out: B's center X moves right.
		expect(centerXOf(await bRect.getAttribute("transform"))).toBeGreaterThan(
			bCenterXBefore,
		);

		// One undo restores size and position of both shapes (a single history entry).
		await canvas.undo();
		await expect
			.poll(() => aRect.getAttribute("transform"), {
				message: "one undo restores A's size and position",
			})
			.toBe(aTransformBefore);
		expect(await aRect.getAttribute("width")).toBe(String(aWidthBefore));
		expect(await bRect.getAttribute("transform")).toBe(bTransformBefore);
		expect(await bRect.getAttribute("width")).toBe(String(bWidthBefore));
	});

	test("scales the points of a polyline in a multi-select resize and restores them with one undo", async ({
		canvas,
	}) => {
		// Rect + polyline. The polyline takes a separate path: it scales through its points array, not its size.
		const rect = await canvas.drawShape(
			"Rectangle",
			{ x: 250, y: 200 },
			{ x: 380, y: 300 },
		);
		await canvas.deselect();
		const poly = await canvas.drawShape(
			"Polyline",
			{ x: 450, y: 200 },
			{ x: 700, y: 300 },
		);
		await canvas.deselect();

		const rectEl = canvas.objectById(rect);
		const polyEl = canvas.objectById(poly);
		const rectWidthBefore = Number(await rectEl.getAttribute("width"));
		const polyPointsBefore = await polyEl.getAttribute("points");
		const polyMaxXBefore = maxXOf(polyPointsBefore);

		// Select both with a marquee (bbox: left=250 top=200 right=700 bottom=300).
		await canvas.drag({ x: 210, y: 160 }, { x: 760, y: 340 }, 12);

		// Drag the bottom-right corner (700,300) outward to grow it.
		await canvas.dragTransformHandle("bottomRight", { x: 1000, y: 450 });

		// The polyline's points scale up, so its largest X extends right.
		await expect
			.poll(() => polyEl.getAttribute("points").then(maxXOf), {
				message: "the polyline's points scale up",
			})
			.toBeGreaterThan(polyMaxXBefore);
		// The rect grows along with it.
		expect(Number(await rectEl.getAttribute("width"))).toBeGreaterThan(
			rectWidthBefore,
		);

		// One undo restores the polyline's points (a single history entry).
		await canvas.undo();
		await expect
			.poll(() => polyEl.getAttribute("points"), {
				message: "one undo restores the polyline's points",
			})
			.toBe(polyPointsBefore);
		expect(Number(await rectEl.getAttribute("width"))).toBe(rectWidthBefore);
	});
});
