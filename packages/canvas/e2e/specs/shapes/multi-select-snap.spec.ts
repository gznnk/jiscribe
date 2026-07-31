import { test, expect } from "../../fixtures";

/**
 * Snapping while a multi-selection is moved as a whole.
 *
 * snap.spec covers move snapping for a single shape. Moving a multi-selection
 * instead offers the edges and center of the whole selection's bounding box as
 * snap candidates (through the group bbox). The rect handed to snapping differs
 * from the single-shape one, so it is a separate path, and breaking it means
 * bulk moves stop snapping. Guarded by the blue guide during the drag and by the
 * center coordinates settled after release.
 *
 * In the default viewport (zoom=1) screen coordinates are SVG coordinates, and
 * the snap threshold is 8 (SNAP_THRESHOLD_PX).
 */

/** Returns the center X (e) of transform="matrix(a,b,c,d,e,f)". */
function centerXOf(transform: string | null): number {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`cannot parse the transform: ${transform}`);
	}
	return nums[4];
}

test.describe("snapping when a multi-selection moves as a whole", () => {
	test("snaps the selection's right edge onto the other shape's right edge", async ({
		canvas,
	}) => {
		// Reference A: centered at (500,200) with its right edge at x=600 (the snap target).
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();

		// B and C (120 wide each) stacked vertically, both left=300 right=420.
		// The group bbox's right edge is 420. Their center and left edge sit away from
		// A's candidates (400/500/600), so only the right-to-right snap can fire.
		const b = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 450 },
			{ x: 420, y: 520 },
		);
		await canvas.deselect();
		const c = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 540 },
			{ x: 420, y: 610 },
		);
		await canvas.deselect();

		// Select B and C with a marquee.
		await canvas.drag({ x: 280, y: 430 }, { x: 440, y: 630 }, 12);

		// Move the group right so its right edge (420) approaches A's right edge (600).
		// B's center 360 -> 537 (+177) puts the group's right edge at about 597, 3 away and within the threshold.
		await canvas.dragInspecting(
			{ x: 360, y: 485 },
			{ x: 537, y: 485 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([600]);
			},
		);

		// After release the group's right edge snaps to 600, so B and C have center X 540 (600 minus the half width 60).
		// Without the snap it would sit near 537.
		await expect
			.poll(async () => {
				const obj = (await canvas.captureObjects()).find((o) => o.id === b);
				return centerXOf(obj?.transform ?? null);
			})
			.toBe(540);
		const cObj = (await canvas.captureObjects()).find((o) => o.id === c);
		expect(centerXOf(cObj?.transform ?? null)).toBe(540);
	});
});
