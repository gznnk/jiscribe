import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
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

/**
 * The label's box the canvas draws under the open editor, the frame-fill layer
 * drawn before it, and the editor itself, read off the page.
 */
const readLabelBackdrop = (canvas: CanvasDriver) =>
	canvas.page.evaluate(() => {
		const editor = document.querySelector('[data-testid="text-editor"]');
		const labelBox = document.querySelector(
			"foreignObject[data-kind=connector][data-action=label]",
		);
		// LabelBackdropLayers: the knockout, then the group of layers, then the box.
		const layer = labelBox?.previousElementSibling?.firstElementChild;
		if (!editor || !labelBox || !layer) {
			return null;
		}
		return {
			editorBackground: getComputedStyle(editor).backgroundColor,
			editorWidth: editor.getBoundingClientRect().width,
			labelBoxWidth: labelBox.getBoundingClientRect().width,
			layerFill: getComputedStyle(layer).fill,
			layerWidth: layer.getBoundingClientRect().width,
		};
	});

/**
 * How far each pixel in `clip` is from `color`, summed over the channels.
 * Read from a screenshot, decoded in the page.
 */
const readPixelDistances = async (
	canvas: CanvasDriver,
	clip: { x: number; y: number; width: number; height: number },
	color: string,
): Promise<number[]> => {
	const shot = await canvas.page.screenshot({ clip });
	return canvas.page.evaluate(
		async ([base64, rgb]) => {
			const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
			const res = await fetch(`data:image/png;base64,${base64}`);
			const bitmap = await createImageBitmap(await res.blob());
			const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
			const ctx = offscreen.getContext("2d")!;
			ctx.drawImage(bitmap, 0, 0);
			const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
			const distances: number[] = [];
			for (let i = 0; i < data.length; i += 4) {
				distances.push(
					Math.abs(data[i] - r) +
						Math.abs(data[i + 1] - g) +
						Math.abs(data[i + 2] - b),
				);
			}
			return distances;
		},
		[shot.toString("base64"), color] as const,
	);
};

/**
 * How many pixels of the editor's text box are far from the frame's fill: the
 * glyphs, which show only while the text paints over the backdrop.
 */
const countInkPixels = async (
	canvas: CanvasDriver,
	frameFill: string,
): Promise<number> => {
	const box = await canvas.page
		.locator('[data-testid="text-editor"] textarea')
		.boundingBox();
	if (box === null) {
		throw new Error("the editor's text box is not laid out");
	}
	// Inset off the box's edge, so only what is drawn inside it is counted.
	const clip = {
		x: Math.round(box.x) + 3,
		y: Math.round(box.y) + 3,
		width: Math.round(box.width) - 6,
		height: Math.round(box.height) - 6,
	};
	const distances = await readPixelDistances(canvas, clip, frameFill);
	return distances.filter((distance) => distance > 120).length;
};

/**
 * A connector label's box stays drawn by the canvas while its editor is open,
 * on the same stack as the committed label: the page's color, then the fill of
 * the frame its anchor lies in, judged from the moment it opens empty
 * (graftConnectorLabelDraft), over the box as it grows with the text. The
 * editor over it paints no box, only the text.
 */
test.describe("a connector label's box under its editor on a filled awsGroup", () => {
	test("is painted on the frame's fill from the moment it opens, and follows each keystroke", async ({
		canvas,
	}) => {
		const onLine = await setupConnectorOnFrame(canvas);
		// Opens the editor on a new, empty label.
		await canvas.typeTextAt(onLine, "");

		const frameFill = await canvas.normalizeColor(FRAME_FILL);
		// Empty, as a label being created opens.
		await expect.poll(() => readLabelBackdrop(canvas)).not.toBeNull();
		const empty = (await readLabelBackdrop(canvas))!;
		expect(empty.editorBackground).toBe("rgba(0, 0, 0, 0)");
		expect(empty.layerFill).toBe(frameFill);
		expect(empty.layerWidth).toBeCloseTo(empty.labelBoxWidth, 0);
		expect(empty.labelBoxWidth).toBeCloseTo(empty.editorWidth, 0);

		await canvas.page.keyboard.type("HTTPS traffic");
		await expect
			.poll(async () => (await readLabelBackdrop(canvas))?.layerWidth ?? 0)
			.toBeGreaterThan(empty.layerWidth);
		const typed = (await readLabelBackdrop(canvas))!;
		expect(typed.layerFill).toBe(frameFill);
		expect(typed.layerWidth).toBeCloseTo(typed.labelBoxWidth, 0);
		expect(typed.labelBoxWidth).toBeCloseTo(typed.editorWidth, 0);
		// The text paints over the backdrop, not under it.
		expect(await countInkPixels(canvas, frameFill)).toBeGreaterThan(20);
	});

	test("shows the label box's border over the backdrop while the editor is open", async ({
		canvas,
	}) => {
		const onLine = await setupConnectorOnFrame(canvas);
		await canvas.typeTextAt(onLine, "HTTPS");
		await canvas.commitText();
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-border-style");
		await canvas.setNumberInput("label.strokeWidth", 3);
		await canvas.openObjectMenu("label-border-color");
		await canvas.page.click(selectors.objectMenuSet("label.stroke", "#f59e0b"));
		await canvas.deselect();

		await canvas.typeTextAt(onLine, "");
		await expect.poll(() => readLabelBackdrop(canvas)).not.toBeNull();
		const labelBox = await canvas.page
			.locator("foreignObject[data-kind=connector][data-action=label]")
			.boundingBox();
		if (labelBox === null) {
			throw new Error("the label box is not laid out");
		}
		// A row through the middle of the 3px top border, clear of the rounded corners.
		const borderRow = {
			x: Math.round(labelBox.x + labelBox.width / 4),
			y: Math.round(labelBox.y) + 1,
			width: Math.round(labelBox.width / 2),
			height: 1,
		};
		const distances = await readPixelDistances(
			canvas,
			borderRow,
			await canvas.normalizeColor("#f59e0b"),
		);
		const borderPixels = distances.filter((distance) => distance < 60);
		expect(borderPixels.length).toBeGreaterThan(distances.length * 0.9);
	});
});
