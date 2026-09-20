import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/** The frame category put on the toolbar (awsGroupStencilCategory.id). */
const CATEGORY = "aws-group";

const VPC_PRESET = "awsGroupVpc";

/**
 * An awsGroup passes its interior through (AwsGroupBody is `pointer-events: none`)
 * so the shapes it encloses stay selectable. That makes the DOM the wrong place to
 * ask what a connector is being dropped onto — the drop target is resolved
 * geometrically instead (findConnectableTargetAt), which is what keeps the middle
 * of a frame connectable.
 */
test.describe("connecting into an awsGroup", () => {
	test("takes a connector dropped in the click-through interior", async ({
		canvas,
	}) => {
		await canvas.drawShapeFromFlyout(
			CATEGORY,
			VPC_PRESET,
			{ x: 300, y: 220 },
			{ x: 640, y: 440 },
		);
		await canvas.deselect();

		// A source to the right of the frame, so the attached end lands on the
		// frame's right edge (x = 640).
		await canvas.drawShape("Rectangle", { x: 760, y: 280 }, { x: 860, y: 360 });
		await canvas.deselect();
		await canvas.selectAt({ x: 810, y: 320 });

		// Below the header band and deeper than CENTER_ANCHOR_DEPTH_PX from every
		// edge, so the drop reads as "connect to this shape" and takes its center.
		const connectorId = await canvas.createConnector("leftCenter", {
			x: 470,
			y: 340,
		});

		const points = await canvas.connectorPoints(connectorId);
		const end = points[points.length - 1];
		// Attached, not free: the end is pulled back to the edge facing the source
		// instead of staying where the pointer was released (x = 470).
		expect(end.x).toBeGreaterThan(620);
		expect(end.x).toBeLessThan(660);
	});
});
