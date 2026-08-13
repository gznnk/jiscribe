import type * as CanvasModule from "@jiscribe/canvas";
import type { Page } from "@playwright/test";

import { expect, test } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Round-trip of the image export (#55).
 *
 * Export runs through the context menu's Export... entry, the dialog (format,
 * margin, whether to embed the data) and the Export button.
 *
 * - PNG: exported with the default margin (16), then the downloaded PNG (with
 *   the .jis.json in an iTXt chunk) is dropped onto the page and the shapes come
 *   back
 * - SVG: exported with the margin changed to 32, contains no <foreignObject>
 *   (for GitHub, and to avoid canvas taint), has a viewBox reflecting the given
 *   margin, and its <metadata> .jis.json passes parseCanvasText
 * - Without embedded data: the name is a plain .svg with no .jis marker and the
 *   file has no <metadata>
 * - Transparent background: no background rect is laid down (the default does
 *   lay one down)
 * - Multi-slot shapes (record, #167): every slot's text is emitted as <text>
 * - Connector labels: written as <text> plus a <rect> box rather than a
 *   foreignObject (B1), and rasterized in PNG too
 */

/**
 * Export through the context menu and dialog, picking the format (and
 * optionally the margin and whether to embed the data), and return the
 * downloaded file's contents as base64.
 */
const downloadViaExportDialog = async (
	page: Page,
	canvas: CanvasDriver,
	menuPoint: { x: number; y: number },
	format: "png" | "svg",
	options: {
		margin?: number;
		includeSource?: boolean;
		transparentBackground?: boolean;
	} = {},
): Promise<{ name: string; base64: string }> => {
	await canvas.openContextMenu(menuPoint);
	await canvas.clickContextMenuItem("export");
	await expect(page.getByTestId("export-dialog")).toBeVisible();

	await page.getByTestId(`export-dialog:format-${format}`).check();
	if (options.margin !== undefined) {
		await page.getByTestId("export-dialog:margin").fill(String(options.margin));
	}
	if (options.includeSource === false) {
		await page.getByTestId("export-dialog:include-source").uncheck();
	}
	if (options.transparentBackground) {
		await page.getByTestId("export-dialog:transparent-background").check();
	}

	const downloadPromise = page.waitForEvent("download");
	await page.getByTestId("export-dialog:submit").click();
	const download = await downloadPromise;
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk as Buffer);
	}
	return {
		name: download.suggestedFilename(),
		base64: Buffer.concat(chunks).toString("base64"),
	};
};

test("restores the shapes when the exported PNG is dropped back in", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.typeTextAt({ x: 275, y: 190 }, "round trip");
	await canvas.commitText();
	await canvas.drawShape("Ellipse", { x: 480, y: 300 }, { x: 640, y: 420 });
	await canvas.deselect();

	const before = await canvas.captureObjects();
	expect(before.length).toBe(2);

	// Right-click empty space (no shape there) and export with the default margin of 16.
	const png = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 750, y: 550 },
		"png",
	);
	expect(png.name).toMatch(/\.jis\.png$/);

	// fit-to-content: output pixels are (content bounds + margin 16) x scale 2.
	// The bounds are rect(150..400 x 120..260) union ellipse(480..640 x 300..420).
	const pngBytes = Buffer.from(png.base64, "base64");
	const ihdrWidth = pngBytes.readUInt32BE(16);
	const ihdrHeight = pngBytes.readUInt32BE(20);
	expect(Math.abs(ihdrWidth - (640 - 150 + 32) * 2)).toBeLessThanOrEqual(4);
	expect(Math.abs(ihdrHeight - (420 - 120 + 32) * 2)).toBeLessThanOrEqual(4);

	// Get back to a blank state, then restore by dropping the file.
	await page.reload();
	await expect.poll(async () => (await canvas.captureObjects()).length).toBe(0);

	await page.evaluate(async (base64) => {
		const res = await fetch(`data:image/png;base64,${base64}`);
		const file = new File([await res.blob()], "exported.png", {
			type: "image/png",
		});
		const dataTransfer = new DataTransfer();
		dataTransfer.items.add(file);
		const target = document.querySelector(".app")!;
		target.dispatchEvent(
			new DragEvent("drop", {
				bubbles: true,
				cancelable: true,
				dataTransfer,
			}),
		);
	}, png.base64);

	// Wait for the state: the drop restore makes the shapes appear.
	await expect.poll(async () => (await canvas.captureObjects()).length).toBe(2);

	const after = await canvas.captureObjects();
	expect(after.map((obj) => obj.id).sort()).toEqual(
		before.map((obj) => obj.id).sort(),
	);
	expect(after.map((obj) => obj.transform).sort()).toEqual(
		before.map((obj) => obj.transform).sort(),
	);
});

test("exports SVG without foreignObject and restorable from its metadata", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.typeTextAt({ x: 275, y: 190 }, "svg export\n日本語ラベル");
	await canvas.commitText();
	await canvas.deselect();

	// Pan before exporting so the test shows the export range does not depend on
	// the current view.
	await canvas.middleDrag({ x: 700, y: 500 }, { x: 550, y: 380 });

	// Right-click empty space that is still in view after the pan, and export with margin 32.
	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 550, y: 400 },
		"svg",
		{ margin: 32 },
	);
	expect(svg.name).toMatch(/\.jis\.svg$/);

	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");
	expect(svgText).not.toContain("<foreignObject");
	expect(svgText).toContain("svg export");
	// Standalone, neither the emotion classes nor the --jiscribe-* custom properties
	// resolve, so drawing styles must be baked in as computed values. Missing them
	// leaves fill at its initial black and the shapes turn into black blobs.
	expect(svgText).not.toContain("var(--");
	expect(svgText).toMatch(/style="[^"]*stroke:/);

	// fit-to-content: even after panning, the viewBox is the content bounds plus the
	// given margin of 32 (the rect was drawn at 150,120-400,260).
	const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
	expect(viewBoxMatch).not.toBeNull();
	const [vbX, vbY, vbWidth, vbHeight] = viewBoxMatch![1]
		.split(/\s+/)
		.map(Number);
	expect(Math.abs(vbX - (150 - 32))).toBeLessThanOrEqual(2);
	expect(Math.abs(vbY - (120 - 32))).toBeLessThanOrEqual(2);
	expect(Math.abs(vbWidth - (250 + 64))).toBeLessThanOrEqual(4);
	expect(Math.abs(vbHeight - (140 + 64))).toBeLessThanOrEqual(4);

	// The .jis.json in metadata satisfies Canvas's input contract (parseCanvasText).
	const parsed = await page.evaluate(async (text) => {
		// The Vite dev server resolves bare ids through /@id/.
		const mod = (await import(
			"/@id/@jiscribe/canvas" as string
		)) as typeof CanvasModule;
		const svgDoc = new DOMParser().parseFromString(text, "image/svg+xml");
		const source = mod.extractCanvasSource(
			svgDoc.documentElement as unknown as SVGSVGElement,
		);
		if (!source) {
			return null;
		}
		return mod.parseCanvasText(JSON.stringify(source));
	}, svgText);

	expect(parsed?.kind).toBe("ok");
});

test("exports a plain .svg with no metadata when data embedding is off", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.deselect();

	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 700, y: 500 },
		"svg",
		{ includeSource: false },
	);

	// A plain .svg without the .jis marker that signals "re-editable".
	expect(svg.name).toMatch(/\.svg$/);
	expect(svg.name).not.toMatch(/\.jis\.svg$/);

	// No embedded source: neither <metadata> nor the jiscribe namespace. The image
	// itself still draws normally; baking styles in is independent of the source.
	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");
	expect(svgText).not.toContain("<metadata");
	expect(svgText).not.toContain("jiscribe.dev/ns/canvas");
	expect(svgText).toMatch(/style="[^"]*stroke:/);
});

test("emits every slot of a record (multi-slot) shape as <text> in the SVG export", async ({
	canvas,
	page,
}) => {
	await canvas.drawShapeFromFlyout(
		"uml",
		"object",
		{ x: 300, y: 200 },
		{ x: 520, y: 280 },
	);
	await canvas.deselect();

	// The title band (within the top 28px) is the name slot; below it is the
	// attributes slot. The stencil drops the box in with sample text, so both are
	// filled in place of it rather than typed into.
	await canvas.replaceTextAt({ x: 410, y: 212 }, "Users");
	await canvas.commitText();
	await canvas.replaceTextAt({ x: 410, y: 255 }, "id: string\nname: string");
	await canvas.commitText();
	await canvas.deselect();

	// Turn data embedding off so a body match can only come from the rendered <text>.
	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 750, y: 550 },
		"svg",
		{ includeSource: false },
	);
	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");

	expect(svgText).not.toContain("<foreignObject");
	const textElements = [...svgText.matchAll(/<text[\s\S]*?<\/text>/g)].join(
		" ",
	);
	expect(textElements).toContain("Users");
	expect(textElements).toContain("id: string");
	expect(textElements).toContain("name: string");
});

test("writes a body styled per range as one <tspan> per run", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 540, y: 300 });
	await canvas.typeTextAt({ x: 420, y: 250 }, "Payment failed");
	// Bold the first word only, so the line has to be written as two runs.
	await page.keyboard.press("Home");
	for (let i = 0; i < 7; i++) {
		await page.keyboard.press("Shift+ArrowRight");
	}
	await page.keyboard.press("ControlOrMeta+b");
	await canvas.commitText();
	await canvas.deselect();

	// Data embedding off, so a match can only come from the rendered <text>.
	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 750, y: 550 },
		"svg",
		{ includeSource: false },
	);
	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");

	const textBlock = (svgText.match(/<text\b[\s\S]*?<\/text>/g) ?? []).find(
		(block) => block.includes("Payment"),
	);
	expect(textBlock, "the styled body is emitted as <text>").toBeDefined();
	// The line is one <tspan> holding a nested one per run: the bold word carries
	// the weight it does not inherit, the rest carries none.
	expect(textBlock).toMatch(
		/<tspan[^>]*font-weight="(bold|700)"[^>]*>Payment<\/tspan>/,
	);
	expect(textBlock).toContain(" failed</tspan>");
});

/**
 * Whether a background rect is present: the rect buildExportSvg lays down to
 * cover the whole viewBox via a fill attribute. Shape rects are transform/style
 * based, so they do not match.
 */
const hasBackgroundRect = (svgText: string): boolean => {
	const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
	expect(viewBoxMatch).not.toBeNull();
	const [x, y, width, height] = viewBoxMatch![1].split(/\s+/);
	return new RegExp(
		`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="`,
	).test(svgText);
};

test("lays down no background rect when the SVG is exported with a transparent background", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.deselect();

	// Pin down first that the default (opaque) really does lay a background rect
	// down, then check that asking for transparency removes it.
	const opaque = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 700, y: 500 },
		"svg",
	);
	const opaqueText = Buffer.from(opaque.base64, "base64").toString("utf-8");
	expect(hasBackgroundRect(opaqueText)).toBe(true);

	const transparent = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 700, y: 500 },
		"svg",
		{ transparentBackground: true },
	);
	const transparentText = Buffer.from(transparent.base64, "base64").toString(
		"utf-8",
	);
	expect(hasBackgroundRect(transparentText)).toBe(false);
	// The shape itself is still drawn.
	expect(transparentText).toMatch(/style="[^"]*stroke:/);
});

type Box = { x: number; y: number; width: number; height: number };

/** Label background color; being different from the default is what makes the check meaningful. */
const LABEL_FILL = "rgb(220, 38, 38)";
/** Label border color; being different from the default is what makes the check meaningful. */
const LABEL_STROKE = "rgb(59, 130, 246)";
/** Label border width in px; different from the default. */
const LABEL_STROKE_WIDTH = 2;

/** Locator for the label box, i.e. the LabelBox div inside the foreignObject. */
const labelBoxOf = (canvas: CanvasDriver) =>
	canvas.page
		.locator("foreignObject[data-kind=connector][data-part=label]")
		.locator("div")
		.first();

/** Geometry attributes of the label foreignObject, i.e. the label box in world coordinates. */
const labelForeignObjectBox = async (canvas: CanvasDriver): Promise<Box> => {
	const attributes = await canvas.page
		.locator("foreignObject[data-kind=connector][data-part=label]")
		.evaluate((element) => ({
			x: element.getAttribute("x"),
			y: element.getAttribute("y"),
			width: element.getAttribute("width"),
			height: element.getAttribute("height"),
		}));
	return {
		x: Number(attributes.x),
		y: Number(attributes.y),
		width: Number(attributes.width),
		height: Number(attributes.height),
	};
};

/**
 * Connect two rectangles, attach a label styled away from the defaults (red
 * background, 2px blue border), and move it off its default position.
 */
const setupStyledLabeledConnector = async (
	canvas: CanvasDriver,
): Promise<void> => {
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

	// Double-click on the line (midpoint of the first segment) to attach a label.
	const points = (await canvas.objectById(connectorId).getAttribute("points"))!
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
	const onLine = {
		x: (points[0].x + points[1].x) / 2,
		y: (points[0].y + points[1].y) / 2,
	};
	await canvas.typeTextAt(onLine, "Yes");
	await canvas.commitText();

	// Move background and border off the defaults so the export can be checked for both.
	await canvas.clickAt(onLine);
	await canvas.openObjectMenu("label-bg-color");
	await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
	await canvas.openObjectMenu("label-border-style");
	await canvas.setNumberInput("label.strokeWidth", LABEL_STROKE_WIDTH);
	await canvas.openObjectMenu("label-border-color");
	await canvas.page.click(selectors.objectMenuSet("label.stroke", "#3b82f6"));

	const labelBox = labelBoxOf(canvas);
	await expect(labelBox).toHaveCSS("background-color", LABEL_FILL);
	await expect(labelBox).toHaveCSS("border-top-color", LABEL_STROKE);

	// Move it off the default position, the midpoint used when label.position and
	// label.offset are unset. Deselect first: while selected the control handles
	// overlap the label.
	await canvas.deselect();
	const before = await labelForeignObjectBox(canvas);
	const screenBox = await labelBox.boundingBox();
	if (!screenBox) {
		throw new Error("cannot read the position of the label box");
	}
	const grabPoint = canvas.toContent({
		x: screenBox.x + screenBox.width / 2,
		y: screenBox.y + screenBox.height / 2,
	});
	await canvas.drag(grabPoint, { x: grabPoint.x, y: grabPoint.y - 40 }, 10);
	await expect
		.poll(async () => (await labelForeignObjectBox(canvas)).y, {
			message: "the drag moves the label off its default position",
		})
		.toBeLessThan(before.y - 20);
};

type SvgAttributes = Record<string, string>;

/** Collect the opening tags of the given tag name from SVG text and return their attributes by name. */
const parseTagAttributes = (
	svgText: string,
	tagName: string,
): SvgAttributes[] =>
	(svgText.match(new RegExp(`<${tagName}\\b[^>]*>`, "g")) ?? []).map((tag) => {
		const attributes: SvgAttributes = {};
		for (const [, name, value] of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) {
			attributes[name] = value;
		}
		return attributes;
	});

/** Split the viewBox into its four numbers. */
const parseViewBox = (svgText: string): Box => {
	const viewBoxMatch = svgText.match(/viewBox="([^"]+)"/);
	expect(viewBoxMatch).not.toBeNull();
	const [x, y, width, height] = viewBoxMatch![1].split(/\s+/).map(Number);
	return { x, y, width, height };
};

test("writes connector labels as <text> plus a box <rect> rather than a foreignObject", async ({
	canvas,
	page,
}) => {
	await setupStyledLabeledConnector(canvas);
	const labelBox = await labelForeignObjectBox(canvas);

	await canvas.deselect();
	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 200, y: 550 },
		"svg",
	);
	const svgText = Buffer.from(svg.base64, "base64").toString("utf-8");

	// No foreignObject survives; leaving one would taint the PNG and vanish on GitHub.
	expect(svgText).not.toContain("<foreignObject");

	// The box: a rect at the same position and size as the label foreignObject, with
	// fill and border. CSS borders are drawn inside, so the SVG stroke sits inset by
	// half the line width.
	const labelRect = parseTagAttributes(svgText, "rect").find(
		(attributes) => attributes.fill === LABEL_FILL,
	);
	expect(
		labelRect,
		"a rect with the label background color is emitted",
	).toBeDefined();
	expect(labelRect!.stroke).toBe(LABEL_STROKE);
	expect(Number(labelRect!["stroke-width"])).toBe(LABEL_STROKE_WIDTH);
	const inset = LABEL_STROKE_WIDTH / 2;
	expect(Math.abs(Number(labelRect!.x) - (labelBox.x + inset))).toBeLessThan(1);
	expect(Math.abs(Number(labelRect!.y) - (labelBox.y + inset))).toBeLessThan(1);
	expect(
		Math.abs(Number(labelRect!.width) - (labelBox.width - inset * 2)),
	).toBeLessThan(1);
	expect(
		Math.abs(Number(labelRect!.height) - (labelBox.height - inset * 2)),
	).toBeLessThan(1);

	// The text: a native <text>, centered in the box.
	const labelTextBlock = (svgText.match(/<text\b[\s\S]*?<\/text>/g) ?? []).find(
		(block) => block.includes(">Yes<"),
	);
	expect(labelTextBlock, "the label string is emitted as <text>").toBeDefined();
	const tspan = parseTagAttributes(labelTextBlock!, "tspan")[0];
	expect(
		Math.abs(Number(tspan.x) - (labelBox.x + labelBox.width / 2)),
	).toBeLessThan(1);
	expect(Number(tspan.y)).toBeGreaterThan(labelBox.y);
	expect(Number(tspan.y)).toBeLessThan(labelBox.y + labelBox.height);

	// The label box fits inside the viewBox; the label is part of the connector's extent.
	const viewBox = parseViewBox(svgText);
	expect(viewBox.x).toBeLessThanOrEqual(labelBox.x);
	expect(viewBox.y).toBeLessThanOrEqual(labelBox.y);
	expect(viewBox.x + viewBox.width).toBeGreaterThanOrEqual(
		labelBox.x + labelBox.width,
	);
	expect(viewBox.y + viewBox.height).toBeGreaterThanOrEqual(
		labelBox.y + labelBox.height,
	);
});

test("rasterizes connector labels in the PNG export too", async ({
	canvas,
	page,
}) => {
	await setupStyledLabeledConnector(canvas);
	const labelBox = await labelForeignObjectBox(canvas);

	// The viewBox used to convert world coordinates to pixels is taken from the SVG;
	// both use the same margin, so the output regions coincide.
	await canvas.deselect();
	const svg = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 200, y: 550 },
		"svg",
	);
	const viewBox = parseViewBox(
		Buffer.from(svg.base64, "base64").toString("utf-8"),
	);

	const png = await downloadViaExportDialog(
		page,
		canvas,
		{ x: 200, y: 550 },
		"png",
	);

	// Pixels of the background color exist inside the label box, in the filled area
	// away from the border and the text.
	const fillPixelCount = await page.evaluate(
		async ({ base64, region, color }) => {
			const image = new Image();
			await new Promise((resolve, reject) => {
				image.onload = resolve;
				image.onerror = reject;
				image.src = `data:image/png;base64,${base64}`;
			});
			const canvasElement = document.createElement("canvas");
			canvasElement.width = image.naturalWidth;
			canvasElement.height = image.naturalHeight;
			const context = canvasElement.getContext("2d")!;
			context.drawImage(image, 0, 0);

			const scale = image.naturalWidth / region.viewBoxWidth;
			const { data } = context.getImageData(
				Math.round((region.x - region.viewBoxX) * scale),
				Math.round((region.y - region.viewBoxY) * scale),
				Math.max(1, Math.round(region.width * scale)),
				Math.max(1, Math.round(region.height * scale)),
			);
			let count = 0;
			for (let i = 0; i < data.length; i += 4) {
				if (
					Math.abs(data[i] - color.r) < 20 &&
					Math.abs(data[i + 1] - color.g) < 20 &&
					Math.abs(data[i + 2] - color.b) < 20
				) {
					count++;
				}
			}
			return count;
		},
		{
			base64: png.base64,
			// Look only inside the box, clear of the 2px border and the padding.
			region: {
				x: labelBox.x + 4,
				y: labelBox.y + 4,
				width: labelBox.width - 8,
				height: labelBox.height - 8,
				viewBoxX: viewBox.x,
				viewBoxY: viewBox.y,
				viewBoxWidth: viewBox.width,
			},
			color: { r: 220, g: 38, b: 38 },
		},
	);

	expect(fillPixelCount).toBeGreaterThan(20);
});

test("closes the dialog on Escape without clearing the selection", async ({
	canvas,
	page,
}) => {
	await canvas.drawShape("Rectangle", { x: 150, y: 120 }, { x: 400, y: 260 });
	await canvas.deselect();
	await canvas.selectAt({ x: 275, y: 190 });

	// The context menu opens only on a right-click in empty space, which keeps the selection.
	await canvas.openContextMenu({ x: 700, y: 500 });
	await canvas.clickContextMenuItem("export");
	await expect(page.getByTestId("export-dialog")).toBeVisible();

	// Press Escape with focus still on the Canvas container rather than an input
	// field: DeselectAllCommand on the bubble phase must not take it, so only the
	// dialog closes.
	await page.keyboard.press("Escape");
	await expect(page.getByTestId("export-dialog")).toHaveCount(0);
	await expect(page.locator("[data-kind=control]").first()).toBeVisible();
});
