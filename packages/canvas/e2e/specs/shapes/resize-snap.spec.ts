import { test, expect } from "../../fixtures";

/**
 * Non-regression for edge snapping during a resize.
 *
 * snap.spec guards snapping while a shape moves; snapping when an edge is
 * dragged by a resize handle (TransformControlHandler's snap path) is separate
 * code. The resize side folds the snap result into the final geometry, width and
 * center (the snapped value is taken into resizeResult), so breaking it shows up
 * as "the edge does not line up with the other shape". A snap survives in the
 * committed geometry, so the width and center X after release are enough; no
 * inspection of the guide during the drag is needed, which is less flaky.
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

test.describe("edge snapping during a resize", () => {
	test("snaps the right edge and settles the width when the right handle comes near the other shape's right edge", async ({
		canvas,
	}) => {
		// A: centered at (500,200), width 200, right = 600 (the snap target).
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();

		// B: placed below A. left=300, right=555, width 255, center X 427.5.
		// Its center X sits far from A's candidates (500/400/600), so no center snap
		// fires and only the right-to-right edge snap can.
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 400 },
			{ x: 555, y: 500 },
		);
		const bRect = canvas.objectById(bId);
		expect(await bRect.getAttribute("width")).toBe("255");

		// Pull B's right handle to x=596, 4 away from A's right=600 and inside the threshold of 8.
		// The left edge (300) is fixed, so snapping the right edge to 600 settles width=300 and center X=450.
		await canvas.dragTransformHandle("rightCenter", { x: 596, y: 450 });

		// The right edge snaps to 600 and the width becomes 300; without the snap it would be near 296.
		await expect
			.poll(() => bRect.getAttribute("width"), {
				message:
					"the right edge snaps to the other shape's right=600 and the width settles at 300",
			})
			.toBe("300");

		// Center X settles at 450, the midpoint of left=300 and right=600.
		const b = (await canvas.captureObjects()).find((o) => o.id === bId);
		expect(centerXOf(b?.transform ?? null)).toBeCloseTo(450, 1);
	});

	test("does not snap while Ctrl is held and settles the right edge at the drop position", async ({
		canvas,
	}) => {
		// Same layout: A's right=600 is the snap candidate.
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 400 },
			{ x: 555, y: 500 },
		);
		const bRect = canvas.objectById(bId);

		// Pull the right edge to x=596 with Ctrl held; snapping is off, so it does not reach 600.
		// Left edge (300) fixed and right edge left at 596 gives width ~= 296, not the snapped 300.
		await canvas.dragTransformHandle(
			"rightCenter",
			{ x: 596, y: 450 },
			{ ctrl: true },
		);

		await expect
			.poll(() => bRect.getAttribute("width").then(Number), {
				message:
					"with Ctrl held it does not snap, so the width does not reach 300",
			})
			.toBeLessThan(299);
		expect(Number(await bRect.getAttribute("width"))).toBeGreaterThan(293);
	});

	test("snaps the bottom edge and settles the height when the bottom handle reaches near the other shape's bottom edge", async ({
		canvas,
	}) => {
		// A: centered at (500,200), height 100, bottom = 250 (the snap target on the Y axis).
		await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
		await canvas.deselect();

		// B: placed below and left of A. top=160, bottom=210, height 50, center Y 185.
		// top (160) sits away from A's Y candidates (150/200/250), so only the bottom-to-bottom snap can fire.
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 250, y: 160 },
			{ x: 350, y: 210 },
		);
		const bRect = canvas.objectById(bId);
		expect(await bRect.getAttribute("height")).toBe("50");

		// Pull B's bottom handle to y=247, 3 away from A's bottom=250 and inside the threshold of 8.
		// The top edge (160) is fixed, so snapping the bottom edge to 250 settles height=90.
		await canvas.dragTransformHandle("bottomCenter", { x: 300, y: 247 });

		// The bottom edge snaps to 250 and the height becomes 90; without the snap it would be near 87.
		await expect
			.poll(() => bRect.getAttribute("height"), {
				message:
					"the bottom edge snaps to the other shape's bottom=250 and the height settles at 90",
			})
			.toBe("90");
	});
});
