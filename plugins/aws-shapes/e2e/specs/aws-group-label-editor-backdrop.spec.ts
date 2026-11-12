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
 * How many pixels of the editor's text box are far from the frame's fill: the
 * glyphs, which show only while the text paints over the backdrop. Read from a
 * screenshot, decoded in the page.
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
	const shot = await canvas.page.screenshot({ clip });
	return canvas.page.evaluate(
		async ([base64, fill]) => {
			const [r, g, b] = fill.match(/\d+/g)!.map(Number);
			const res = await fetch(`data:image/png;base64,${base64}`);
			const bitmap = await createImageBitmap(await res.blob());
			const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height);
			const ctx = offscreen.getContext("2d")!;
			ctx.drawImage(bitmap, 0, 0);
			const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
			let ink = 0;
			for (let i = 0; i < data.length; i += 4) {
				const distance =
					Math.abs(data[i] - r) +
					Math.abs(data[i + 1] - g) +
					Math.abs(data[i + 2] - b);
				if (distance > 120) {
					ink += 1;
				}
			}
			return ink;
		},
		[shot.toString("base64"), frameFill] as const,
	);
};

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
		// The text paints over the backdrop, not under it.
		expect(await countInkPixels(canvas, frameFill)).toBeGreaterThan(20);
	});

	test("draws a label's border again over the backdrop", async ({ canvas }) => {
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
		await expect.poll(() => readEditorBackdrop(canvas)).not.toBeNull();
		const border = await canvas.page.evaluate(() => {
			const wrapper = document.querySelector('[data-testid="text-editor"]')!;
			const after = getComputedStyle(wrapper, "::after");
			return {
				content: after.content,
				width: after.borderTopWidth,
				color: after.borderTopColor,
			};
		});
		// What the SVG covers the box's own border with is drawn again on top.
		expect(border).toEqual({
			content: '""',
			width: "3px",
			color: await canvas.normalizeColor("#f59e0b"),
		});
	});
});
