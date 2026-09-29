import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Guards the icon as a connector endpoint (IconFeatures.connectable).
 *
 * Two things have to hold for a drop to land on it. The line art strokes are far
 * too thin for `document.elementsFromPoint` to catch, so the transparent grab area
 * covering the box (IconHitArea) is what answers; and the shape registers no
 * outline calculator, so the endpoint resolves against the box rather than the
 * drawn silhouette.
 */
test.describe("connecting to the icon", () => {
	test("keeps a connector dropped on it attached as it moves", async ({
		canvas,
	}) => {
		const iconId = await canvas.placeShapeFromFlyout("icon", "lucideIconUser");
		await canvas.deselect();

		const screenBox = await canvas.objectById(iconId).boundingBox();
		if (screenBox === null) {
			throw new Error("the icon is not laid out");
		}
		const topLeft = canvas.toContent({ x: screenBox.x, y: screenBox.y });
		const bottomRight = canvas.toContent({
			x: screenBox.x + screenBox.width,
			y: screenBox.y + screenBox.height,
		});
		const iconCenter = {
			x: (topLeft.x + bottomRight.x) / 2,
			y: (topLeft.y + bottomRight.y) / 2,
		};
		// Inside the box, clear of both the dropped endpoint at the center and the line
		// coming in from the left: a drag from here moves the icon and nothing else.
		const iconGrabPoint = {
			x: iconCenter.x + (bottomRight.x - topLeft.x) * 0.3,
			y: iconCenter.y + (bottomRight.y - topLeft.y) * 0.3,
		};

		const rectRight = topLeft.x - 120;
		await canvas.drawShape(
			"Rectangle",
			{ x: rectRight - 140, y: iconCenter.y - 40 },
			{ x: rectRight, y: iconCenter.y + 40 },
		);
		await canvas.deselect();

		await canvas.selectAt({ x: rectRight - 70, y: iconCenter.y });
		const connectorId = await canvas.createConnector("rightCenter", iconCenter);
		await canvas.deselect();

		// Moving the icon drags the connector along, so the endpoint really is attached
		// to it rather than left dangling where it was dropped.
		const before = await canvas.objectById(connectorId).getAttribute("points");
		await canvas.drag(iconGrabPoint, {
			x: iconGrabPoint.x + 120,
			y: iconGrabPoint.y + 90,
		});
		await canvas.deselect();

		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "the connector follows the icon, so the endpoint is attached",
			})
			.not.toBe(before);
	});
});
