import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Non-regression for snapping.
 *
 * In the default viewport (zoom=1, no panning) screen coordinates are SVG
 * coordinates and the snap threshold is 8 (SNAP_THRESHOLD_PX). The transform's
 * e,f are the shape's center, so the alignment result is read straight off the
 * transform.
 *
 * The snap candidates are each shape's left/right/hCenter (X axis) and
 * top/bottom/vCenter (Y axis). The moving shape offers its own left/center/right
 * and top/center/bottom, and after the snap a blue dashed guide appears on the
 * axis where an edge met a candidate (snap-guide:x = a vertical line,
 * snap-guide:y = a horizontal one). To isolate a center snap from an edge snap,
 * the other shape and the moving shape are deliberately given different widths
 * and heights; at equal sizes another edge would align at the same time and the
 * test would no longer check the intended snap on its own.
 */

// A: 200 x 100 centered at (500, 200). left=400 right=600 top=150 bottom=250 centerX=500 centerY=200
const drawWideA = (canvas: CanvasDriver) =>
	canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });

test.describe("center snapping (X axis, vertical guide)", () => {
	test("center to center: snaps the moving shape's center onto the other's center X and shows a vertical guide", async ({
		canvas,
	}) => {
		await drawWideA(canvas);
		// B: 100 x 100 centered at (400, 450)
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 350, y: 400 },
			{ x: 450, y: 500 },
		);
		await canvas.deselect();

		// B's center (400,450) -> (497,450): center X 497 is within the threshold of A's center X 500 (distance 3).
		// The widths differ, so B's left/right (447/547) hit no candidate and only the centers align.
		await canvas.dragInspecting(
			{ x: 400, y: 450 },
			{ x: 497, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				await expect(canvas.snapGuides("y")).toHaveCount(0);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([500]);
			},
		);

		// After release B's center X snaps to 500 while Y stays 450
		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 500, 450)");
	});

	test("center to edge: snaps the moving shape's center onto the other's left edge", async ({
		canvas,
	}) => {
		await drawWideA(canvas); // A's left = 400
		// B: 100 x 100 centered at (300, 450)
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 250, y: 400 },
			{ x: 350, y: 500 },
		);
		await canvas.deselect();

		// B's center (300,450) -> (403,450): center X 403 is within the threshold of A's left=400 (distance 3).
		await canvas.dragInspecting(
			{ x: 300, y: 450 },
			{ x: 403, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([400]);
			},
		);

		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 400, 450)");
	});

	test("does not snap while Ctrl is held, showing no guide and moving nothing", async ({
		canvas,
	}) => {
		await drawWideA(canvas);
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 350, y: 400 },
			{ x: 450, y: 500 },
		);
		await canvas.deselect();

		// The same center-to-center gesture with Ctrl held keeps the raw position (497)
		await canvas.dragInspecting(
			{ x: 400, y: 450 },
			{ x: 497, y: 450 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(0);
			},
			{ ctrl: true },
		);

		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 497, 450)");
	});
});

test.describe("center snapping (Y axis, horizontal guide)", () => {
	test("center to center: snaps the moving shape's center onto the other's center Y and shows a horizontal guide", async ({
		canvas,
	}) => {
		await drawWideA(canvas); // A's center Y = 200
		// B: 100 x 50 centered at (200, 300). X is kept well away from A's (400/500/600) so nothing aligns horizontally
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 150, y: 275 },
			{ x: 250, y: 325 },
		);
		await canvas.deselect();

		// B's center (200,300) -> (200,203): center Y 203 is within the threshold of A's center Y 200 (distance 3).
		// The heights differ, so B's top/bottom (178/228) hit no candidate and only the centers align.
		await canvas.dragInspecting(
			{ x: 200, y: 300 },
			{ x: 200, y: 203 },
			async () => {
				await expect(canvas.snapGuides("y")).toHaveCount(1);
				await expect(canvas.snapGuides("x")).toHaveCount(0);
				expect(await canvas.snapGuideCoordinates("y")).toEqual([200]);
			},
		);

		// After release B's center Y snaps to 200 while X stays 200
		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 200, 200)");
	});

	test("center to edge: snaps the moving shape's center onto the other's top edge", async ({
		canvas,
	}) => {
		await drawWideA(canvas); // A's top = 150
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 150, y: 275 },
			{ x: 250, y: 325 },
		);
		await canvas.deselect();

		// B's center (200,300) -> (200,153): center Y 153 is within the threshold of A's top=150 (distance 3).
		await canvas.dragInspecting(
			{ x: 200, y: 300 },
			{ x: 200, y: 153 },
			async () => {
				await expect(canvas.snapGuides("y")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("y")).toEqual([150]);
			},
		);

		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 200, 150)");
	});
});

/**
 * Corner (vertex) snapping: the moving shape's corner sticks to the other's
 * corner. A corner needs an X edge (left/right) and a Y edge (top/bottom) to
 * snap at once, so one vertical and one horizontal guide appear together.
 * A and B are given different sizes so that only the intended edge lands on
 * each axis.
 */
test.describe("corner (vertex) snapping", () => {
	test("snaps B's top left corner onto A's bottom right corner with one vertical and one horizontal guide", async ({
		canvas,
	}) => {
		// A: 200 x 100 centered at (400,300). right=500 bottom=350
		await canvas.drawShape("Rectangle", { x: 300, y: 250 }, { x: 500, y: 350 });
		// B: 100 x 100 centered at (650,500)
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 600, y: 450 },
			{ x: 700, y: 550 },
		);
		await canvas.deselect();

		// B's center (650,500) -> (553,403): B left=503 to A right=500, B top=353 to A bottom=350, each 3 away.
		// The size difference keeps the other edges off every candidate.
		await canvas.dragInspecting(
			{ x: 650, y: 500 },
			{ x: 553, y: 403 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				await expect(canvas.snapGuides("y")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([500]);
				expect(await canvas.snapGuideCoordinates("y")).toEqual([350]);
			},
		);

		// After release B's top left corner (left,top)=(500,350), so its center is (550,400)
		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 550, 400)");
	});

	test("snaps B's bottom right corner onto A's top left corner with one vertical and one horizontal guide", async ({
		canvas,
	}) => {
		// A: 200 x 100 centered at (400,300). left=300 top=250
		await canvas.drawShape("Rectangle", { x: 300, y: 250 }, { x: 500, y: 350 });
		// B: 100 x 100 centered at (150,120)
		const bId = await canvas.drawShape(
			"Rectangle",
			{ x: 100, y: 70 },
			{ x: 200, y: 170 },
		);
		await canvas.deselect();

		// B's center (150,120) -> (253,203): B right=303 to A left=300, B bottom=253 to A top=250, each 3 away.
		await canvas.dragInspecting(
			{ x: 150, y: 120 },
			{ x: 253, y: 203 },
			async () => {
				await expect(canvas.snapGuides("x")).toHaveCount(1);
				await expect(canvas.snapGuides("y")).toHaveCount(1);
				expect(await canvas.snapGuideCoordinates("x")).toEqual([300]);
				expect(await canvas.snapGuideCoordinates("y")).toEqual([250]);
			},
		);

		// After release B's bottom right corner (right,bottom)=(300,250), so its center is (250,200)
		await expect
			.poll(async () => {
				const b = (await canvas.captureObjects()).find((o) => o.id === bId);
				return b?.transform;
			})
			.toBe("matrix(1, 0, 0, 1, 250, 200)");
	});
});
