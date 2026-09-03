import { test, expect } from "@jiscribe/canvas/testing";
import type { CanvasDriver } from "@jiscribe/canvas/testing";
import type { Page } from "@playwright/test";

/**
 * The PNG export's font embedding, on the one harness that loads the faces.
 *
 * An SVG handed to an `<img>` is parsed as an isolated document and cannot see
 * the page's stylesheets, so the rasterizer would otherwise draw with whatever
 * the host OS matches the family name to. `embedLoadedFontFaces` copies the
 * subsets the page has downloaded into that throwaway SVG — and only those, so a
 * harness without `@jiscribe/canvas/fonts.css` has nothing to embed and cannot
 * tell a working embedding from a broken one. The canvas suite's own harness is
 * that harness: its 160+ specs are written against the metrics of the fallback
 * faces, so the stylesheet is loaded here instead (e2e/harness/main.tsx).
 *
 * The pair of assertions is the point: the faces go into the copy the `<img>`
 * rasterizes and stay out of the `.svg` file the SVG export writes, which is the
 * file a user keeps and which resolves fonts against its viewer.
 */

/** Latin sample; drawn in Source Sans 3, the first family of the default sans stack. */
const ASCII_SAMPLE = "Rasterized with the shipped faces";

/** CJK sample; drawn in Noto Sans JP, which the Latin faces have no glyphs for. */
const CJK_SAMPLE = "日本語のラスタライズ";

/** Family the JP subsets are declared under, as fontsource's stylesheets name it. */
const CJK_FAMILY = "Noto Sans JP";

/** Family the Latin subsets are declared under. */
const ASCII_FAMILY = "Source Sans 3";

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "ascii",
			type: "text",
			x: 160,
			y: 160,
			fontSize: 24,
			text: ASCII_SAMPLE,
		},
		{
			id: "cjk",
			type: "text",
			x: 160,
			y: 240,
			fontSize: 24,
			text: CJK_SAMPLE,
		},
	],
});

/** The page globals the two sides share: the harness's own hook, and the recording below. */
type CaptureWindow = Window & {
	__setHarnessDoc?: (docText: string) => void;
	/** Each captured SVG as the pending read of its Blob, in the order they were handed out. */
	__capturedExportSvgs?: Promise<string>[];
};

/** Load a document into the harness canvas through the hook mountPluginHarness installs. */
const loadHarnessDoc = async (page: Page, text: string): Promise<void> => {
	await page.evaluate((json) => {
		const hook = (window as CaptureWindow).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(json);
	}, text);
};

/**
 * Number of subset files the page has downloaded for the given family. The
 * stylesheet splits each weight by unicode-range, so a family is fetched a
 * subset at a time as text needs it and stays at 0 until something drew it.
 */
const loadedSubsetCount = (page: Page, family: string): Promise<number> =>
	page.evaluate(
		(name) =>
			[...document.fonts].filter(
				(face) => face.family.includes(name) && face.status === "loaded",
			).length,
		family,
	);

/**
 * Start recording every SVG string handed to `URL.createObjectURL`. The
 * rasterizer loads its throwaway copy through a Blob URL, so this is the only
 * place that copy is observable — it is never written to a file.
 */
const captureRasterSvgs = async (page: Page): Promise<void> => {
	await page.evaluate(() => {
		const captured: Promise<string>[] = [];
		(window as CaptureWindow).__capturedExportSvgs = captured;
		const original = URL.createObjectURL.bind(URL);
		URL.createObjectURL = (blob: Blob | MediaSource): string => {
			if (blob instanceof Blob && blob.type.startsWith("image/svg+xml")) {
				captured.push(blob.text());
			}
			return original(blob);
		};
	});
};

/** Everything {@link captureRasterSvgs} has recorded so far, oldest first. */
const readCapturedSvgs = (page: Page): Promise<string[]> =>
	page.evaluate(() =>
		Promise.all((window as CaptureWindow).__capturedExportSvgs ?? []),
	);

/** Export through the context menu and dialog, and return the downloaded file's text. */
const downloadViaExportDialog = async (
	page: Page,
	canvas: CanvasDriver,
	format: "png" | "svg",
): Promise<Buffer> => {
	await canvas.openContextMenu({ x: 900, y: 700 });
	await canvas.clickContextMenuCommand("export");
	await expect(page.getByTestId("export-dialog")).toBeVisible();
	await page.getByTestId(`export-dialog:format-${format}`).check();

	const downloadPromise = page.waitForEvent("download");
	await page.getByTestId("export-dialog:submit").click();
	const stream = await (await downloadPromise).createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk as Buffer);
	}
	return Buffer.concat(chunks);
};

/**
 * Draw both samples and wait until their faces have arrived. Fonts are fetched
 * per unicode-range as text needs them, so an export run before they land would
 * find nothing loaded to embed — and would say nothing about the embedding.
 */
const drawSamplesAndLoadFonts = async (
	canvas: CanvasDriver,
	page: Page,
): Promise<void> => {
	await loadHarnessDoc(page, docText);
	await expect(canvas.objectById("cjk")).toHaveCount(1);
	await expect
		.poll(() => loadedSubsetCount(page, ASCII_FAMILY))
		.toBeGreaterThan(0);
	await expect
		.poll(() => loadedSubsetCount(page, CJK_FAMILY))
		.toBeGreaterThan(0);
};

test("embeds the loaded faces in the SVG the PNG export rasterizes", async ({
	canvas,
	page,
}) => {
	await drawSamplesAndLoadFonts(canvas, page);
	await captureRasterSvgs(page);

	await downloadViaExportDialog(page, canvas, "png");

	const captured = await readCapturedSvgs(page);
	expect(
		captured.length,
		"the rasterizer loaded an SVG through a Blob URL",
	).toBe(1);
	const rasterSvg = captured[0];

	// The bytes themselves, not a link to them: the isolated document cannot
	// fetch a relative URL of the harness's either.
	expect(rasterSvg).toContain("@font-face");
	expect(rasterSvg).toContain("data:font/woff2;base64,");
	expect(rasterSvg).not.toMatch(/src:\s*url\((?!data:)/);

	// Both scripts, since only the ranges the drawing uses are downloaded and so
	// only those can be embedded: the CJK face is the one a Latin-only embedding
	// would silently drop.
	expect(rasterSvg).toContain(`font-family:"${ASCII_FAMILY}"`);
	expect(rasterSvg).toContain(`font-family:"${CJK_FAMILY}"`);

	// `swap` would paint the fallback for the whole of the single frame the
	// rasterizer gets, which is the substitution the embedding exists to stop.
	expect(rasterSvg).toContain("font-display:block");
});

test("leaves the faces out of the SVG file the SVG export writes", async ({
	canvas,
	page,
}) => {
	await drawSamplesAndLoadFonts(canvas, page);

	const svgFile = (await downloadViaExportDialog(page, canvas, "svg")).toString(
		"utf-8",
	);

	// A viewer of this file has its own fonts, and megabytes of embedded subsets
	// would be paid for on every copy of it.
	expect(svgFile).toContain(CJK_SAMPLE);
	expect(svgFile).not.toContain("@font-face");
	expect(svgFile).not.toContain("data:font/");
});
