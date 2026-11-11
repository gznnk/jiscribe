import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/** The frame's tint, far from both themes' page color. */
const FRAME_FILL = "#2563eb";

/**
 * A filled VPC with a connector between two rectangles inside it, the frame
 * drawn first so it lies under the connector. Returns a point on the line.
 */
const setupConnectorOnFrame = async (
	canvas: CanvasDriver,
): Promise<{ x: number; y: number }> => {
	await canvas.drawShapeFromFlyout(
		"aws-group",
		"awsGroupVpc",
		{ x: 200, y: 120 },
		{ x: 1000, y: 480 },
	);
	await canvas.setColor("bg-color", FRAME_FILL);
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 300, y: 260 }, { x: 400, y: 340 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 700, y: 260 }, { x: 800, y: 340 });
	await canvas.deselect();
	await canvas.selectAt({ x: 350, y: 300 });
	await canvas.createConnector("rightCenter", { x: 715, y: 300 });
	await canvas.deselect();
	return { x: 550, y: 300 };
};

/** The editor box and the frame-fill layer its backdrop draws, read off the page. */
const readEditorBackdrop = (canvas: CanvasDriver) =>
	canvas.page.evaluate(() => {
		const wrapper = document.querySelector('[data-testid="text-editor"]');
		const layer = wrapper?.querySelector("svg g > *");
		if (!wrapper || !layer) {
			return null;
		}
		return {
			background: getComputedStyle(wrapper).backgroundColor,
			layerFill: getComputedStyle(layer).fill,
			wrapperWidth: wrapper.getBoundingClientRect().width,
			layerWidth: layer.getBoundingClientRect().width,
		};
	});

/**
 * A connector label's editor is drawn on the same stack as the committed label:
 * the page's color, then the fill of the frame the box lies on, cut for the
 * text as typed so far (graftConnectorLabelDraft), the box itself transparent.
 */
test.describe("a connector label's editor on a filled awsGroup", () => {
	test("is painted on the frame's fill from the moment it opens, and follows each keystroke", async ({
		canvas,
	}) => {
		const onLine = await setupConnectorOnFrame(canvas);
		// Opens the editor on a new, empty label.
		await canvas.typeTextAt(onLine, "");

		const frameFill = await canvas.normalizeColor(FRAME_FILL);
		// Empty, as a label being created opens.
		await expect.poll(() => readEditorBackdrop(canvas)).not.toBeNull();
		const empty = (await readEditorBackdrop(canvas))!;
		expect(empty.background).toBe("rgba(0, 0, 0, 0)");
		expect(empty.layerFill).toBe(frameFill);
		expect(empty.layerWidth).toBeCloseTo(empty.wrapperWidth, 0);

		await canvas.page.keyboard.type("HTTPS traffic");
		await expect
			.poll(async () => (await readEditorBackdrop(canvas))?.layerWidth ?? 0)
			.toBeGreaterThan(empty.layerWidth);
		const typed = (await readEditorBackdrop(canvas))!;
		expect(typed.layerFill).toBe(frameFill);
		expect(typed.layerWidth).toBeCloseTo(typed.wrapperWidth, 0);
	});
});
