import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * e2e for dragging a connector label (issue #86).
 *
 * Grabbing and moving the label box itself
 * (foreignObject[data-kind=connector][data-part=label]) makes the drop point be
 * solved back into {position (arc-length ratio), offset (perpendicular
 * distance)} on the route and written back to label. Only the label box position
 * is readable from the DOM, so the correctness of that inversion is checked by
 * "the center of the grabbed label lands on the drop point". Dropping right
 * beside the line (within 8px) is the exception: offset snaps to 0, so the label
 * moves onto the line.
 *
 * Kept separate from label editing (connector-label.spec.ts).
 */

type Vec = { x: number; y: number };

/** Allowed gap between the drop point and the label center. */
const TOLERANCE_PX = 2;

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("cannot read the points attribute");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

/** Midpoint of the connector's first segment (always a point on the line). */
async function pointOnConnector(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
	expect(points.length).toBeGreaterThanOrEqual(2);
	return {
		x: (points[0].x + points[1].x) / 2,
		y: (points[0].y + points[1].y) / 2,
	};
}

/** Locator for the label box (the LabelBox div inside foreignObject). */
function labelBoxOf(canvas: CanvasDriver, connectorId: string) {
	return canvas.page
		.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
		.locator("div")
		.first();
}

/**
 * Creates a connector joining two rectangles, gives it a label, and returns it.
 * Routing is the default (orthogonal), so the route bends partway.
 */
async function setupConnectorWithLabel(
	canvas: CanvasDriver,
	text: string,
): Promise<{ connectorId: string; onLine: Vec }> {
	await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
	await canvas.deselect();

	await canvas.selectAt({ x: 400, y: 200 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 715,
		y: 350,
	});
	await canvas.deselect();

	const onLine = await pointOnConnector(canvas, connectorId);
	await canvas.typeTextAt(onLine, text);
	await canvas.commitText();
	return { connectorId, onLine };
}

/** Vertices of the rendered route (absolute coordinates, since zoom=1). */
async function connectorPoints(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec[]> {
	return parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
}

type Segment = { start: Vec; end: Vec };

/** Longest segment of the route; projection of its interior points is never clamped. */
function longestSegment(points: Vec[]): Segment {
	expect(points.length).toBeGreaterThanOrEqual(2);
	let longest: Segment = { start: points[0], end: points[1] };
	let longestLength = -1;
	for (let i = 0; i < points.length - 1; i++) {
		const length = Math.hypot(
			points[i + 1].x - points[i].x,
			points[i + 1].y - points[i].y,
		);
		if (length > longestLength) {
			longestLength = length;
			longest = { start: points[i], end: points[i + 1] };
		}
	}
	return longest;
}

/** Point at ratio t along the segment (0=start, 1=end). */
function segmentPointAt({ start, end }: Segment, t: number): Vec {
	return {
		x: start.x + (end.x - start.x) * t,
		y: start.y + (end.y - start.y) * t,
	};
}

/** Point outside the segment, distancePx past its end along its direction. */
function pointBeyondEnd(segment: Segment, distancePx: number): Vec {
	const length = Math.hypot(
		segment.end.x - segment.start.x,
		segment.end.y - segment.start.y,
	);
	return segmentPointAt(segment, 1 + distancePx / length);
}

/** Left normal of the segment's direction (unit vector). */
function leftNormal({ start, end }: Segment): Vec {
	const length = Math.hypot(end.x - start.x, end.y - start.y);
	return { x: -(end.y - start.y) / length, y: (end.x - start.x) / length };
}

function distance(a: Vec, b: Vec): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Center of the label box (content coordinates). */
async function labelCenter(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const box = await labelBoxOf(canvas, connectorId).boundingBox();
	if (!box) {
		throw new Error("cannot read the position of the label box");
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

async function expectLabelCenterNear(
	canvas: CanvasDriver,
	connectorId: string,
	expected: Vec,
): Promise<void> {
	await expect
		.poll(
			async () => distance(await labelCenter(canvas, connectorId), expected),
			{
				message: `the label center should land on ${JSON.stringify(expected)}`,
			},
		)
		.toBeLessThanOrEqual(TOLERANCE_PX);
}

/**
 * Grabs the center of the label box and drags it to `to`.
 * While selected, control handles overlap the label and steal pointerdown, so
 * the selection is cleared before grabbing (an unselected label can be dragged
 * directly).
 */
async function dragLabelTo(
	canvas: CanvasDriver,
	connectorId: string,
	to: Vec,
): Promise<void> {
	await canvas.deselect();
	const box = await labelBoxOf(canvas, connectorId).boundingBox();
	if (!box) {
		throw new Error("cannot read the position of the label box");
	}
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		10,
	);
}

test.describe("dragging a connector label", () => {
	test("moves the label to the drop point when dragged along the route", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.25);
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, dropPoint);
	});

	test("floats the label off to the side when dragged perpendicular to the line", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const onLine = segmentPointAt(segment, 0.5);
		const normal = leftNormal(segment);
		const dropPoint = {
			x: onLine.x + normal.x * 40,
			y: onLine.y + normal.y * 40,
		};
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, dropPoint);
		// Placed away from the line rather than on it (offset is in effect).
		expect(
			distance(await labelCenter(canvas, connectorId), onLine),
		).toBeGreaterThan(30);
	});

	test("snaps onto the line when dropped right beside it", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const onLine = segmentPointAt(segment, 0.4);
		const normal = leftNormal(segment);
		// Inside the snap threshold (SNAP_THRESHOLD_PX = 8; zoom=1, so it is world px
		// as-is).
		const dropPoint = {
			x: onLine.x + normal.x * 5,
			y: onLine.y + normal.y * 5,
		};
		await dragLabelTo(canvas, connectorId, dropPoint);

		// Sticks to the point on the line straight across, not to the drop point.
		await expectLabelCenterNear(canvas, connectorId, onLine);
	});

	test("returns to the original position with one Undo after one drag", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		const originalCenter = await labelCenter(canvas, connectorId);

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.2);
		await dragLabelTo(canvas, connectorId, dropPoint);
		await expectLabelCenterNear(canvas, connectorId, dropPoint);

		// Clear the selection first so no input keeps focus, then Undo.
		await canvas.deselect();
		await canvas.undo();
		await expectLabelCenterNear(canvas, connectorId, originalCenter);
	});

	test("keeps click-to-select and double-click-to-edit on the label working after a drag", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.3);
		await dragLabelTo(canvas, connectorId, dropPoint);
		await expectLabelCenterNear(canvas, connectorId, dropPoint);

		// A click selects (confirmed by the label style menu appearing).
		await canvas.deselect();
		await labelBoxOf(canvas, connectorId).click();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("label-bg-color")),
		).toBeVisible();

		// A double click edits the text.
		await canvas.deselect();
		await labelBoxOf(canvas, connectorId).dblclick();
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");
		await canvas.cancelText();
	});

	test("places the label on any segment even on the bent route of orthogonal routing (the default)", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		// The default routing has a bend point (no bend means the premise is broken).
		const points = await connectorPoints(canvas, connectorId);
		expect(points.length).toBeGreaterThanOrEqual(3);

		// Drop onto the midpoint of the first segment, which is not the longest one.
		const dropPoint = segmentPointAt({ start: points[0], end: points[1] }, 0.5);
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, dropPoint);
	});

	test("drags the label directly on an unselected connector, with the drag doubling as the selection", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		const sourceHandle = canvas.page.locator(
			`[data-id="${connectorId}"][data-part="endpoint:source"]`,
		);

		await canvas.deselect();
		await expect(sourceHandle).toHaveCount(0);

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.75);
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, dropPoint);
		// Endpoint handles present means the connector got selected.
		await expect(sourceHandle).toHaveCount(1);
	});

	test("stops at the end of the route when dragged past the end point", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const points = await connectorPoints(canvas, connectorId);
		const lastSegment: Segment = {
			start: points[points.length - 2],
			end: points[points.length - 1],
		};
		// Overshoot far along the extension of the route (perpendicular distance 0).
		// position is clamped to [0,1] so it stops at the end and offset stays 0. The
		// overshoot is kept close enough that the last segment is nearer than any
		// other segment.
		const dropPoint = pointBeyondEnd(lastSegment, 150);
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, lastSegment.end);
	});

	test("returns a position reverted by Undo to the post-drag position on Redo", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		const originalCenter = await labelCenter(canvas, connectorId);

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.8);
		await dragLabelTo(canvas, connectorId, dropPoint);
		await expectLabelCenterNear(canvas, connectorId, dropPoint);

		// Clear the selection first so no input keeps focus, then Undo / Redo.
		await canvas.deselect();
		await canvas.undo();
		await expectLabelCenterNear(canvas, connectorId, originalCenter);

		await canvas.redo();
		await expectLabelCenterNear(canvas, connectorId, dropPoint);
	});

	test("keeps the position when the text is re-edited after a drag", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		// Move it where neither position nor offset is the default.
		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const normal = leftNormal(segment);
		const onLine = segmentPointAt(segment, 0.3);
		const dropPoint = {
			x: onLine.x + normal.x * 40,
			y: onLine.y + normal.y * 40,
		};
		await dragLabelTo(canvas, connectorId, dropPoint);
		await expectLabelCenterNear(canvas, connectorId, dropPoint);

		// The controls of the selection overlap the label, so clear it before
		// re-editing.
		await canvas.deselect();
		const labelBox = labelBoxOf(canvas, connectorId);
		await labelBox.dblclick();
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");
		await canvas.textEditorSurface().fill("No");
		await canvas.commitText();

		await expect(labelBox).toContainText("No");
		await expectLabelCenterNear(canvas, connectorId, dropPoint);
	});

	test("returns to the creation-time position when dragged back to it", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		// The pre-drag center is the anchor at the double-click point that created
		// the label.
		const createdCenter = await labelCenter(canvas, connectorId);

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const normal = leftNormal(segment);
		const onLine = segmentPointAt(segment, 0.2);
		const awayPoint = {
			x: onLine.x + normal.x * 30,
			y: onLine.y + normal.y * 30,
		};
		await dragLabelTo(canvas, connectorId, awayPoint);
		await expectLabelCenterNear(canvas, connectorId, awayPoint);

		await dragLabelTo(canvas, connectorId, createdCenter);
		await expectLabelCenterNear(canvas, connectorId, createdCenter);
	});
});
