import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

const ICON_CATEGORY = "aws";
const S3_PRESET = "awsIconServiceAmazonSimpleStorageService";
const GROUP_CATEGORY = "aws-group";
const VPC_PRESET = "awsGroupVpc";

/**
 * An awsIcon's label is a `features.text: "label"` caption on an `"auto"`
 * background. Inside a filled awsGroup it is painted on the page's color and
 * then on the group's fill (the group's labelBackdrop), in a group of layers
 * beside the knockout rect, so it blends into the frame. Only a browser puts
 * the label's box where the group's fill is.
 */
test.describe("an icon's label on a filled awsGroup", () => {
	test("is painted on the group's fill, and back on the page once dragged out", async ({
		canvas,
	}) => {
		const iconId = await canvas.placeShapeFromFlyout(ICON_CATEGORY, S3_PRESET);
		const iconBox = await canvas
			.objectById(iconId)
			.locator("rect")
			.first()
			.boundingBox();
		if (iconBox === null) {
			throw new Error("the icon is not laid out");
		}
		const iconCenter = canvas.toContent({
			x: iconBox.x + iconBox.width / 2,
			y: iconBox.y + iconBox.height / 2,
		});
		await canvas.deselect();

		// A frame around the icon, sent behind it so the icon is drawn on it.
		await canvas.drawShapeFromFlyout(
			GROUP_CATEGORY,
			VPC_PRESET,
			{ x: iconCenter.x - 200, y: iconCenter.y - 150 },
			{ x: iconCenter.x + 200, y: iconCenter.y + 200 },
		);
		await canvas.arrange("sendToBack");
		await canvas.setColor("bg-color", "#ff0000");
		await canvas.deselect();

		const layers = canvas.page.locator(
			'g[data-canvas-export="flatten"] > g[pointer-events="none"] > rect',
		);
		await expect(layers).toHaveCount(1);
		await expect(layers).toHaveCSS("fill", "rgb(255, 0, 0)");
		// The knockout stays under it, the one rect beside the layers.
		await expect(
			canvas.page.locator('g[data-canvas-export="flatten"] > rect'),
		).toHaveCount(1);

		// Mid-drag the label keeps what it had; the drop works it out again.
		await canvas.dragInspecting(
			iconCenter,
			{ x: iconCenter.x + 500, y: iconCenter.y },
			async () => {
				await expect(layers).toHaveCount(1);
			},
		);
		await expect(layers).toHaveCount(0);
	});
});
