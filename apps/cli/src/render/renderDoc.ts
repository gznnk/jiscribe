import type { CanvasDoc } from "@jiscribe/canvas/doc";

import { createHarnessAssetHandler, HARNESS_ORIGIN } from "./harnessAssets";
import { launchBrowser } from "./launchBrowser";
import type { RenderOptions } from "./renderOptions";
import { RENDER_CONTENT_MARGIN } from "./renderOptions";
import { HARNESS_GLOBAL } from "../../harness/harnessBridge";
import type {
	HarnessRenderRequest,
	HarnessRenderResult,
} from "../../harness/harnessBridge";

/** The rendered file, and what the caller is told about it. */
export type RenderedImage = {
	/** The bytes to write. */
	body: Buffer;
	/** Pixel size of a PNG; null for an SVG, whose size is its viewBox. */
	pixelSize: { width: number; height: number } | null;
	/** How the browser that drew it was found, for the command to report. */
	browserDescription: string;
};

/**
 * The background the drawing is laid on, resolved into the document itself.
 *
 * `background` is a field of the document and the canvas already honours it for
 * both display and export, so writing it there is the whole mechanism — there is
 * no separate export knob to reach for. The white default is deliberate: a
 * document that names no background follows the viewer's theme on screen, which
 * a file being handed to someone else cannot do.
 */
const applyBackground = (
	doc: CanvasDoc,
	background: string | null,
): { doc: CanvasDoc; transparent: boolean } => {
	if (background === "transparent") {
		return { doc, transparent: true };
	}
	if (background !== null) {
		return { doc: { ...doc, background }, transparent: false };
	}
	return {
		doc: doc.background === undefined ? { ...doc, background: "#ffffff" } : doc,
		transparent: false,
	};
};

/**
 * Draws a document in a real browser and gives back the image.
 *
 * The page it drives carries the same Canvas and the same eight shape plugins the
 * editor does, so the drawing is not a reimplementation of the rendering — it is
 * the rendering. What crosses the boundary is a document in and an image out.
 *
 * playwright-core is imported here rather than at the top of the program, so
 * `validate`, `diagnose` and `measure` never load a browser driver they have no
 * use for.
 *
 * @param doc - The document to draw, already parsed and validated
 * @param options - Format, region, scale, background and the browser to use
 * @returns The encoded image, its pixel size when it has one, and what drew it
 * @throws When no Chromium can be launched, or the page fails to produce an image
 */
export const renderDoc = async (
	doc: CanvasDoc,
	options: RenderOptions,
): Promise<RenderedImage> => {
	const { chromium } = await import("playwright-core");
	const serveAsset = createHarnessAssetHandler();
	const { browser, description } = await launchBrowser(
		chromium,
		options.browser,
	);

	try {
		const context = await browser.newContext({
			viewport: { width: 1280, height: 800 },
			deviceScaleFactor: 1,
			// The rasterizer works in logical px and the scale is applied to the
			// canvas itself, so the device pixel ratio must not scale anything twice.
		});
		const page = await context.newPage();

		await page.route(`${HARNESS_ORIGIN}/**`, async (route) => {
			const asset = serveAsset(new URL(route.request().url()).pathname);
			if (asset === null) {
				await route.fulfill({ status: 404, body: "" });
				return;
			}
			await route.fulfill({
				status: 200,
				contentType: asset.contentType,
				body: asset.body,
			});
		});

		const pageErrors: string[] = [];
		page.on("pageerror", (error) => {
			pageErrors.push(error.message);
		});

		await page.goto(`${HARNESS_ORIGIN}/index.html`, { waitUntil: "load" });
		await page.waitForFunction((global) => global in window, HARNESS_GLOBAL, {
			timeout: 30_000,
		});

		const { doc: docToDraw, transparent } = applyBackground(
			doc,
			options.background,
		);
		const request: HarnessRenderRequest = {
			doc: docToDraw,
			format: options.format,
			region: options.region === "content" ? "content" : "viewport",
			margin: RENDER_CONTENT_MARGIN,
			scale: options.scale,
			transparentBackground: transparent,
			includeSource: true,
		};

		const result = await page.evaluate<
			HarnessRenderResult,
			[string, HarnessRenderRequest]
		>(
			([global, harnessRequest]) =>
				(
					window as unknown as Record<
						string,
						{ render(input: unknown): Promise<HarnessRenderResult> }
					>
				)[global].render(harnessRequest),
			[HARNESS_GLOBAL, request],
		);

		if (pageErrors.length > 0) {
			throw new Error(`the harness page failed: ${pageErrors.join("; ")}`);
		}

		return result.format === "svg"
			? {
					body: Buffer.from(result.svg, "utf8"),
					pixelSize: null,
					browserDescription: description,
				}
			: {
					body: Buffer.from(result.base64, "base64"),
					pixelSize: { width: result.pixelWidth, height: result.pixelHeight },
					browserDescription: description,
				};
	} finally {
		await browser.close();
	}
};
