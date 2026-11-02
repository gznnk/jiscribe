import type * as CanvasModule from "@jiscribe/canvas";
import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";
import type { JSHandle, Page } from "@playwright/test";

/**
 * The image export of a markdown card: the PNG draws the rendered HTML, and the
 * SVG file still flattens it to plain `<text>` (GitHub strips foreignObject).
 *
 * The card's body is a table alone, drawn in red on white. Its rules are
 * `color-mix(currentColor 30%, transparent)`, about rgb(255, 179, 179) here, and
 * they span the card's width: a plain-text `<text>` never paints a reddish row
 * that long, so a row like that can only be a rule of the rendered table.
 */

const CARD_ID = "card";

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: CARD_ID,
			type: "markdown",
			x: 400,
			y: 300,
			width: 300,
			height: 120,
			fill: "#ffffff",
			stroke: "#000000",
			fontColor: "#ff0000",
			text: "| a | b |\n|---|---|\n| 1 | 2 |",
		},
	],
});

/** The global mountPluginHarness publishes the default page's handle on. */
type HarnessWindow = {
	__canvasHandle?: CanvasModule.CanvasHandle | null;
	__setHarnessDoc?: (docText: string) => void;
};

const loadHarnessDoc = async (page: Page, text = docText): Promise<void> => {
	await page.evaluate((json) => {
		const hook = (window as unknown as HarnessWindow).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(json);
	}, text);
};

/** A display formula followed by a paragraph, whose spacing the formula's margin sets. */
const mathDocText = JSON.stringify({
	version: 1,
	root: [
		{
			id: CARD_ID,
			type: "markdown",
			x: 400,
			y: 300,
			width: 300,
			height: 200,
			text: "$$\n\\frac{a}{b}\n$$\n\nafter",
		},
	],
});

const readCanvasHandle = (
	page: Page,
): Promise<JSHandle<CanvasModule.CanvasHandle>> =>
	page.evaluateHandle(() => {
		const handle = (window as unknown as HarnessWindow).__canvasHandle;
		if (!handle) {
			throw new Error(
				"__canvasHandle is undefined (harness hook not installed)",
			);
		}
		return handle;
	});

test.describe("markdown image export", () => {
	test("draws the rendered table into the PNG", async ({ canvas, page }) => {
		await loadHarnessDoc(page);
		await expect(canvas.objectById(CARD_ID)).toHaveCount(1);
		await expect(page.locator("foreignObject table")).toHaveCount(1);
		const handle = await readCanvasHandle(page);

		const longestReddishRun = await handle.evaluate(async (h, id) => {
			const capture = await h.export.capturePng({
				region: { ids: [id] },
				margin: 0,
			});
			if (capture === null) {
				return null;
			}
			const url = URL.createObjectURL(capture.blob);
			const image = new Image();
			await new Promise((resolve, reject) => {
				image.onload = resolve;
				image.onerror = reject;
				image.src = url;
			});
			URL.revokeObjectURL(url);
			const canvasElement = document.createElement("canvas");
			canvasElement.width = image.naturalWidth;
			canvasElement.height = image.naturalHeight;
			const context = canvasElement.getContext("2d")!;
			context.drawImage(image, 0, 0);
			const { data, width, height } = context.getImageData(
				0,
				0,
				canvasElement.width,
				canvasElement.height,
			);
			let longestRun = 0;
			for (let y = 0; y < height; y++) {
				let run = 0;
				for (let x = 0; x < width; x++) {
					const offset = (y * width + x) * 4;
					const red = data[offset];
					const isReddish =
						red >= 200 &&
						red - Math.max(data[offset + 1], data[offset + 2]) >= 20;
					run = isReddish ? run + 1 : 0;
					longestRun = Math.max(longestRun, run);
				}
			}
			return { longestRun, width };
		}, CARD_ID);

		expect(longestReddishRun).not.toBeNull();
		expect(longestReddishRun!.longestRun).toBeGreaterThanOrEqual(
			longestReddishRun!.width * 0.8,
		);
	});

	test("flattens the body to <text> in the SVG", async ({ canvas, page }) => {
		await loadHarnessDoc(page);
		await expect(canvas.objectById(CARD_ID)).toHaveCount(1);
		const handle = await readCanvasHandle(page);

		const exported = await handle.evaluate(async (h, id) => {
			const svgText = await h.export.toSvgString({ region: { ids: [id] } });
			if (svgText === null) {
				return null;
			}
			const root = new DOMParser().parseFromString(
				svgText,
				"image/svg+xml",
			).documentElement;
			return {
				foreignObjectCount: root.getElementsByTagName("foreignObject").length,
				texts: Array.from(root.getElementsByTagName("text")).map(
					(text) => text.textContent ?? "",
				),
			};
		}, CARD_ID);

		expect(exported).not.toBeNull();
		expect(exported!.foreignObjectCount).toBe(0);
		expect(exported!.texts.some((text) => text.includes("a"))).toBe(true);
	});

	test("leaves an auto-height formula block auto in the PNG's SVG", async ({
		canvas,
		page,
	}) => {
		await loadHarnessDoc(page, mathDocText);
		await expect(canvas.objectById(CARD_ID)).toHaveCount(1);
		await expect(page.locator("foreignObject .katex-display")).toHaveCount(1);
		const handle = await readCanvasHandle(page);

		// A pinned height would stop the formula's bottom margin collapsing through
		// its block, pulling the paragraph after it up.
		const formulaBlockStyles = await handle.evaluate(async (h, id) => {
			const prefix = "data:image/svg+xml;charset=utf-8,";
			const captured: string[] = [];
			const srcDescriptor = Object.getOwnPropertyDescriptor(
				HTMLImageElement.prototype,
				"src",
			)!;
			Object.defineProperty(HTMLImageElement.prototype, "src", {
				...srcDescriptor,
				set(this: HTMLImageElement, value: string) {
					if (value.startsWith(prefix)) {
						captured.push(decodeURIComponent(value.slice(prefix.length)));
					}
					srcDescriptor.set!.call(this, value);
				},
			});
			try {
				await h.export.capturePng({ region: { ids: [id] } });
			} finally {
				Object.defineProperty(HTMLImageElement.prototype, "src", srcDescriptor);
			}
			const root = new DOMParser().parseFromString(
				captured[0] ?? "",
				"image/svg+xml",
			).documentElement;
			const foreignObject = root.getElementsByTagName("foreignObject")[0];
			if (!foreignObject) {
				return null;
			}
			// The innermost div holding the formula: the class that named it is
			// dropped from the export.
			const holdsMath = (element: Element) =>
				element.getElementsByTagName("math").length > 0;
			return Array.from(foreignObject.getElementsByTagName("div"))
				.filter(
					(div) =>
						holdsMath(div) &&
						!Array.from(div.getElementsByTagName("div")).some(holdsMath),
				)
				.map((div) => div.getAttribute("style") ?? "");
		}, CARD_ID);

		expect(formulaBlockStyles).not.toBeNull();
		expect(formulaBlockStyles).toHaveLength(1);
		expect(formulaBlockStyles![0]).not.toMatch(/(^|;\s*)(height|block-size):/);
	});
});
