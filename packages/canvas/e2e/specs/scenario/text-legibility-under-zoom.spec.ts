import type * as CanvasModule from "@jiscribe/canvas";
import type { JSHandle, Page } from "@playwright/test";

import { expect, test } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Text drawn smaller than 4 CSS px on screen is not drawn (useIsTextLegible).
 *
 * - Zooming out until a text's size times the zoom drops below 4px hides its
 *   foreignObject with `display="none"`, keeping the element mounted; zooming
 *   back in shows the same element again. Shape text and connector labels alike
 * - An export taken while zoomed that far out still holds the text, and the
 *   hidden boxes are drawn for the length of the snapshot, since it clones the
 *   live DOM and reads the text back off it
 *
 * Every text here is at the default 16px, so 0.16 (2.56px) hides it and 1 shows it.
 */

const HIDDEN_ZOOM = 0.16;
const SHOWN_ZOOM = 1;

/** The global mountPluginHarness publishes the default page's handle on. */
type HarnessWindow = { __canvasHandle?: CanvasModule.CanvasHandle | null };

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

/** Zooms around the middle of the drawing, so nothing in it is culled. */
const zoomTo = async (
	handle: JSHandle<CanvasModule.CanvasHandle>,
	zoom: number,
): Promise<void> => {
	await handle.evaluate(
		(h, nextZoom) =>
			h.viewport.centerOn({ x: 600, y: 275 }, { zoom: nextZoom }),
		zoom,
	);
	await expect
		.poll(() => handle.evaluate((h) => h.viewport.getViewport().zoom))
		.toBe(zoom);
};

/**
 * The `display` attribute of the foreignObject whose text is `text`, and whether
 * it is still the element `markTextBox` tagged (null when nothing is tagged).
 */
const readTextBox = (page: Page, text: string) =>
	page.evaluate((targetText) => {
		const foreignObject = Array.from(
			document.querySelectorAll("foreignObject"),
		).find((element) => element.textContent?.trim() === targetText);
		if (!foreignObject) {
			return null;
		}
		return {
			display: foreignObject.getAttribute("display"),
			isMarked: foreignObject.dataset.legibilityMark === "marked",
		};
	}, text);

/** Tags the foreignObject drawing `text`, so a later read can tell it was not replaced. */
const markTextBox = (page: Page, text: string) =>
	page.evaluate((targetText) => {
		const foreignObject = Array.from(
			document.querySelectorAll("foreignObject"),
		).find((element) => element.textContent?.trim() === targetText);
		if (!foreignObject) {
			throw new Error(`no foreignObject draws "${targetText}"`);
		}
		foreignObject.dataset.legibilityMark = "marked";
	}, text);

/**
 * Starts recording every value the `display` attribute of the foreignObject
 * drawing `text` is changed away from, for readDisplayHistory.
 */
const recordDisplayChanges = (page: Page, text: string) =>
	page.evaluate((targetText) => {
		const foreignObject = Array.from(
			document.querySelectorAll("foreignObject"),
		).find((element) => element.textContent?.trim() === targetText);
		if (!foreignObject) {
			throw new Error(`no foreignObject draws "${targetText}"`);
		}
		const history: (string | null)[] = [];
		new MutationObserver((records) => {
			for (const record of records) {
				history.push(record.oldValue);
			}
		}).observe(foreignObject, {
			attributeFilter: ["display"],
			attributeOldValue: true,
		});
		(window as unknown as Record<string, unknown>)[
			`displayHistory:${targetText}`
		] = history;
	}, text);

/** The values recordDisplayChanges saw `display` change away from, in order. */
const readDisplayHistory = (page: Page, text: string) =>
	page.evaluate(
		(targetText) =>
			(window as unknown as Record<string, (string | null)[]>)[
				`displayHistory:${targetText}`
			],
		text,
	);

/** Two rectangles, the first holding `shapeText`, joined by a connector labelled `labelText`. */
const drawLabelledPair = async (
	canvas: CanvasDriver,
	shapeText: string,
	labelText: string,
): Promise<void> => {
	await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
	await canvas.typeTextAt({ x: 400, y: 200 }, shapeText);
	await canvas.commitText();
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
	await canvas.deselect();

	await canvas.selectAt({ x: 400, y: 200 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 715,
		y: 350,
	});
	await canvas.deselect();

	const points = (await canvas.objectById(connectorId).getAttribute("points"))!
		.trim()
		.split(/\s+/)
		.map((pair) => pair.split(",").map(Number));
	await canvas.typeTextAt(
		{
			x: (points[0][0] + points[1][0]) / 2,
			y: (points[0][1] + points[1][1]) / 2,
		},
		labelText,
	);
	await canvas.commitText();
};

test("hides text too small to read and shows the same element again on zooming in", async ({
	canvas,
}) => {
	await drawLabelledPair(canvas, "Shape text", "Label text");
	const handle = await readCanvasHandle(canvas.page);
	await zoomTo(handle, SHOWN_ZOOM);

	for (const text of ["Shape text", "Label text"]) {
		expect(await readTextBox(canvas.page, text)).toEqual({
			display: null,
			isMarked: false,
		});
		await markTextBox(canvas.page, text);
	}

	await zoomTo(handle, HIDDEN_ZOOM);
	for (const text of ["Shape text", "Label text"]) {
		await expect
			.poll(() => readTextBox(canvas.page, text), {
				message: `"${text}" is hidden, its element kept mounted`,
			})
			.toEqual({ display: "none", isMarked: true });
	}

	await zoomTo(handle, SHOWN_ZOOM);
	for (const text of ["Shape text", "Label text"]) {
		await expect
			.poll(() => readTextBox(canvas.page, text), {
				message: `"${text}" is shown again on the same element`,
			})
			.toEqual({ display: null, isMarked: true });
	}
});

test("exports the text it hides while zoomed out", async ({ canvas }) => {
	await drawLabelledPair(canvas, "Shape text", "Label text");
	const handle = await readCanvasHandle(canvas.page);
	await zoomTo(handle, HIDDEN_ZOOM);
	await expect
		.poll(async () => (await readTextBox(canvas.page, "Shape text"))?.display)
		.toBe("none");
	await recordDisplayChanges(canvas.page, "Shape text");
	await recordDisplayChanges(canvas.page, "Label text");

	const exportedText = await handle.evaluate(async (h) => {
		const svgText = await h.export.toSvgString();
		if (svgText === null) {
			return null;
		}
		const root = new DOMParser().parseFromString(
			svgText,
			"image/svg+xml",
		).documentElement;
		return Array.from(root.getElementsByTagName("text"))
			.map((element) => element.textContent ?? "")
			.join("|");
	});

	expect(exportedText).toContain("Shape text");
	expect(exportedText).toContain("Label text");
	for (const text of ["Shape text", "Label text"]) {
		// The snapshot is over, so the zoomed-out view hides the text again.
		await expect
			.poll(async () => (await readTextBox(canvas.page, text))?.display)
			.toBe("none");
		expect(
			await readDisplayHistory(canvas.page, text),
			`"${text}" was shown for the snapshot and hidden after it`,
		).toEqual(["none", null]);
	}
});
